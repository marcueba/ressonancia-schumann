import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assessObservationProgress, assessSchedule, assessSite, updateState, MINUTE } from './estado.mjs';
import { sendHealth } from '../../server/services/healthz.mjs';
import { probe } from './sondagem.mjs';
import { runOnce, writeReport } from './monitor.mjs';
import { resolvePolicy } from './politica.mjs';

const base = Date.parse('2026-11-21T12:00:00.000Z');
const at = minutes => new Date(base + minutes * MINUTE).toISOString();
const home = { status: 200, elapsedMs: 90, error: null, data: { expectedPage: true, coldStart: false } };
const config = { status: 200, elapsedMs: 60, error: null, data: { mode: 'live' } };
const down = { status: 503, elapsedMs: 20, error: 'http_error' };
const timeout = { status: null, elapsedMs: 12_000, error: 'timeout' };
const applySite = (prior, checkTime, probes) => updateState(prior, assessSite(probes, checkTime), checkTime);

test('healthy website and app are separate from an inactive health path', () => {
  const list = assessSite({ home, config, health: { status: 404, error: 'http_error' } }, at(0));
  assert.deepEqual(list.map(x => [x.id, x.condition]), [
    ['site.http', 'ok'], ['site.probe', 'ok'], ['site.backend', 'ok'],
    ['site.healthz', 'inactive'], ['site.latency', 'ok'],
  ]);
  assert.deepEqual(updateState(null, list, at(0)).events, []);
});

test('transient public HTTP 503 does not generate an alert', () => {
  const first = applySite(null, at(0), { home: down, config });
  assert.equal(first.state.signals['site.http'].consecutiveFailures, 1);
  const next = applySite(first.state, at(5), { home, config });
  assert.equal(next.state.signals['site.http'].consecutiveFailures, 0);
  assert.deepEqual([...first.events, ...next.events], []);
});

test('persistent site failure opens once on the third distinct check and closes after two recoveries', () => {
  let state = null;
  const events = [];
  for (const [minute, target] of [[0,down],[5,down],[10,down],[15,down],[20,home],[25,home]]) {
    const update = applySite(state, at(minute), { home: target, config });
    state = update.state;
    events.push(...update.events);
  }
  assert.deepEqual(events.map(e => [e.type, e.id, e.at]), [
    ['opened', 'site.http', at(10)], ['recovered', 'site.http', at(25)],
  ]);
});

test('transport failure and rate limiting do not become a site-down alert', () => {
  let state = null;
  const events = [];
  for (const [minute, response] of [[0,timeout],[5,timeout],[10,{ status: 429, error: 'http_error' }]]) {
    const update = applySite(state, at(minute), { home: response, config: timeout });
    state = update.state;
    events.push(...update.events);
  }
  assert.equal(state.signals['site.http'].consecutiveFailures, 0);
  assert.equal(state.signals['site.http'].condition, 'inconclusive');
  assert.deepEqual(events.map(e => [e.type, e.id]), [['opened', 'site.probe']]);
});

test('persistent backend 500 is distinct from a returning site and source health', () => {
  let state = null;
  for (const minute of [0,5,10]) {
    const update = applySite(state, at(minute), { home, config: { ...down, status: 500 } });
    state = update.state;
    if (minute === 10) assert.deepEqual(update.events.map(e => e.id), ['site.backend']);
  }
  assert.equal(state.signals['site.http'].condition, 'ok');
});

test('latency escalates only after five successful slow samples', () => {
  let state = null;
  for (const minute of [0,5,10,15,20]) {
    const update = applySite(state, at(minute), { home: { ...home, elapsedMs: 2100 }, config });
    state = update.state;
    assert.deepEqual(update.events.map(e => e.id), minute === 20 ? ['site.latency'] : []);
  }
});

test('duplicate, fast and old samples do not count, and an observation gap breaks the streak', () => {
  let { state } = applySite(null, at(0), { home: down, config });
  for (const minute of [0,-5,1,5,25]) ({ state } = applySite(state, at(minute), { home: down, config }));
  assert.equal(state.signals['site.http'].consecutiveFailures, 1);
  assert.equal(state.signals['site.http'].lastCountedAt, at(25));
});

