import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchNoaaRows, NoaaProvider, normalizeKp, normalizeXrays } from '../server/providers/NoaaProvider';
import { prepareXRayHistory, xrayDomain } from '../src/utils/xrayData';
import { apiCache } from '../server/services/cache';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { XRayChart } from '../src/components/XRayChart';

const point = (time: string, flux: any) => ({ time_tag: time, energy: '0.1-0.8nm', satellite: 18, flux });

test('GOES positive flux is sorted, invalid log inputs remain gaps, latest current is valid', () => {
  const rows = [point('2026-11-05T00:05:00Z', 0), point('2026-11-05T00:02:00Z', 2e-6),
    point('2026-11-05T00:03:00Z', -9999), point('invalid', 1e-6),
    point('2026-11-05T00:01:00Z', 1e-6), point('2026-11-05T00:04:00Z', null),
    { ...point('2026-11-05T00:00:00Z', 2e-8), energy: '0.05-0.4nm' }];
  const result = normalizeXrays(rows);
  assert.deepEqual(result.history.map(row => row.flux), [1e-6, 2e-6, null, null, null]);
  assert.equal(result.current?.timestamp, '2026-11-05T00:02:00.000Z');
  assert.equal(result.current?.flux, 2e-6);
  assert.equal(result.current?.flareClass, 'C2.0');
  assert.ok(xrayDomain(result.history).every(value => value > 0));
});

test('missing minutes break the line without numerical interpolation and normalization is idempotent', () => {
  const data = [point('2026-11-05T00:00:00Z', 1e-6), point('2026-11-05T00:10:00Z', 2e-6)];
  const history = prepareXRayHistory(data);
  assert.equal(history.length, 3);
  assert.equal(history[1].flux, null);
  assert.deepEqual(prepareXRayHistory(history), history);
  assert.equal(normalizeXrays([point('2026-11-05T00:00:00Z', null)]).current, null);
});

test('a lone positive sample is retained and invalid-only history has an explicit empty chart state', () => {
  const singleton = prepareXRayHistory([point('2026-11-05T00:00:00Z', 1e-6)]);
  assert.equal(singleton.length, 1);
  assert.equal(singleton[0].flux, 1e-6);
  const html = renderToStaticMarkup(createElement(XRayChart, { data: [point('2026-11-05T00:00:00Z', 0), point('2026-11-05T00:01:00Z', NaN)] }));
  assert.match(html, /Nenhum fluxo de raios X positivo e válido/);
  assert.doesNotMatch(html, /NaN|recharts-line-curve/);
});

test('electron-contamination context does not discard corrected positive flux blindly', () => {
  const normalized = normalizeXrays([{ ...point('2026-11-05T00:00:00Z', 1e-7), electron_contaminaton: true }]);
  assert.equal(normalized.current?.flux, 1e-7);
  assert.equal(normalized.history[0].electronContaminated, true);
});

test('NOAA fetch distinguishes timeout, transport, HTTP, parser and schema failures', async () => {
  for (const [factory, code] of [
    [() => { throw new TypeError('network failure'); }, 'transport_error'],
    [() => new Response('bad gateway', { status: 503 }), 'http_error:503'],
    [() => new Response('not json'), 'invalid_json'],
    [() => new Response('{}'), 'invalid_schema'],
    [() => new Promise(() => {}), 'timeout'],
  ] as const) {
    await assert.rejects(fetchNoaaRows('https://services.swpc.noaa.gov/test', factory as any, 20), { code });
  }
});

test('real Kp object contract accepts numeric values including zero, validates and orders UTC', () => {
  const history = normalizeKp([{ time_tag: '2026-11-05T03:00:00', Kp: 2.33 }, { time_tag: '2026-11-05T00:00:00', Kp: 0 },
    { time_tag: '2026-11-05T06:00:00', Kp: '3.67' }, { time_tag: '2026-11-05T09:00:00', Kp: '2invalid' }, { time_tag: 'bad', Kp: 5 }]);
  assert.deepEqual(history.map(point => point.kp), [0, 2.33, 3.67]);
  assert.equal(history[0].time_tag, '2026-11-05T00:00:00.000Z');
});

test('F10.7 failure does not discard valid GOES, wind or IMF products', async () => {
  const previousMode = process.env.DATA_MODE;
  const originalFetch = globalThis.fetch, originalSet = apiCache.set;
  process.env.DATA_MODE = 'live'; apiCache.set = () => {};
  globalThis.fetch = async (input) => {
    const url = String(input);
    assert.ok(url.startsWith('https://services.swpc.noaa.gov/'), 'Only fixed NOAA product URLs are permitted');
    if (url.includes('f107')) return new Response('unavailable', { status: 503 });
    const rows = url.includes('xrays') ? [point('2026-11-05T00:00:00Z', 1e-6)] : url.includes('wind') ? [{ time_tag: '2026-11-05T00:01:00Z', proton_speed: 400, proton_density: 5 }]
      : url.includes('_mag') ? [{ time_tag: '2026-11-05T00:02:00Z', bz_gsm: -3, bt: 5 }] : [];
    return new Response(JSON.stringify(rows));
  };
  try {
    const result = await new NoaaProvider().getSolar();
    assert.equal(result.success, true);
    assert.equal(result.data?.solarFlux, null);
    assert.equal(result.data?.solarFluxTimestamp, null);
    assert.equal(result.data?.productErrors?.f107, 'http_error:503');
    assert.equal(result.data?.currentXRay?.flux, 1e-6);
    assert.equal(result.data?.solarWindSpeed, 400);
    assert.equal(result.data?.bz, -3);
    assert.equal(result.timestamp, '2026-11-05T00:02:00.000Z');
  } finally {
    globalThis.fetch = originalFetch; apiCache.set = originalSet;
    if (previousMode === undefined) delete process.env.DATA_MODE; else process.env.DATA_MODE = previousMode;
  }
});
