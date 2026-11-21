import { createHash, randomUUID } from 'node:crypto';
import { open, readFile, rename, rm, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { probe } from './sondagem.mjs';
import { assessSources } from './fontes.mjs';
import { assessObservationProgress, assessSchedule, assessSite, updateState } from './estado.mjs';
import { resolvePolicy } from './politica.mjs';

const officialOrigin = 'https://ressonanciaschumann.com';
const scientificRoutes = ['solar', 'geomagnetic', 'current', 'tomskImage', 'bgs', 'history'];

const signalFields = {
  condition: 'code', reason: 'code', lastCountedAt: 'time', lastValidAt: 'time', lastObservedAt: 'time',
  lastObservedDate: 'date', lastDigest: 'digest', lastDigestChangeAt: 'time', consecutiveFailures: 'count',
  consecutiveRecoveries: 'count', incidentSince: 'time', incidentCondition: 'code',
};
const isObject = value => value && typeof value === 'object' && !Array.isArray(value);
function isInstant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 19) === value.slice(0, 19);
}
const isCode = value => typeof value === 'string' && /^[a-z0-9_]+(?::[1-5]\d\d)?$/.test(value) && value.length <= 64;

function validateCheckpoint(previous, origin, scope, policyId, startedAt) {
  if (previous === null) return null;
  const { version, checkedAt, state } = previous;
  if (version !== 1 || previous.origin !== origin || previous.scope !== scope || previous.policyId !== policyId ||
      !isInstant(checkedAt) || Date.parse(checkedAt) > Date.parse(startedAt) ||
      state?.version !== 1 || !isObject(state.signals)) throw new TypeError('Checkpoint origin, scope, policy or timestamp is invalid');

  function matches(type, value) {
    switch (type) {
      case 'time': return isInstant(value) && Date.parse(value) <= Date.parse(checkedAt);
      case 'date': return typeof value === 'string' && isInstant(value + 'T00:00:00Z') && value <= checkedAt.slice(0, 10);
      case 'digest': return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
      case 'count': return Number.isSafeInteger(value) && value >= 0;
      case 'code': return isCode(value);
      default: return false;
    }
  }
  for (const [id, signal] of Object.entries(state.signals)) {
    if (!/^[a-z][a-z0-9.-]{1,80}$/.test(id) || !isObject(signal) || !isCode(signal.condition) ||
        !matches('time', signal.lastCountedAt) || !matches('count', signal.consecutiveFailures) ||
        !matches('count', signal.consecutiveRecoveries) || Object.entries(signal).some(([key, value]) =>
          !Object.hasOwn(signalFields, key) || (value !== null && !matches(signalFields[key], value)))) {
      throw new TypeError('Invalid checkpoint signal');
    }
  }
  return state;
}

export async function runOnce({ origin, scope = 'all', inspectHealth = false, previous = null, scheduledRuns, readSchedule, policy, collect = probe }) {
  if (!['all','site'].includes(scope)) throw new TypeError('Invalid scope');
  if (readSchedule && (scope !== 'all' || origin !== officialOrigin || scheduledRuns !== undefined)) {
    throw new TypeError('Online collector inspection requires the official origin and all scope');
  }
  const activePolicy = resolvePolicy(policy);
  const inspections = { health: inspectHealth, collector: readSchedule ? 'public' :
    scope === 'all' && scheduledRuns !== undefined ? 'offline' : 'inactive' };
  const policyId = createHash('sha256').update(JSON.stringify({ activePolicy, inspections })).digest('hex');
  const startedAt = new Date().toISOString();
  const previousState = validateCheckpoint(previous, origin, scope, policyId, startedAt);
  const readings = {};
  const responseMetadata = {};
  async function read(key) {
    const value = await collect(origin, key);
    const completedAt = new Date().toISOString();
    readings[key] = { ...value, completedAt };
    responseMetadata[key] = { completedAt, status: value.status, elapsedMs: value.elapsedMs, error: value.error,
      appError: value.status >= 400 && isCode(value.data?.error) ? value.data.error : null };
  }

  await read('home');
  await read('config');
  if (inspectHealth) await read('health');
  const applicationHealthy = readings.home.status === 200 && !readings.home.error &&
    readings.home.data?.expectedPage === true && readings.home.data?.coldStart === false &&
    readings.config.status === 200 && !readings.config.error && readings.config.data?.mode === 'live';
  if (scope === 'all' && applicationHealthy) {
    // Sequential, bounded reads deliberate: avoid competing with visitors and source decoders.
    for (const key of scientificRoutes) await read(key);
  }
  if (readSchedule) scheduledRuns = await readSchedule();
  const checkedAt = new Date().toISOString();
  const checks = assessSite(readings, checkedAt, { requireHealth: inspectHealth, policy: activePolicy });
  if (scope === 'all') {
    if (applicationHealthy) checks.push(...assessSources(readings, checkedAt, activePolicy));
    checks.push(assessObservationProgress({}, checkedAt, activePolicy));
    if (scheduledRuns !== undefined) checks.push(assessSchedule(scheduledRuns, checkedAt, { delayMs: activePolicy.collectorDelayMs }));
  }
  const { state, events } = updateState(previousState, checks, checkedAt, activePolicy);
  return { version: 1, origin, scope, policyId, policy: activePolicy, inspections, startedAt, checkedAt, checks,
    responses: responseMetadata, state, events };
}

