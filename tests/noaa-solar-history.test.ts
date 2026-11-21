import assert from 'node:assert/strict';
import test from 'node:test';
import { latestSolarField, NoaaProvider, normalizeSolarHistory } from '../server/providers/NoaaProvider';
import { apiCache } from '../server/services/cache';

// Isolated synthetic cases only: no test rows are used by the live application.
const timestamp = (minute: number) => `2026-11-15T00:${String(minute).padStart(2, '0')}:00`;

test('RTSW trends use the active reported stream, UTC source times and explicit nulls without filling missing minutes', () => {
  const rows = [
    { time_tag: timestamp(12), proton_speed: 900, active: false, source: 'INACTIVE' },
    { time_tag: timestamp(10), proton_speed: 350, active: true, source: 'ACTIVE' },
    { time_tag: timestamp(1), proton_speed: null, active: true, source: 'ACTIVE' },
    { time_tag: timestamp(0), proton_speed: 340, active: true, source: 'ACTIVE' },
    { time_tag: '2026-02-30T00:02:00', proton_speed: 999, active: true },
  ];
  const history = normalizeSolarHistory(rows, 'proton_speed');
  assert.deepEqual(history, [
    { timestamp: timestamp(0) + '.000Z', value: 340 },
    { timestamp: timestamp(1) + '.000Z', value: null },
    { timestamp: timestamp(10) + '.000Z', value: 350 },
  ]);
  assert.deepEqual(latestSolarField(rows, 'proton_speed'), { timestamp: timestamp(10) + '.000Z', value: 350 });
  assert.equal(history.length, 3, 'A nine-minute gap is not filled or interpolated');
  assert.deepEqual(normalizeSolarHistory([{ time_tag: timestamp(0), proton_speed: 340, active: false }], 'proton_speed'), []);
});

test('RTSW duplicate timestamps are order independent; conflicting or missing values do not become a chosen measurement', () => {
  const rows = [
    { time_tag: timestamp(0), bz_gsm: -2 }, { time_tag: timestamp(0), bz_gsm: -2 },
    { time_tag: timestamp(1), bz_gsm: -3 }, { time_tag: timestamp(1), bz_gsm: 3 },
    { time_tag: timestamp(2), bz_gsm: 2 }, { time_tag: timestamp(2), bz_gsm: null },
    { time_tag: timestamp(3), bz_gsm: 0 },
  ];
  const history = normalizeSolarHistory(rows, 'bz_gsm');
  assert.deepEqual(history.map(point => point.value), [-2, null, null, 0]);
  assert.deepEqual(normalizeSolarHistory([...rows].reverse(), 'bz_gsm'), history);
  assert.deepEqual(latestSolarField(rows, 'bz_gsm'), { value: 0, timestamp: timestamp(3) + '.000Z' });
});

test('RTSW legacy responses retain independent valid fields; invalid speeds are null and signed Bz includes zero', () => {
  const rows = [
    { time_tag: timestamp(0), proton_speed: 400, bz_gsm: -3 },
    { time_tag: timestamp(1), proton_speed: 0, bz_gsm: 0 },
    { time_tag: timestamp(2), proton_speed: -9999, bz_gsm: null },
    { time_tag: timestamp(3), proton_speed: '410', bz_gsm: NaN },
    { time_tag: timestamp(4), proton_speed: Infinity, bz_gsm: Infinity },
  ];
  assert.deepEqual(normalizeSolarHistory(rows, 'proton_speed').map(point => point.value), [400, null, null, null, null]);
  assert.deepEqual(normalizeSolarHistory(rows, 'bz_gsm').map(point => point.value), [-3, 0, null, null, null]);
  assert.deepEqual(latestSolarField(rows, 'proton_speed'), { value: 400, timestamp: timestamp(0) + '.000Z' });
  assert.deepEqual(latestSolarField(rows, 'bz_gsm'), { value: 0, timestamp: timestamp(1) + '.000Z' });
});

async function getSolar(imfFailure = false) {
  const originalFetch = globalThis.fetch, originalGet = apiCache.get, originalSet = apiCache.set, mode = process.env.DATA_MODE;
  const requests: string[] = [];
  process.env.DATA_MODE = 'live';
  apiCache.get = () => null; apiCache.set = () => {};
  globalThis.fetch = (async input => {
    const url = String(input); requests.push(url);
    assert.ok(url.startsWith('https://services.swpc.noaa.gov/'));
    if (url.includes('_mag_') && imfFailure) return new Response(null, { status: 503 });
    const rows = url.includes('_wind_') ? [
      { time_tag: timestamp(0), proton_speed: 400, active: true },
      { time_tag: timestamp(1), proton_speed: null, active: true },
      { time_tag: timestamp(2), proton_speed: 410, active: true },
      { time_tag: timestamp(3), proton_speed: 999, active: false },
    ] : url.includes('_mag_') ? [
      { time_tag: timestamp(1), bz_gsm: -2, active: true },
      { time_tag: timestamp(2), bz_gsm: 0, active: true },
      { time_tag: timestamp(3), bz_gsm: 900, active: false },
    ] : [];
    return new Response(JSON.stringify(rows));
  }) as typeof fetch;
  try { return { result: await new NoaaProvider().getSolar(), requests }; }
  finally {
    globalThis.fetch = originalFetch; apiCache.get = originalGet; apiCache.set = originalSet;
    if (mode === undefined) delete process.env.DATA_MODE; else process.env.DATA_MODE = mode;
  }
}

test('solar read contract exposes both trends using the same six existing upstream reads and matching latest observations', async () => {
  const { result, requests } = await getSolar();
  assert.equal(result.success, true);
  assert.equal(requests.length, 6);
  assert.equal(new Set(requests).size, 6, 'No duplicate trend request');
  assert.equal(requests.filter(url => url.includes('_wind_')).length, 1);
  assert.equal(requests.filter(url => url.includes('_mag_')).length, 1);
  assert.deepEqual(result.data?.solarWindHistory?.map(point => point.value), [400, null, 410]);
  assert.deepEqual(result.data?.bzHistory?.map(point => point.value), [-2, 0]);
  assert.equal(result.data?.solarWindSpeed, result.data?.solarWindHistory?.at(-1)?.value);
  assert.equal(result.data?.solarWindSpeedTimestamp, result.data?.solarWindHistory?.at(-1)?.timestamp);
  assert.equal(result.data?.bz, result.data?.bzHistory?.at(-1)?.value);
  assert.equal(result.data?.bzTimestamp, result.data?.bzHistory?.at(-1)?.timestamp);
});

test('an unavailable magnetic source yields an empty Bz history and explicit error without discarding real wind history', async () => {
  const { result, requests } = await getSolar(true);
  assert.equal(result.success, true);
  assert.equal(requests.length, 6);
  assert.deepEqual(result.data?.bzHistory, []);
  assert.equal(result.data?.bz, null);
  assert.equal(result.data?.bzTimestamp, null);
  assert.equal(result.data?.productErrors?.imf, 'http_error:503');
  assert.equal(result.data?.productMetadata?.bz?.state, 'unavailable');
  assert.deepEqual(result.data?.solarWindHistory?.map(point => point.value), [400, null, 410]);
});
