import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard, OverviewView, type OverviewViewProps } from '../src/pages/Dashboard';
import { BgsSpectrogramView } from '../src/components/BgsSpectrogramPanel';
import { CurrentResonance } from '../src/pages/CurrentResonance';
import { loadDashboardSources } from '../src/data/dashboardSources';
import { dataProvider } from '../src/data/dataProvider';
import type { CurrentResonanceData, SolarData } from '../src/types';

function renderView(overrides: Partial<OverviewViewProps> = {}) {
  const props: OverviewViewProps = {
    current: null, solar: null, geo: null, loading: { current: false, solar: false, geo: false },
    historyData: [], historyRange: '90d', historyLoading: false, historyError: false, onRangeChange() {}, ...overrides,
  };
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(OverviewView, props)));
}

test('overview replaces the hero with four ordered summaries, one details link each and a 90d initial query', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Dashboard)));
  assert.match(html, /<h1[^>]*>Visão geral<\/h1>/);
  assert.match(html, /Espectrogramas, frequências e clima espacial/);
  const positions = ['campo-elf', 'historico-elf', 'atividade-solar', 'atividade-geomagnetica'].map(id => html.indexOf(`id="${id}"`));
  assert.ok(positions.every(p => p >= 0));
  assert.deepEqual(positions.slice().sort((a, b) => a - b), positions);
  for (const path of ['/atual', '/historico?range=90d', '/solar', '/geomagnetica']) assert.ok(html.includes(`href="${path}"`));
  assert.equal((html.match(/Ver detalhes de /g) ?? []).length, 4);
  assert.match(html, /BGS · Norte/);
  assert.match(html, /BGS · Leste/);
  assert.match(html, /Tomsk · SOS-70/);
  assert.match(html, /aria-pressed="true"[^>]*>90d</);
  assert.doesNotMatch(html, /observatory-hero|Compartilhar leitura|Amplitude física|Earth Resonance Index|Intensidade Relativa|PRÉVIA · DADOS ILUSTRATIVOS|Ao vivo/);
});

test('live overview retains partial derived frequencies, source and observation time without inventing missing modes', () => {
  const mode = (frequency: number | null) => ({ frequency, amplitude: null, quality: 'isolated test' });
  const current: CurrentResonanceData = {
    available: true, fundamental: mode(8.12), mode2: mode(null), mode3: mode(20.31), mode4: mode(null), mode5: mode(null),
    source: 'Secondary test source', derived_from_image: true, source_type: 'derived_spectrogram',
    estimated_observation_at: '2026-09-15T12:34:56Z', is_historical: true,
  };
  const html = renderView({ current });
  assert.match(html, /8,12/);
  assert.match(html, /20,31/);
  assert.match(html, /Secondary test source/);
  assert.match(html, /independente do BGS/);
  assert.match(html, /15\/09\/2026, 12:34:56 UTC/);
  assert.match(html, /histórica parcial/);
  assert.doesNotMatch(html, /14,20|14,30|7,83|dados simulados/);
  assert.match(renderView({ current: { ...current, is_demo: true } }), /Demonstração · dados simulados/);
  assert.match(renderView({ demo: true }), /Demonstração · dados simulados/);
});

