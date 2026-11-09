import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchNoaaRows, latestSolarField, NoaaProvider, normalizeCataloguedFlares, normalizeF107, normalizeSolarRegions } from '../server/providers/NoaaProvider';
import { apiCache } from '../server/services/cache';

// Every value below is an isolated synthetic test case, never a runtime source.
const time = (minute: number) => `2026-11-08T00:${String(minute).padStart(2, '0')}:00`;
const region = (id: number, spots: unknown, date = '2026-11-08') => ({ observed_date: date, region: id, number_spots: spots });
const event = (overrides: Record<string, unknown> = {}) => ({ type: 'XRA', bin: 1234, begin_datetime: '2026-11-08T23:24:00', max_datetime: '2026-11-08T23:38:00', end_datetime: '2026-11-09T00:03:00', particulars1: 'C1.3', status_text: '+', ...overrides });
const baselineProducts = () => ({
  f107: [{ time_tag: '2026-11-08T20:00:00', flux: 128, frequency: 2800, reporting_schedule: 'Noon' }],
  regions: [region(1001, 2)], flares: [],
  wind: [{ time_tag: time(1), proton_speed: 400, proton_density: 5 }],
  imf: [{ time_tag: time(2), bz_gsm: -3, bt: 5 }],
  xray: [{ time_tag: time(3), flux: 1e-6, energy: '0.1-0.8nm', satellite: 19 }],
});
async function solar(products: ReturnType<typeof baselineProducts> | Record<string, unknown>, failures: Record<string, number> = {}) {
  const originalFetch = globalThis.fetch, originalGet = apiCache.get, originalSet = apiCache.set, mode = process.env.DATA_MODE;
  const requests: string[] = [];
  process.env.DATA_MODE = 'live'; apiCache.get = () => null; apiCache.set = () => {};
  globalThis.fetch = (async input => {
    const url = String(input); requests.push(url);
    assert.ok(url.startsWith('https://services.swpc.noaa.gov/'));
    const name = url.includes('f107') ? 'f107' : url.includes('solar_regions') ? 'regions' : url.includes('edited_events') ? 'flares' : url.includes('_wind_') ? 'wind' : url.includes('_mag_') ? 'imf' : url.includes('xrays-') ? 'xray' : 'unexpected';
    assert.notEqual(name, 'unexpected', 'No fallback, text parser, forecast or new upstream should run silently');
    return failures[name] ? new Response(null, { status: failures[name] }) : new Response(JSON.stringify(products[name]));
  }) as typeof fetch;
  try { return { result: await new NoaaProvider().getSolar(), requests }; }
  finally { globalThis.fetch = originalFetch; apiCache.get = originalGet; apiCache.set = originalSet; if (mode === undefined) delete process.env.DATA_MODE; else process.env.DATA_MODE = mode; }
}

test('F10.7 preserves the working primary, orders valid source times and distinguishes the reporting schedule', () => {
  const data = normalizeF107([
    { time_tag: '2026-11-08T22:00:00', flux: 126, frequency: 2800, reporting_schedule: 'Afternoon' },
    { time_tag: '2026-11-08T20:00:00', flux: 128, frequency: 2800, reporting_schedule: 'Noon' },
    { time_tag: '2026-02-30T23:00:00', flux: 500 },
    { time_tag: '2026-11-08T23:00:00', flux: -9999 },
  ]);
  assert.equal(data.value, 126);
  assert.equal(data.timestamp, '2026-11-08T22:00:00.000Z');
  assert.equal(data.metadata.sourceUrl, 'https://services.swpc.noaa.gov/json/f107_cm_flux.json');
  assert.equal(data.metadata.reportingSchedule, 'Afternoon');
  assert.equal(data.metadata.kind, undefined, 'Do not invent observed-versus-adjusted JSON semantics');
  assert.match(data.metadata.note!, /não identifica/);
});

