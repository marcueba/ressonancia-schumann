import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { normalizeSchumannDocument } from '../server/services/schumann-contract';
import { getSchumannAvailability } from '../shared/schumann';
import { SchumannTimes } from '../src/components/SchumannTimes';
import { schumannStatus } from '../src/utils/schumannState';
import { loadDashboardSources } from '../src/data/dashboardSources';
import { dataProvider } from '../src/data/dataProvider';

const queriedAt = '2026-11-05T20:00:00Z';
const updatedAt = '2026-11-05T15:42:00+00:00';
const mode = (pico_hz: unknown, intensidade?: unknown) => ({ pico_hz, intensidade, estado: 'ok' });
const normalize = (doc: unknown) => normalizeSchumannDocument(doc, 'tomsk', queriedAt);

test('a valid error document with a timestamp and no frequencies is explicitly unavailable', () => {
  const data = normalize({ atualizado: updatedAt, estado: 'fonte_indisponivel', detalhe: '<urlopen error timed out>' });
  assert.equal(data.available, false);
  assert.equal(data.availability, 'unavailable');
  assert.equal(data.availability_reason, 'source_unavailable');
  assert.equal(data.timestamp, null);
  assert.equal(data.source_updated_at, updatedAt);
  assert.equal(data.collected_at, queriedAt);
  assert.equal(data.fundamental.frequency, null);
  assert.match(schumannStatus(data), /indisponível/);
  const html = renderToStaticMarkup(createElement(SchumannTimes, { data, zone: 'UTC' }));
  assert.match(html, /Atualização do documento/);
  assert.doesNotMatch(html, /Horário estimado|Data e hora da observação|Última observação/);
});

test('partial and complete frequencies are distinct, and relative intensity zero survives', () => {
  const partial = normalize({ atualizado: updatedAt, estado: 'ok', atraso_horas: 0, fundamental: mode(7.8, 0), harmonicas: [mode(14.3)] });
  assert.equal(partial.availability, 'partial');
  assert.equal(partial.available, true);
  assert.equal(partial.relativeIntensity?.value, 0);
  assert.equal(partial.fundamental.amplitude, null);
  assert.match(schumannStatus(partial), /parciais/);
  const complete = normalize({ atualizado: updatedAt, atraso_horas: 0, fundamental: mode(7.8), harmonicas: [mode(14.3), mode(20.8), mode(27.3), mode(33.8)] });
  assert.equal(complete.availability, 'available');
  assert.equal(complete.timestamp, null, 'the collector must not mistake an image-time estimate for an instrument timestamp');
  assert.equal(complete.estimated_observation_at, '2026-11-05T15:42:00.000Z');
});

test('only finite numeric peaks within the source band and consistent mode order are accepted', () => {
  for (const value of [null, undefined, '7.8', 0, -1, NaN, Infinity, 41]) {
    assert.equal(normalize({ estado: 'ok', fundamental: mode(value) }).availability, 'unavailable', String(value));
  }
  const data = normalize({ fundamental: mode(7.8), harmonicas: [mode(6), mode(20.8), mode(27.3), mode(33.8)] });
  assert.equal(data.mode2.frequency, null);
  assert.equal(data.availability, 'partial');
  assert.equal(normalize({ fundamental: { pico_hz: 7.8, estado: 'sem_confianca' } }).availability, 'unavailable');
  assert.equal(getSchumannAvailability([null, null, null]), 'unavailable');
});

