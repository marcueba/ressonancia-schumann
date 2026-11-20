import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createStationService } from '../server/services/stations';
import { STATION_CATALOG } from '../shared/stations';
import { BGS_ORIGINAL_URLS, BGS_SOURCE_PAGE_URL, BGS_STATION_ID } from '../shared/bgs';
import type { BgsSpectrogramsMetadata } from '../shared/bgs';
import type { NormalizedSchumannData, ProviderResponse } from '../server/types';
import { StationsView } from '../src/pages/Stations';

// Synthetic provider metadata; no fixture can enter the live service factory.
function numeric(overrides: Partial<NormalizedSchumannData> = {}): NormalizedSchumannData {
  const empty = { frequency: null, amplitude: null, quality: 'unknown' };
  return { stationId: 'tomsk', available: false, availability: 'unavailable', timestamp: null,
    fundamental: { ...empty }, mode2: { ...empty }, mode3: { ...empty }, mode4: { ...empty }, mode5: { ...empty },
    quality: 'Alta', source: 'synthetic test', is_demo: false, ...overrides };
}
function visual(): BgsSpectrogramsMetadata {
  const channel = (id: 'north' | 'east') => ({ channel: id, available: true, sha256: (id === 'north' ? 'a' : 'b').repeat(64),
    imageUrl: `/api/bgs/spectrograms/${id}/${(id === 'north' ? 'a' : 'b').repeat(64)}.jpg`, originalUrl: BGS_ORIGINAL_URLS[id],
    imageOrigin: 'archive' as const, fetchedAt: null, checkedAt: '2024-06-01T12:00:00Z', nextCheckAt: '2024-06-02T12:00:00Z',
    cacheState: 'stale' as const, error: 'material_unverified',
    observedPeriod: { label: '17/03/2024 (data inscrita na imagem)', date: '2024-03-17', year: 2024, basis: 'image_verified_by_sha256' as const },
    credit: 'British Geological Survey © UKRI 2024' });
  return { stationId: BGS_STATION_ID, sourcePageUrl: BGS_SOURCE_PAGE_URL, channels: { north: channel('north'), east: channel('east') } };
}
function service(response: ProviderResponse<NormalizedSchumannData> = { success: false, timestamp: null, data: numeric() }, metadata = visual()) {
  return createStationService({ getTomskCurrent: async () => response, getBgsMetadata: async () => metadata });
}

test('the shared catalog preserves the API/page union without claiming project dataset validation', async () => {
  const stations = await service().getStations();
  assert.deepEqual(stations.map(station => station.id), ['tomsk', 'bgs', 'cumiana', 'etna', 'heartmath', 'sierra']);
  assert.equal(new Set(stations.map(station => station.id)).size, 6);
  assert.equal(stations.find(station => station.id === 'sierra')?.status, 'reference');
  assert.equal(stations.find(station => station.id === 'etna')?.dataSource, 'Etna Radio Observatory (ERO)');
  assert.equal(stations.find(station => station.id === 'etna')?.latitude, null);
  assert.equal(stations.find(station => station.id === 'heartmath')?.longitude, null);
  assert.doesNotMatch(stations.find(station => station.id === 'sierra')!.role, /validação|validado/);
});

test('non-integrated/reference details do not call live providers and do not pretend physical offline', async () => {
  let calls = 0;
  const source = createStationService({ getTomskCurrent: async () => { calls++; throw new Error('unexpected'); }, getBgsMetadata: async () => { calls++; throw new Error('unexpected'); } });
  for (const id of ['cumiana', 'etna', 'heartmath', 'sierra']) {
    const item = (await source.getStationById(id))!;
    assert.equal(item.status, id === 'sierra' ? 'reference' : 'not_integrated');
    assert.equal(item.numericAvailability, 'not_connected');
    assert.equal(item.quality, null);
    assert.equal(item.lastUpdate, null);
    assert.equal(item.checkedAt, null);
  }
  assert.equal(await source.getStationById('nonexistent'), null);
  assert.equal(calls, 0);
});

test('success false with a valid unavailable document is distinct from a query failure', async () => {
  const item = (await service({ success: false, timestamp: '2024-06-01T20:00:00Z', errorCode: 'source_unavailable',
    data: numeric({ source_updated_at: '2024-06-01T10:00:00Z', collected_at: '2024-06-01T12:00:00Z' }) }).getStationById('tomsk'))!;
  assert.equal(item.status, 'numeric_unavailable');
  assert.equal(item.numericAvailability, 'unavailable');
  assert.equal(item.lastUpdate, null);
  assert.equal(item.quality, null);
  assert.equal(item.sourceUpdatedAt, '2024-06-01T10:00:00Z');
  assert.equal(item.checkedAt, '2024-06-01T12:00:00Z');
});

test('transport errors and throwing providers never promote response/query timestamps into observations', async () => {
  const failed = (await service({ success: false, timestamp: '2024-06-01T20:00:00Z', errorCode: 'upstream_timeout' }).getStationById('tomsk'))!;
  assert.equal(failed.status, 'query_failed');
  assert.equal(failed.lastUpdate, null);
  assert.equal(failed.checkedAt, null);
  const throwing = createStationService({ getTomskCurrent: async () => { throw new Error('network'); }, getBgsMetadata: async () => visual() });
  const list = await throwing.getStations();
  assert.equal(list.find(station => station.id === 'tomsk')?.status, 'query_failed');
  assert.equal(list.find(station => station.id === 'bgs')?.status, 'visual_available');
});