async function readJson(path) {
  const input = await stat(path);
  if (!input.isFile() || input.size > 512 * 1024) throw new Error('Local input must be a file of at most 512 KiB');
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function writeReport(path, contents) {
  const temporary = join(dirname(path), '.' + basename(path) + '.' + randomUUID());
  const file = await open(temporary, 'wx', 0o600);
  try {
    try { await file.writeFile(contents, 'utf8'); }
    finally { await file.close(); }
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

async function main(args) {
  let origin = null;
  let scope = 'all';
  let inspectHealth = false;
  let previous = null;
  let scheduledRuns;
  let policy;
  let output;
  let inspectCollector = false;
  for (const arg of args) {
    if (arg === '--public' || arg.startsWith('--loopback=')) {
      if (origin) throw new Error('Choose only one origin');
      if (arg === '--public') origin = officialOrigin;
      else {
        const target = new URL(arg.slice('--loopback='.length));
        if (target.protocol !== 'http:' || !['127.0.0.1','[::1]','localhost'].includes(target.hostname) ||
            target.username || target.password || target.search || target.hash || target.pathname !== '/') {
          throw new Error('Loopback mode requires a loopback HTTP origin');
        }
        origin = target.origin;
      }
    } else if (arg.startsWith('--scope=')) scope = arg.slice('--scope='.length);
    else if (arg === '--inspect-health') inspectHealth = true;
    else if (arg === '--inspect-collector') inspectCollector = true;
    else if (arg.startsWith('--previous=')) {
      const report = await readJson(arg.slice('--previous='.length));
      if (!report?.state || report.version !== 1) throw new Error('Invalid previous report');
      previous = report;
    } else if (arg.startsWith('--collector=')) scheduledRuns = await readJson(arg.slice('--collector='.length));
    else if (arg.startsWith('--policy=')) policy = resolvePolicy(await readJson(arg.slice('--policy='.length)));
    else if (arg.startsWith('--output=')) output = arg.slice('--output='.length);
    else throw new Error('Unknown option');
  }
  if (!origin) throw new Error('Specify --public or --loopback=http://127.0.0.1:PORT');
  if (!['all','site'].includes(scope) || (scope === 'site' && (inspectCollector || scheduledRuns !== undefined))) {
    throw new Error('Collector inspection requires the all scope');
  }
  let readSchedule;
  if (inspectCollector) {
    if (origin !== officialOrigin || scheduledRuns !== undefined) {
      throw new Error('Choose --public with --inspect-collector, or supply an offline list with --collector');
    }
    const { fetchCollectorRuns } = await import('./coletor.mjs');
    readSchedule = fetchCollectorRuns;
  }
  const report = await runOnce({ origin, scope, inspectHealth, previous, scheduledRuns, readSchedule, policy });
  const contents = JSON.stringify(report, null, 2) + '\n';
  if (output !== undefined) await writeReport(output, contents);
  process.stdout.write(contents);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch(error => {
    process.stderr.write('Operational check failed: ' + error.message + '\n');
    process.exitCode = 1;
  });
}