test('reading time requires valid frequencies and both explicit source times; historical readings are labelled', () => {
  for (const atraso_horas of [undefined, null, '2', -1, Infinity, 73]) {
    const data = normalize({ atualizado: updatedAt, atraso_horas, fundamental: mode(7.8) });
    assert.equal(data.timestamp, null);
    assert.equal(data.source_updated_at, updatedAt);
  }
  const historical = normalize({ atualizado: updatedAt, atraso_horas: 2, estado: 'ultima_conhecida', fundamental: mode(7.8) });
  assert.equal(historical.timestamp, null);
  assert.equal(historical.estimated_observation_at, '2026-11-05T13:42:00.000Z');
  assert.equal(historical.timestamp_basis, 'source_update_minus_delay');
  assert.equal(historical.is_historical, true);
  assert.match(schumannStatus(historical), /histórica/);
  const empty = normalize({ atualizado: updatedAt, atraso_horas: 0, fundamental: mode(null) });
  assert.equal(empty.timestamp, null);
  assert.equal(empty.estimated_observation_at, null);
  const oldDocument = normalize({ atualizado: '2026-09-15T12:00:00Z', atraso_horas: 0, fundamental: mode(7.8) });
  assert.equal(oldDocument.is_historical, true);
  assert.match(schumannStatus(oldDocument), /histórica/);
});

test('schema changes are parser failures, distinct from a valid empty observation document', () => {
  for (const doc of [null, [], 'html', { unexpected: true }, { fundamental: 'changed' }, { estado: 'ok', harmonicas: {} }]) {
    assert.throws(() => normalize(doc), { code: 'invalid_schema' });
  }
});

test('a rejected Schumann request preserves independently returned NOAA data and vice versa', async () => {
  const geo = { currentKp: 0, recentKp: [], history: [], status: 'Calma', dataSource: 'isolated' };
  const solar = { solarFlux: null, sunspots: null, flares: null, status: 'isolated', dataSource: 'isolated', timestamp: null };
  const provider = { ...dataProvider, async getCurrentData() { throw new TypeError('isolated transport failure'); }, async getGeomagneticData() { return geo; }, async getSolarData() { return solar; } };
  const results = await loadDashboardSources(provider);
  assert.equal(results.current, null);
  assert.equal(results.geo, geo);
  assert.equal(results.solar, solar);
  const current = normalize({ fundamental: mode(7.8) });
  const reverse = await loadDashboardSources({ ...provider, async getCurrentData() { return current; }, async getSolarData() { throw new Error('isolated NOAA failure'); } });
  assert.equal(reverse.current, current);
  assert.equal(reverse.geo, geo);
  assert.equal(reverse.solar, null);
});

test('Schumann transport, HTTP, invalid JSON and changed schema remain distinct from a valid unavailable document', async () => {
  const { tomskProvider } = await import('../server/providers/SchumannProviders');
  const { apiCache } = await import('../server/services/cache');
  const previousMode = process.env.DATA_MODE, originalFetch = globalThis.fetch, originalSet = apiCache.set;
  process.env.DATA_MODE = 'live';
  apiCache.set = () => {};
  try {
    const cases: [typeof fetch, string][] = [
      [async () => { throw new TypeError('isolated transport detail'); }, 'upstream_transport_error'],
      [async () => new Response(null, { status: 403 }), 'upstream_http_error'],
      [async () => new Response('<html>not JSON</html>'), 'invalid_json'],
      [async () => new Response(new ReadableStream({ start(controller) { controller.error(new TypeError('isolated body transport failure')); } })), 'upstream_transport_error'],
      [async () => new Response(JSON.stringify({ changed: true })), 'invalid_schema'],
    ];
    for (const [fetcher, expected] of cases) {
      globalThis.fetch = fetcher;
      const result = await tomskProvider.getCurrent();
      assert.equal(result.success, false);
      assert.equal(result.errorCode, expected);
      assert.equal(result.data, undefined);
      assert.equal(result.timestamp, null);
    }
    globalThis.fetch = async () => new Response(JSON.stringify({ atualizado: updatedAt, estado: 'fonte_indisponivel' }));
    const empty = await tomskProvider.getCurrent();
    assert.equal(empty.success, false);
    assert.equal(empty.errorCode, 'source_unavailable');
    assert.equal(empty.data?.availability, 'unavailable');
    assert.equal(empty.data?.timestamp, null);
  } finally {
    globalThis.fetch = originalFetch;
    apiCache.set = originalSet;
    if (previousMode === undefined) delete process.env.DATA_MODE; else process.env.DATA_MODE = previousMode;
  }
});