test('loss of an observation clock does not resolve an open freshness incident', () => {
  let state = null;
  const signal = (minute, condition) => ({
    id: 'noaa-kp', checkedAt: at(minute), condition, reason: 'fixture',
    alertable: condition === 'stale', observedAt: condition === 'observation_unknown' ? null : at(minute-60),
  });
  const events = [];
  for (const [minute, condition] of [[0,'stale'],[60,'stale'],[120,'stale'],[180,'observation_unknown'],[240,'observation_unknown'],[300,'ok'],[360,'ok']]) {
    const update = updateState(state, [signal(minute, condition)], at(minute));
    state = update.state;
    events.push(...update.events);
  }
  assert.deepEqual(events.map(e => [e.type,e.at]), [['opened',at(120)],['recovered',at(360)]]);
});

test('absence of new eligible observations is assessed only when a verified observing contract is active', () => {
  const current = assessObservationProgress({ expectedSince: at(0) }, at(49*60));
  assert.equal(current.condition, 'blocked');
  assert.equal(current.alertable, false);
  const future = { authorized: true, expectedSince: at(0), lastVerifiedAt: at(60) };
  assert.equal(assessObservationProgress(future, at(48*60)).condition, 'ok');
  let state = null;
  for (const n of [50,51,52]) {
    const sample = at(n*60);
    const result = updateState(state, [assessObservationProgress(future, sample)], sample);
    state = result.state;
    assert.equal(result.events.length, n === 52 ? 1 : 0);
  }
  assert.equal(assessObservationProgress({ ...future, lastVerifiedAt: '2026-11-21' }, at(49*60)).condition, 'observation_unknown');
});

test('scheduler watchdog looks at a completed scheduled run, not manual or in-flight runs', () => {
  const row = { databaseId: 1, event: 'schedule', status: 'completed', createdAt: at(0), updatedAt: at(2), conclusion: 'success' };
  assert.equal(assessSchedule([row], at(60)).condition, 'ok');
  assert.equal(assessSchedule([{ ...row, conclusion: 'failure' }], at(60)).reason, 'scheduled_run_failed');
  const now = at(143);
  const manual = { ...row, event: 'workflow_dispatch', createdAt: at(138), updatedAt: at(140) };
  const pending = { ...row, status: 'in_progress', createdAt: at(140), updatedAt: at(141) };
  assert.equal(assessSchedule([row,manual,pending], now).reason, 'no_recent_completion');
  assert.equal(assessSchedule(null, now).condition, 'probe_error');
  assert.equal(assessSchedule(null, now).alertable, false);
  assert.equal(assessSchedule([{}], now).condition, 'probe_error');
  assert.equal(assessSchedule([{}], now).alertable, false);
  assert.equal(assessSchedule([], now).condition, 'scheduler_error');
});

test('the scheduler watchdog and scientific silence have independent clocks', () => {
  const checkedAt = at(49*60);
  const last = { event: 'schedule', status: 'completed', conclusion: 'success', createdAt: at(48*60), updatedAt: at(48*60+2) };
  const current = assessObservationProgress({}, checkedAt);
  assert.equal(assessSchedule([last], checkedAt).condition, 'ok');
  assert.equal(current.condition, 'blocked');
});

test('local HTTP handler reports only status and never caches health', async (t) => {
  const server = http.createServer((req,res) => {
    if (!sendHealth(req,res)) res.writeHead(404).end();
  });
  await new Promise((resolve, reject) => { server.once('error',reject); server.listen(0,'127.0.0.1',resolve); });
  t.after(() => new Promise(resolve => server.close(resolve)));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const status = await probe(origin, 'health');
  assert.equal(status.status, 200);
  assert.deepEqual(status.data, { status: 'ok' });
  const head = await fetch(origin + '/healthz', {method:'HEAD'});
  assert.equal(head.headers.get('cache-control'), 'no-store');
  assert.equal(await head.text(), '');
  const wrong = await fetch(origin + '/healthz', {method:'POST'});
  assert.equal(wrong.status,404);
});

