import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatSeriesInterval, prepareLinearTrend } from '../src/utils/chartSeries';
import { LinearTrendChart } from '../src/components/LinearTrendChart';
import { XRayChart } from '../src/components/XRayChart';
import { KpChart, prepareKpChart } from '../src/components/KpChart';
import { SchumannTimelineChart } from '../src/components/SchumannTimelineChart';
import type { HistoricalDataPoint } from '../src/types';

test('one-minute trends retain measured zero/negative values, nulls and missing-minute breaks without interpolating', () => {
  const input = [
    { timestamp: '2026-11-15T00:10:00Z', value: -3 },
    { timestamp: '2026-11-15T00:00:00Z', value: 0 },
    { timestamp: '2026-11-15T00:01:00Z', value: null },
    { timestamp: '2026-11-15T00:02:00Z', value: 2 },
    { timestamp: 'invalid', value: 500 },
    { timestamp: '2026-11-15T00:11:00Z', value: NaN },
  ];
  const before = structuredClone(input);
  const result = prepareLinearTrend(input);
  assert.deepEqual(result.filter(point => point.value !== null).map(point => point.value), [0, 2, -3]);
  assert.equal(result.filter(point => point.separator).length, 1);
  assert.equal(result.find(point => point.separator)?.value, null);
  assert.equal(result.find(point => point.timestamp === '2026-11-15T00:01:00Z')?.value, null);
  assert.equal(result.find(point => point.timestamp === '2026-11-15T00:11:00Z')?.value, null);
  assert.deepEqual(input, before);
  assert.deepEqual(prepareLinearTrend(result), result);
});

test('series interval describes valid returned timestamps in UTC with the actual dates and years', () => {
  assert.equal(formatSeriesInterval(['invalid']), 'Período indisponível');
  const interval = formatSeriesInterval(['2027-01-01T01:00:00', '2026-12-31T22:00:00-03:00', '2026-02-30T00:00:00Z']);
  assert.match(interval, /01\/01\/2027 01:00/);
  assert.match(interval, /UTC$/);
  assert.doesNotMatch(interval, /24 horas|30\/02/);
});

test('compact series intervals preserve date boundaries and retain the year when it changes', () => {
  assert.equal(formatSeriesInterval(['2026-11-15T23:00:00Z', '2026-11-16T01:00:00Z'], true), '15/11 23:00 – 16/11 01:00 UTC');
  assert.equal(formatSeriesInterval(['2026-12-31T23:00:00Z', '2027-01-01T01:00:00Z'], true), '31/12/2026 23:00 – 01/01/2027 01:00 UTC');
});

test('compact history distinguishes loading, access failure, empty period and records with absent frequencies', () => {
  const base = { data: [], range: '90d' as const, onRangeChange: () => {}, compact: true, loading: false, error: false };
  const render = (props = {}) => renderToStaticMarkup(createElement(SchumannTimelineChart, { ...base, ...props }));
  const loading = render({ loading: true });
  assert.match(loading, /Carregando histórico/);
  assert.doesNotMatch(loading, /Nenhum registro disponível/);
  const failed = render({ error: true });
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Falha de acesso não significa ausência/);
  assert.doesNotMatch(failed, /Nenhum registro disponível|0 registros/);
  const empty = render();
  assert.match(empty, /Nenhum registro disponível/);
  assert.match(empty, /0 registros/);
  assert.match(empty, />7d<.*>30d<.*>90d</);
  assert.doesNotMatch(empty, /24 horas|1 ano|role="img"/);
  const record: HistoricalDataPoint = { timestamp: '2026-09-11T00:00:00Z', f1: null, f2: null, f3: null, quality: 'test only', sourceType: 'derived_spectrogram', processor: 'isolated', derivedFromImage: true };
  const absent = render({ data: [record] });
  assert.match(absent, /1 registro/);
  assert.match(absent, /não contêm frequências válidas/);
  assert.match(absent, /11\/09\/2026/);
  assert.match(absent, /Dados derivados de imagens/);
  assert.doesNotMatch(absent, /role="img"|Nenhum registro disponível/);
});

test('compact charts keep explicit units, true intervals and absent history instead of decorative curves', () => {
  for (const component of [createElement(LinearTrendChart, { data: [], label: 'Bz', unit: 'nT' }), createElement(XRayChart, { data: [], compact: true }), createElement(KpChart, { data: [], compact: true })]) {
    assert.match(renderToStaticMarkup(component), /Histórico indisponível/);
  }
  const xray = renderToStaticMarkup(createElement(XRayChart, { compact: true, data: [{ time_tag: '2026-11-15T12:00:00Z', flux: 1e-6, energy: '0.1-0.8nm', satellite: 18 }] }));
  assert.match(xray, /data-xray-scale="log"/);
  assert.match(xray, /W\/m²/);
  assert.match(xray, /15\/11\/2026 12:00 UTC/);
  const bz = renderToStaticMarkup(createElement(LinearTrendChart, { label: 'Bz', unit: 'nT', data: [{ timestamp: '2026-11-15T00:00:00Z', value: -1 }] }));
  assert.match(bz, /data-trend-unit="nT"/);
  assert.match(bz, /15\/11\/2026 00:00 UTC/);
});

test('Kp chart accepts measured zero, rejects invalid times and values outside 0–9, and orders actual observation times', () => {
  const data = [{ time_tag: '2026-11-15T03:00:00', kp: 2.3 }, { time_tag: '2026-11-15T00:00:00Z', kp: 0 },
    { time_tag: 'bad', kp: 3 }, { time_tag: '2026-11-15T06:00:00Z', kp: 10 }, { time_tag: '2026-11-15T09:00:00Z', kp: -1 }];
  const result = prepareKpChart(data);
  assert.deepEqual(result.map(point => point.kp), [0, 2.3]);
  assert.equal(result[1].time_tag, '2026-11-15T03:00:00.000Z');
  const html = renderToStaticMarkup(createElement(KpChart, { data, compact: true }));
  assert.match(html, /data-kp-domain="0,9"/);
  assert.match(html, /15\/11\/2026 00:00 – 15\/11\/2026 03:00 UTC/);
  assert.doesNotMatch(html, /24 horas/);
});