test('overview shows independent loading, absent values and failed sources rather than simulated curves', () => {
  const loading = renderView({ loading: { current: true, solar: true, geo: true }, historyLoading: true });
  assert.match(loading, /Consultando frequências derivadas/);
  assert.match(loading, /Consultando os produtos solares/);
  assert.match(loading, /Consultando o índice Kp/);
  assert.doesNotMatch(loading, /Falha ao consultar os dados Schumann|Não foi possível consultar os dados solares|Nenhum registro disponível/);
  const failed = renderView({ historyError: true });
  assert.match(failed, /Falha ao consultar os dados Schumann/);
  assert.match(failed, /Não foi possível consultar os dados solares/);
  assert.match(failed, /Não foi possível consultar os dados geomagnéticos/);
  assert.match(failed, /Falha de acesso não significa ausência/);
  const solar: SolarData = { solarFlux: null, sunspots: null, flares: null, timestamp: null, status: 'partial', dataSource: 'NOAA SWPC', bz: 0, bzTimestamp: '2026-09-15T01:00:00Z' };
  const partial = renderView({ solar, historyRange: '30d', geo: { currentKp: 0, history: [{ time_tag: '2026-09-15T00:00:00', kp: 0 }], recentKp: [], status: 'Calma', dataSource: 'NOAA SWPC' } });
  assert.match(partial, /href="\/historico\?range=30d"/);
  assert.equal((partial.match(/Histórico indisponível/g) ?? []).length, 3);
  assert.match(partial, /15\/09\/2026, 01:00:00 UTC/);
  assert.match(partial, /15\/09\/2026, 00:00:00 UTC/);
  assert.doesNotMatch(partial, /Não foi possível consultar os dados solares|últimas 24 horas|NaN|undefined/);
});

test('a slow Schumann source does not delay publishing completed NOAA sources to the overview', async () => {
  let finishCurrent!: (value: null) => void;
  const events: string[] = [];
  const pending = loadDashboardSources({ ...dataProvider,
    getCurrentData: () => new Promise<null>(resolve => { finishCurrent = resolve; }),
    getSolarData: async () => null,
    getGeomagneticData: async () => ({ currentKp: 0, recentKp: [], history: [], status: 'Calma', dataSource: 'NOAA SWPC' }),
  }, source => { events.push(...Object.keys(source)); });
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(events.includes('solar') && events.includes('geo'));
  assert.ok(!events.includes('current'));
  finishCurrent(null);
  await pending;
  assert.ok(events.includes('current'));
});

test('BGS publishing note distinguishes normal next-day schedule from actual image period', () => {
  const html = renderToStaticMarkup(createElement(BgsSpectrogramView, {
    state: { status: 'loading' }, selectedChannel: 'north', onSelectChannel: () => {},
  }));
  assert.match(html, /10h15 UTC/);
  assert.match(html, /a data efetiva da imagem deve ser conferida/);
  assert.match(html, /entre 15\/05 e 02\/10/);
  assert.doesNotMatch(html, /220 arquivos|224 dias|imagem de ontem/);
});

test('BGS panel can render independently while secondary Schumann values are still loading', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(CurrentResonance)));
  assert.match(html, /Consultando frequências derivadas/);
  assert.match(html, /Espectrogramas ELF — Eskdalemuir \/ BGS/);
  assert.match(html, /Os dados da estação Tomsk são independentes|Consultando os espectrogramas diários do BGS/);
  assert.doesNotMatch(html, /Falha ao consultar os dados Schumann/);
});

test('a failed config read cannot label a live overview as demonstration', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 503 });
  try { await assert.rejects(dataProvider.getConfig(), /Failed to fetch data mode/); }
  finally { globalThis.fetch = originalFetch; }
});

test('simultaneous overview reads share a request but later reads and different ranges stay independent', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async url => { calls.push(String(url)); await new Promise(resolve => setImmediate(resolve)); return Response.json([]); };
  try {
    await Promise.all([dataProvider.getHistoricalData('90d'), dataProvider.getHistoricalData('90d'), dataProvider.getHistoricalData('7d')]);
    assert.deepEqual(calls.sort(), ['/api/history?range=7d', '/api/history?range=90d']);
    await dataProvider.getHistoricalData('90d');
    assert.equal(calls.length, 3);
    const before = calls.length;
    await Promise.all([dataProvider.getConfig(), dataProvider.getConfig(), dataProvider.getCurrentData(), dataProvider.getCurrentData(), dataProvider.getSolarData(), dataProvider.getSolarData(), dataProvider.getGeomagneticData(), dataProvider.getGeomagneticData()]);
    assert.equal(calls.length - before, 4);
  } finally { globalThis.fetch = originalFetch; }
});
