import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SchumannTimelineChart, Range } from '../src/components/SchumannTimelineChart';
import type { HistoricalDataPoint } from '../src/types';

function render(data: HistoricalDataPoint[], range: Range, error = false, loading = false) {
  return renderToStaticMarkup(createElement(SchumannTimelineChart, {
    data, range, error, loading, onRangeChange: () => {}
  }));
}

test('empty recent history keeps the selected range and offers a visitor-controlled 90-day action', () => {
  const html = render([], '7d');
  assert.match(html, /Evolução Observacional \(7 dias\)/);
  assert.match(html, /Nenhum registro disponível neste período/);
  assert.match(html, /0 registros neste período/);
  assert.match(html, /<button[^>]*>Ver 90 dias<\/button>/);
  assert.match(html, /A janela consultada não garante cobertura completa/);
  assert.match(html, /aria-pressed="true"[^>]*>7 dias<\/button>/);
  assert.doesNotMatch(html, /Não foi possível consultar|registros disponíveis em setembro/);
  assert.doesNotMatch(html, /role="img"/);
});

test('old records are retained and offered to the chart without filling missing modes', () => {
  const records: HistoricalDataPoint[] = Array.from({ length: 11 }, (_, i) => ({
    timestamp: `2026-09-${String(11 + i).padStart(2, '0')}T12:00:00Z`,
    f1: i === 0 ? null : 7.1,
    f2: i === 0 ? null : 13.4,
    f3: i < 2 ? null : 19.8,
    quality: 'isolated test', sourceType: 'derived_spectrogram', derivedFromImage: true, processor: 'isolated test'
  }));
  const before = structuredClone(records);
  const html = render(records, '90d');
  assert.match(html, /Evolução Observacional \(90 dias\)/);
  assert.match(html, /11 registros neste período/);
  assert.match(html, /Primeiro registro|Intervalo dos registros/);
  assert.doesNotMatch(html, /11 observações disponíveis|Primeira observação/);
  assert.match(html, /role="img"/);
  assert.match(html, /Apenas frequências presentes são desenhadas/);
  assert.match(html, /11\/09\/2026/);
  assert.match(html, /21\/09\/2026/);
  assert.doesNotMatch(html, /Nenhum registro disponível|Não foi possível consultar/);
  assert.deepEqual(records, before);
});

test('failed history query is distinct from a successful empty period', () => {
  const html = render([], '7d', true);
  assert.match(html, /role="alert"/);
  assert.match(html, /Não foi possível consultar o histórico/);
  assert.match(html, /não informa se existem registros neste período/);
  assert.doesNotMatch(html, /Nenhum registro disponível|0 registros neste período|Ver 90 dias/);
});

test('the 90-day action appears only for a successful empty non-90-day selection', () => {
  for (const range of ['24h', '7d', '30d', '1y'] as const) assert.match(render([], range), /Ver 90 dias/);
  const empty90 = render([], '90d');
  assert.match(empty90, /Nenhum registro disponível neste período/);
  assert.doesNotMatch(empty90, /Ver 90 dias/);
  const loading = render([], '7d', false, true);
  assert.match(loading, /role="status"/);
  assert.match(loading, /Carregando dados observacionais/);
  assert.doesNotMatch(loading, /Ver 90 dias|Nenhum registro disponível|0 registros neste período|Não foi possível consultar/);
  const records: HistoricalDataPoint[] = [{ timestamp: '2026-10-01T12:00:00Z', f1: null, f2: 14.1, f3: null, quality: 'isolated', sourceType: 'derived_spectrogram', derivedFromImage: true, processor: 'test' }];
  assert.doesNotMatch(render(records, '7d'), /Ver 90 dias|Nenhum registro disponível/);
});