test('monitor reads only app signals when site is unavailable, with no source requests', async () => {
  const calls = [];
  const report = await runOnce({ origin: 'http://localhost:9999', collect: async (_origin, key) => {
    calls.push(key);
    return key === 'home' ? down : config;
  } });
  assert.deepEqual(calls, ['home','config']);
  assert.ok(report.checks.some(s => s.id === 'elf.observations' && s.condition === 'blocked'));
  assert.deepEqual(report.events, []);
});


test('a storage incident recovers when historical reads return even though the scientific write path remains blocked', () => {
  let state = null;
  const events = [];
  for (const minute of [0,60,120,180,240]) {
    const bad = minute <= 120;
    const sample = at(minute);
    const result = updateState(state, [{
      id: 'elf-history', checkedAt: sample, condition: bad ? 'source_unavailable' : 'blocked',
      alertable: bad, lastValidReceivedAt: bad ? null : sample,
    }], sample);
    state = result.state;
    events.push(...result.events);
  }
  assert.deepEqual(events.map(e => [e.type,e.at]), [['opened',at(120)],['recovered',at(240)]]);
});

test('an older reinstated observation leaves the verified watermark intact', () => {
  const initial = { id: 'noaa-kp', checkedAt: at(0), condition: 'ok', observedAt: at(-60),
    lastValidReceivedAt: at(0), alertable: false };
  const { state } = updateState(null, [initial], at(0));
  const second = updateState(state,[{ ...initial, checkedAt:at(60),observedAt:at(-120),lastValidReceivedAt:at(60) }],at(60));
  assert.equal(second.state.signals['noaa-kp'].lastObservedAt, at(-60));
  assert.equal(second.state.signals['noaa-kp'].lastValidAt, at(60));
});

test('an old scheduled rerun cannot hide missing dispatches or newer failures', () => {
  const old = { databaseId: 1, event: 'schedule', status: 'completed', createdAt: at(-100), updatedAt: at(55), conclusion: 'success' };
  assert.equal(assessSchedule([old], at(60)).reason, 'no_recent_scheduled_dispatch');
  const queued = { ...old, databaseId: 2, createdAt: at(45), updatedAt: at(46), status:'queued', conclusion:null };
  assert.equal(assessSchedule([old,queued], at(60)).reason, 'no_recent_completed_dispatch');
  const recent = { ...old, databaseId: 2, createdAt: at(20), updatedAt: at(25), conclusion: 'failure' };
  const observation = assessSchedule([old,recent], at(60));
  assert.equal(observation.lastRunId, 2);
  assert.equal(observation.reason, 'scheduled_run_failed');
  assert.equal(observation.lastScheduledAt, at(20));
  assert.equal(observation.dispatchGapMs, 120 * MINUTE);
  assert.equal(assessSchedule([recent], at(60), { delayMs: 20 * MINUTE }).reason, 'no_recent_completion');
});

test('receiving a valid historical Tomsk payload recovers an availability incident', () => {
  let state = null;
  const events = [];
  for (const minute of [0,60,120,180,240]) {
    const good = minute > 120;
    const sample = at(minute);
    const result = updateState(state, [{
      id:'tomsk-numeric', checkedAt:sample, condition:good ? 'stale' : 'source_unavailable',
      alertable:!good, lastValidReceivedAt:good ? sample : null,
    }], sample);
    state = result.state;
    events.push(...result.events);
  }
  assert.deepEqual(events.map(x => [x.type,x.at]), [['opened',at(120)],['recovered',at(240)]]);
});

test('consecutive counters remain valid JSON integers even when restored at the upper bound', () => {
  const first = applySite(null, at(0), { home:down, config });
  first.state.signals['site.http'].consecutiveFailures = Number.MAX_SAFE_INTEGER;
  const second = applySite(first.state, at(5), { home:down, config });
  assert.equal(second.state.signals['site.http'].consecutiveFailures, Number.MAX_SAFE_INTEGER);
});