test('partial historic numeric data retains its estimate separately from a missing measurement time', async () => {
  const item = (await service({ success: true, timestamp: '2024-06-01T12:00:00Z', data: numeric({ available: true, is_historical: true,
    fundamental: { frequency: 7.9, amplitude: null, quality: 'ok' }, estimated_observation_at: '2024-05-30T11:00:00Z' }) }).getStationById('tomsk'))!;
  assert.equal(item.status, 'numeric_available');
  assert.equal(item.numericAvailability, 'partial');
  assert.equal(item.lastUpdate, null);
  assert.equal(item.estimatedObservationAt, '2024-05-30T11:00:00Z');
  assert.equal(item.isHistorical, true);
  assert.equal(item.quality, null);
  assert.match(item.statusDetail, /históricos/);
});

test('only a valid observation timestamp inside valid non-demo source data becomes lastUpdate', async () => {
  const data = numeric({ available: true, timestamp: '2024-05-30T11:00:00Z', fundamental: { frequency: 7.9, amplitude: null, quality: 'ok' } });
  assert.equal((await service({ success: true, timestamp: '2024-06-01T12:00:00Z', data }).getStationById('tomsk'))?.lastUpdate, data.timestamp);
  for (const timestamp of ['2024-02-30T11:00:00Z', '2039-01-01T12:00:00Z', '2024-05-30', '2024-05-30T11:00:00-00:00']) {
    assert.equal((await service({ success: true, timestamp: null, data: { ...data, timestamp } }).getStationById('tomsk'))?.lastUpdate, null);
  }
  const demo = (await service({ success: true, timestamp: data.timestamp, data: { ...data, is_demo: true } }).getStationById('tomsk'))!;
  assert.equal(demo.status, 'unknown');
  assert.equal(demo.lastUpdate, null);
  assert.equal(demo.errorCode, 'demonstration_data');
});

test('availability false or malformed numeric values cannot become numeric available', async () => {
  for (const data of [numeric({ available: false, fundamental: { frequency: 7.9, amplitude: null, quality: 'ok' } }),
    numeric({ available: true, fundamental: { frequency: NaN, amplitude: null, quality: 'ok' } })]) {
    assert.equal((await service({ success: true, timestamp: null, data }).getStationById('tomsk'))?.status, 'numeric_unavailable');
  }
});

test('verified stale BGS visual data does not imply numeric integration, high quality or a new observation time', async () => {
  const metadata = visual();
  const item = (await service(undefined, metadata).getStationById('bgs'))!;
  assert.equal(item.status, 'visual_available');
  assert.equal(item.integration, 'visual_independent');
  assert.equal(item.numericAvailability, 'not_connected');
  assert.equal(item.lastUpdate, null);
  assert.equal(item.quality, null);
  assert.equal(item.sourceUpdatedAt, null);
  assert.equal(item.checkedAt, '2024-06-01T12:00:00Z');
  assert.deepEqual(item.visual, metadata);
  assert.match(item.rights.images!, /não comercial/);
  assert.match(item.rights.rawData!, /não se estende aos JPEGs/);
});

test('BGS cold failure is independent of numeric provider; list and detail share the resolver', async () => {
  const source = createStationService({ getTomskCurrent: async () => ({ success: false, timestamp: null, data: numeric() }), getBgsMetadata: async () => { throw new Error('fail'); } });
  const bgs = (await source.getStationById('bgs'))!;
  assert.equal(bgs.status, 'query_failed');
  assert.equal(bgs.numericAvailability, 'not_connected');
  assert.equal(bgs.lastUpdate, null);
  const list = await source.getStations();
  assert.deepEqual(list.find(station => station.id === 'bgs'), bgs);
  assert.equal(list.find(station => station.id === 'tomsk')?.status, 'numeric_unavailable');
});

test('BGS metadata without a verified image reports visual unavailability instead of physical offline', async () => {
  const metadata = visual();
  for (const channel of Object.values(metadata.channels)) Object.assign(channel, { available: false, imageUrl: null, sha256: null, observedPeriod: null, credit: null });
  const bgs = (await service(undefined, metadata).getStationById('bgs'))!;
  assert.equal(bgs.status, 'visual_unavailable');
  assert.equal(bgs.numericAvailability, 'not_connected');
});