test('F10.7 validates numeric syntax, timestamps, frequency and missing/sentinel values without creating zero', () => {
  for (const flux of [null, '', ' ', '126oops', NaN, Infinity, -9999, 0, 'NaN']) {
    const normalized = normalizeF107([{ time_tag: time(1), flux }]);
    assert.equal(normalized.value, null, String(flux));
    assert.equal(normalized.metadata.state, 'unavailable');
  }
  assert.equal(normalizeF107([{ time_tag: time(1), flux: '1.28e2', frequency: 2800 }]).value, 128);
  assert.equal(normalizeF107([{ time_tag: time(1), flux: 128, frequency: 1400 }]).value, null);
  assert.equal(normalizeF107([{ time_tag: '2026-11-08', flux: 128 }]).timestamp, null);
  assert.equal(normalizeF107([]).metadata.error, 'no_valid_data');
  assert.equal(normalizeF107([{ other: 1 }]).metadata.error, 'invalid_schema');
});

test('the alternative summary shape is verified as an array; a JSON object is not silently accepted as rows', async () => {
  const rows = [{ time_tag: '2026-11-08T20:00:00', flux: 128 }];
  assert.deepEqual(await fetchNoaaRows('https://services.swpc.noaa.gov/products/summary/10cm-flux.json', (async () => new Response(JSON.stringify(rows))) as typeof fetch), rows);
  await assert.rejects(fetchNoaaRows('https://services.swpc.noaa.gov/products/summary/10cm-flux.json', (async () => new Response(JSON.stringify(rows[0]))) as typeof fetch), { code: 'invalid_schema' });
});

test('a valid primary F10.7 never triggers a summary/noon substitution or extra request', async () => {
  const { result, requests } = await solar(baselineProducts());
  assert.equal(result.success, true); assert.equal(result.data?.solarFlux, 128);
  assert.equal(requests.length, 6); assert.ok(requests.every(url => !url.includes('/summary/')));
});

test('regions count only positive spot-bearing unique IDs on the latest valid day, without an invented hour', () => {
  const rows = [region(1001, 5, '2026-11-07'), region(1001, 2), region(1001, 2), region(1002, null), region(1003, 1), region(1004, 0), region(1005, 99, '2026-02-30')];
  const result = normalizeSolarRegions(rows);
  assert.equal(result.count, 2); assert.equal(result.unknown, 1);
  assert.equal(result.metadata.state, 'partial'); assert.equal(result.metadata.observedDate, '2026-11-08');
  assert.equal(result.metadata.observedAt, null); assert.equal(result.metadata.timePrecision, 'date');
  assert.match(result.metadata.note!, /Limite inferior/); assert.match(result.metadata.note!, /Não equivale ao SRS/);
  assert.deepEqual(normalizeSolarRegions([...rows].reverse()), result, 'Array order is not a revision policy');
});

test('conflicting region duplicates are unknown, never chosen by position or counted twice', () => {
  const result = normalizeSolarRegions([region(1001, 3), region(1001, 4), region(1002, 1)]);
  assert.equal(result.count, 1); assert.equal(result.unknown, 1); assert.equal(result.metadata.state, 'partial');
  assert.equal(normalizeSolarRegions([region(1001, 3), region(1001, null)]).count, null);
});

test('confirmed zero regions is distinct from empty, incomplete and invalid responses', () => {
  assert.equal(normalizeSolarRegions([region(1001, 0), region(1002, '0')]).count, 0);
  assert.equal(normalizeSolarRegions([region(1001, 0)]).metadata.state, 'available');
  for (const rows of [[], [region(1001, null)], [region(1001, 0), region(1002, null)], [{ observed_date: '2026-11-08' }], [region(1001, 1, '2026-02-30')]]) assert.equal(normalizeSolarRegions(rows).count, null);
});

test('latest XRA is selected by valid BEGIN and preferred representative, not largest class, latest peak or array tail', () => {
  const rows = [event({ bin: 900, begin_datetime: '2026-11-08T10:00:00', max_datetime: '2026-11-08T10:20:00', end_datetime: '2026-11-08T10:30:00', particulars1: 'X9.0' }),
    event({ status_text: '-', particulars1: 'C1.2', max_datetime: '2026-11-08T23:39:00' }), event()];
  const result = normalizeCataloguedFlares(rows.reverse());
  assert.equal(result.flareClass, 'C1.3');
  assert.equal(result.metadata.observedAt, '2026-11-08T23:24:00.000Z');
  assert.equal(result.metadata.timeKind, 'begin'); assert.equal(result.metadata.state, 'available');
  assert.match(result.metadata.note!, /início/); assert.match(result.metadata.note!, /não a última amostra GOES/);
});