test('policy rejects unknown inputs and customizes trigger, recovery and latency limits', () => {
  for (const invalid of [null, { unknown: 1 }, { failureSamples: '1' }, { recoverySamples: 0 }]) {
    assert.throws(() => resolvePolicy(invalid), /Invalid monitoring policy/);
  }
  const policy = resolvePolicy({ siteCadenceMs: MINUTE, failureSamples: 1, recoverySamples: 1, siteLatencyMs: 50 });
  const first = updateState(null, assessSite({ home: down, config }, at(0), { policy }), at(0), policy);
  assert.deepEqual(first.events.map(x => [x.type, x.id]), [['opened','site.http']]);
  const second = updateState(first.state, assessSite({ home, config }, at(1), { policy }), at(1), policy);
  assert.deepEqual(second.events.map(x => [x.type, x.id]), [['recovered','site.http']]);
  assert.equal(second.state.signals['site.latency'].condition, 'slow');
});

test('explicit health inspection stays independent and site scope skips all scientific routes', async () => {
  const calls = [];
  const report = await runOnce({ origin: 'http://127.0.0.1:9999', scope: 'site', inspectHealth: true,
    collect: async (_origin, key) => {
      calls.push(key);
      return key === 'health' ? { status: 200, data: { status: 'ok' } } : key === 'home' ? down : config;
    } });
  assert.deepEqual(calls, ['home','config','health']);
  assert.equal(report.state.signals['site.healthz'].condition, 'ok');
  assert.equal(report.state.signals['site.http'].condition, 'site_unavailable');
  const checks = assessSite({ home, config, health: { ...down, status:404 } }, at(0), { requireHealth:true });
  assert.equal(checks.find(check => check.id === 'site.healthz').alertable, true);
});

test('source receipt is saved per response and a checkpoint retains its hash without raw data', async () => {
  const digest = 'a'.repeat(64);
  const origin = 'http://127.0.0.1:9999';
  const collect = async (_origin, key) => {
    if (key === 'home') return home;
    if (key === 'config') return config;
    if (key === 'tomskImage') return { status: 200, contentType:'image/jpeg', digest, data: { internal:'do-not-persist' } };
    return timeout;
  };
  const report = await runOnce({ origin, collect });
  const signal = report.state.signals['tomsk-jpeg'];
  assert.equal(signal.lastDigest, digest);
  assert.equal(signal.lastValidAt, report.responses.tomskImage.completedAt);
  assert.equal(signal.lastObservedAt, null);
  assert.equal(JSON.stringify(report).includes('do-not-persist'), false);
  const same = await runOnce({ origin, collect, previous: JSON.parse(JSON.stringify(report)) });
  assert.deepEqual(same.state, report.state);
  await assert.rejects(runOnce({ origin, collect, previous: report, scope: 'site' }), /Checkpoint/);
  await assert.rejects(runOnce({ origin, collect, previous: report, policy: { failureSamples: 2 } }), /Checkpoint/);
  await assert.rejects(runOnce({ origin, collect, previous: report, inspectHealth: true }), /Checkpoint/);
  await assert.rejects(runOnce({ origin:'http://localhost:9999', collect, previous: report }), /Checkpoint/);
  const forged = structuredClone(report);
  forged.state.signals['tomsk-jpeg'].lastCountedAt = '2099-11-21T00:00:00Z';
  await assert.rejects(runOnce({ origin, collect, previous: forged }), /Invalid checkpoint signal/);
});

test('report replacement leaves only a complete checkpoint file', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'schumann-checkpoint-'));
  t.after(() => rm(directory, { recursive:true, force:true }));
  const output = join(directory, 'state.json');
  await writeReport(output, '{"revision":1}\n');
  await writeReport(output, '{"revision":2}\n');
  assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), { revision:2 });
  assert.deepEqual(await readdir(directory), ['state.json']);
});