test('stations UI groups two used sources and four references without internal role labels', async () => {
  const stations = await service().getStations();
  const html = renderToStaticMarkup(createElement(StationsView, { stations }));
  for (const item of STATION_CATALOG) assert.match(html, new RegExp(`data-station-id="${item.id}"`));
  const used = /<section[^>]*data-station-group="used"[^>]*>(.*?)<\/section>/.exec(html)![1];
  const references = /<section[^>]*data-station-group="references"[^>]*>(.*?)<\/section>/.exec(html)![1];
  assert.match(used, /Fontes utilizadas no site/);
  assert.deepEqual([...used.matchAll(/data-station-id="([^"]+)"/g)].map(match => match[1]), ['tomsk', 'bgs']);
  assert.match(references, /Outras fontes e referências/);
  assert.deepEqual([...references.matchAll(/data-station-id="([^"]+)"/g)].map(match => match[1]), ['cumiana', 'etna', 'heartmath', 'sierra']);
  assert.equal((references.match(/>Referência externa</g) ?? []).length, 3);
  assert.equal((references.match(/>Referência bibliográfica</g) ?? []).length, 1);
  assert.match(references, /não alimentam os dados apresentados no site/);
  assert.doesNotMatch(references, /data-station-status|Estado não confirmado|Não integrado ao site/);
  assert.doesNotMatch(html, /Papel no sistema|Fonte numérica configurada no site|Painel visual independente; sem números conectados|Integração não realizada no site|Referência metodológica; sem integração operacional/);
  assert.match(html, /Imagem verificada disponível/);
  assert.match(html, /Cópia arquivada verificada/);
  assert.match(html, /17\/03\/2024/);
  assert.match(html, /British Geological Survey © UKRI 2024/);
  assert.match(html, /uso comercial exige autorização separada/i);
  assert.match(html, /Novo material aguarda verificação/);
  assert.match(html, /href="\/atual"/);
  assert.match(html, /Imagem e valores consultados separadamente/);
  assert.match(html, /não são medições instrumentais diretas realizadas por este projeto/);
  assert.equal((html.match(/<details /g) ?? []).length, 6);
  assert.equal((html.match(/>Créditos e notas<\/summary>/g) ?? []).length, 6);
  for (const channel of ['north', 'east'] as const) {
    assert.ok(html.includes(`href="${visual().channels[channel].imageUrl}"`));
  }
  for (const item of STATION_CATALOG) assert.ok(html.includes(`href="${item.referenceUrl!.replaceAll('&', '&amp;')}"`));
  assert.doesNotMatch(html, />Alta<|Dataset científico de validação/);
});

test('API query failure preserves the full informative catalog without inventing operational states', () => {
  const html = renderToStaticMarkup(createElement(StationsView, { stations: null, error: true }));
  assert.match(html, /role="alert"/);
  assert.match(html, /catálogo informativo foi preservado/);
  assert.equal((html.match(/data-station-id=/g) ?? []).length, 6);
  assert.equal((html.match(/Estado não confirmado/g) ?? []).length, 2);
  assert.doesNotMatch(html, /Imagem verificada disponível|Dados numéricos disponíveis|>Alta</);
});

test('stations UI keeps loading, numeric partiality and independent product failures explicit', async () => {
  const loading = renderToStaticMarkup(createElement(StationsView, { stations: null, loading: true }));
  assert.match(loading, /role="status"/);
  assert.match(loading, /Consultando os produtos/);
  assert.doesNotMatch(loading, /role="alert"|Ativa|Ao vivo/);
  const stations = await service({ success: true, timestamp: '2024-06-01T12:00:00Z', data: numeric({ available: true, is_historical: true,
    fundamental: { frequency: 7.9, amplitude: null, quality: 'ok' }, estimated_observation_at: '2024-05-30T11:00:00Z' }) }).getStations();
  const partial = renderToStaticMarkup(createElement(StationsView, { stations }));
  assert.match(partial, /Parâmetros numéricos parciais/);
  assert.match(partial, /históricos \/ últimos conhecidos/);
  assert.match(partial, /Leitura derivada estimada externamente: 30\/05\/2024, 11:00:00 UTC/);
  assert.match(partial, /Disponibilidade dos parâmetros numéricos/);
  assert.match(partial, /Cópia arquivada verificada/);
  const failed = await service({ success: false, timestamp: null, errorCode: 'upstream_timeout' }).getStations();
  const independent = renderToStaticMarkup(createElement(StationsView, { stations: failed }));
  assert.match(independent, /Falha de consulta ao produto/);
  assert.match(independent, /role="alert"/);
  assert.match(independent, /Imagem verificada disponível/);
  assert.doesNotMatch(independent, /Ao vivo|>Ativa<|>offline</);
});

test('station channel amplification keeps the local verification gate and does not promote a new unverified image', async () => {
  const metadata = visual();
  Object.assign(metadata.channels.north, { imageUrl: 'https://untrusted.invalid/image.jpg' });
  Object.assign(metadata.channels.east, { available: false, imageUrl: null, sha256: null, observedPeriod: null, credit: null, error: 'upstream_timeout' });
  const stations = await service(undefined, metadata).getStations();
  const html = renderToStaticMarkup(createElement(StationsView, { stations }));
  assert.doesNotMatch(html, /href="https:\/\/untrusted.invalid|Ampliar Norte|Ampliar Leste/);
  assert.equal((html.match(/Sem imagem verificada disponível/g) ?? []).length, 2);
  assert.match(html, /Novo material aguarda verificação/);
  assert.match(html, /A consulta remota não forneceu uma atualização válida/);
  assert.match(html, /href="\/atual"/);
});