test('structured full dates already express midnight rollover and are never shifted twice', () => {
  const result = normalizeCataloguedFlares([event({ max_datetime: '2026-11-09T00:01:00', end_datetime: '2026-11-09T00:03:00' })]);
  assert.equal(result.flareClass, 'C1.3'); assert.equal(result.metadata.observedAt, '2026-11-08T23:24:00.000Z');
  assert.equal(result.metadata.observedDate, '2026-11-08');
  assert.equal(normalizeCataloguedFlares([event({ max_datetime: '2026-11-08T00:01:00' })]).flareClass, null, 'Do not repair an invalid full JSON date by inventing the following day');
});

test('XRA exact duplicates are deduplicated, conflicting representatives and unranked alternatives are unavailable', () => {
  assert.equal(normalizeCataloguedFlares([event(), event()]).flareClass, 'C1.3');
  const conflict = normalizeCataloguedFlares([event(), event({ particulars1: 'C1.4', change_flag: 7 })]);
  assert.equal(conflict.flareClass, null); assert.equal(conflict.metadata.error, 'ambiguous_event');
  assert.equal(normalizeCataloguedFlares([event({ status_text: '' })]).flareClass, 'C1.3');
  const alternate = normalizeCataloguedFlares([event({ status_text: '-' })]);
  assert.equal(alternate.flareClass, null); assert.equal(alternate.metadata.state, 'unavailable');
});

test('absence of XRA is distinct from malformed schema, incomplete latest event and unknown date', () => {
  assert.equal(normalizeCataloguedFlares([]).metadata.state, 'absent');
  assert.equal(normalizeCataloguedFlares([{ type: 'RSP' }]).metadata.state, 'absent');
  for (const rows of [[{ bad: 'schema' }], [event({ particulars1: null })], [event({ begin_datetime: '2345' })], [event({ begin_datetime: '2026-02-30T23:24:00' })], [event({ max_datetime: 'not-a-time' })]]) {
    const result = normalizeCataloguedFlares(rows); assert.equal(result.flareClass, null); assert.equal(result.metadata.state, 'unavailable');
  }
  const incomplete = normalizeCataloguedFlares([event({ bin: 1, begin_datetime: '2026-11-07T20:00:00', max_datetime: '2026-11-07T20:10:00' }), event({ particulars1: null })]);
  assert.equal(incomplete.flareClass, null, 'Do not replace an incomplete latest event with an older class silently');
});

test('wind/density and Bz/Bt preserve independently valid values and zero with distinct timestamps', () => {
  const wind = [{ time_tag: time(0), proton_speed: 400, proton_density: 4 }, { time_tag: time(1), proton_speed: 500, proton_density: null }, { time_tag: time(2), proton_speed: null, proton_density: 0 }];
  const imf = [{ time_tag: time(0), bz_gsm: -2, bt: 4 }, { time_tag: time(1), bz_gsm: -3, bt: null }, { time_tag: time(2), bz_gsm: null, bt: 0 }];
  assert.deepEqual(latestSolarField(wind, 'proton_speed'), { value: 500, timestamp: time(1) + '.000Z' });
  assert.deepEqual(latestSolarField(wind, 'proton_density'), { value: 0, timestamp: time(2) + '.000Z' });
  assert.deepEqual(latestSolarField(imf, 'bz_gsm'), { value: -3, timestamp: time(1) + '.000Z' });
  assert.deepEqual(latestSolarField(imf, 'bt'), { value: 0, timestamp: time(2) + '.000Z' });
  assert.equal(latestSolarField([{ time_tag: '2026-02-30T00:00:00', proton_speed: 500 }, { time_tag: time(0), proton_speed: '500' }], 'proton_speed'), null);
});

test('provider supports a single scalar field schema and never copies a companion timestamp', async () => {
  const data = baselineProducts();
  const { result } = await solar({ ...data, wind: [{ time_tag: time(5), proton_density: 0 }], imf: [{ time_tag: time(6), bt: 0 }] });
  assert.equal(result.success, true); assert.equal(result.data?.solarWindSpeed, null); assert.equal(result.data?.solarWindTimestamp, null);
  assert.equal(result.data?.solarWindSpeedTimestamp, null); assert.equal(result.data?.protonDensity, 0); assert.equal(result.data?.protonDensityTimestamp, time(5) + '.000Z');
  assert.equal(result.data?.bz, null); assert.equal(result.data?.imfTimestamp, null); assert.equal(result.data?.bzTimestamp, null); assert.equal(result.data?.bt, 0); assert.equal(result.data?.btTimestamp, time(6) + '.000Z');
  assert.equal(result.data?.productErrors?.wind, undefined); assert.equal(result.data?.productMetadata?.windSpeed?.state, 'unavailable');
});

test('F10.7 failure stays isolated from valid catalogue, GOES and independent scalar products', async () => {
  const data = baselineProducts();
  const { result, requests } = await solar({ ...data, flares: [event()] }, { f107: 503 });
  assert.equal(requests.length, 6); assert.equal(result.success, true); assert.equal(result.data?.solarFlux, null);
  assert.equal(result.data?.productErrors?.f107, 'http_error:503'); assert.equal(result.data?.currentXRay?.flareClass, 'C1.0');
  assert.equal(result.data?.flares, 'C1.3'); assert.notEqual(result.data?.flares, result.data?.currentXRay?.flareClass);
  assert.equal(result.data?.solarWindSpeed, 400); assert.equal(result.data?.bz, -3);
});

test('legitimate catalogue absence is valid partial information, while failed source is not empty success', async () => {
  const data = baselineProducts();
  const failures = { f107: 503, regions: 503, wind: 503, imf: 503, xray: 503 };
  const partial = await solar(data, failures);
  assert.equal(partial.result.success, true); assert.equal(partial.result.timestamp, null);
  assert.equal(partial.result.data?.flares, null); assert.equal(partial.result.data?.productMetadata?.flares?.state, 'absent');
  const failed = await solar(data, { ...failures, flares: 503 });
  assert.equal(failed.result.success, false); assert.equal(failed.result.data?.productMetadata?.flares?.state, 'unavailable');
  assert.equal(failed.result.data?.productMetadata?.flares?.error, 'http_error:503');
});


test('preferred representatives are resolved before ordering events, not after an alternative supplies a later BEGIN', () => {
  const earlier = event({ bin: 111, begin_datetime: '2026-11-08T10:00:00', max_datetime: '2026-11-08T10:35:00', end_datetime: '2026-11-08T10:40:00', particulars1: 'C1.0' });
  const alternative = { ...earlier, status_text: '-', begin_datetime: '2026-11-08T10:30:00' };
  const later = event({ bin: 222, begin_datetime: '2026-11-08T10:20:00', max_datetime: '2026-11-08T10:25:00', end_datetime: '2026-11-08T10:30:00', particulars1: 'C2.0' });
  const result = normalizeCataloguedFlares([later, alternative, earlier]);
  assert.equal(result.flareClass, 'C2.0'); assert.equal(result.metadata.observedAt, '2026-11-08T10:20:00.000Z');
});

test('unranked blank/minus alternatives and qualified BEGIN never become an exact last event or a different time kind', () => {
  assert.equal(normalizeCataloguedFlares([event({ status_text: '' }), event({ status_text: '-' })]).metadata.error, 'ambiguous_event');
  for (const begin_quality of ['A', 'B', 'U']) {
    const result = normalizeCataloguedFlares([event({ begin_quality })]);
    assert.equal(result.flareClass, null); assert.equal(result.metadata.state, 'unavailable'); assert.equal(result.metadata.observedAt, null);
    assert.match(result.metadata.note!, /qualificador horário/); assert.equal(result.metadata.timeKind, undefined);
  }
});
