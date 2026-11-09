import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SolarProductNote, formatProductDay } from '../src/components/SolarProductNote';
import type { SolarProductMetadata } from '../src/components/SolarProductNote';

const source = 'https://services.swpc.noaa.gov/json/solar_regions.json';
const day: SolarProductMetadata = { state: 'partial', sourceUrl: source, observedAt: null,
  observedDate: '2026-11-08', timePrecision: 'date', note: 'Registros com contagens não informadas.' };

test('a source calendar day remains a day, never a fabricated observation hour', () => {
  const html = renderToStaticMarkup(createElement(SolarProductNote, { metadata: day, fallbackTime: '2031-02-03T12:34:00Z' }));
  assert.match(html, /08\/11\/2026/);
  assert.match(html, /Hora de observação não informada/);
  assert.doesNotMatch(html, /00:00|12:34|2031|Última atualização/);
  assert.equal(formatProductDay('2026-02-30'), 'Data não informada');
  assert.equal(formatProductDay('2026-11-08T00:00:00Z'), 'Data não informada');
});

test('catalogue begin time and its own source are distinct from a live GOES sample', () => {
  const metadata: SolarProductMetadata = { state: 'available', sourceUrl: 'https://services.swpc.noaa.gov/json/edited_events.json',
    observedAt: '2024-01-02T23:40:00Z', observedDate: null, timePrecision: 'timestamp', timeKind: 'begin' };
  const html = renderToStaticMarkup(createElement(SolarProductNote, { metadata }));
  assert.match(html, /Início catalogado:.*02\/01\/2024, 23:40:00 UTC/);
  assert.match(html, /href="https:\/\/services.swpc.noaa.gov\/json\/edited_events.json"/);
  assert.doesNotMatch(html, /Classe Atual|Maior evento|2026/);
});

test('partial counts and independent scalar fields do not share a claim about a total', () => {
  const count = renderToStaticMarkup(createElement(SolarProductNote, { metadata: day, partialLabel: 'Contagem parcial — total não determinado.' }));
  assert.match(count, /Contagem parcial — total não determinado/);
  const scalar = renderToStaticMarkup(createElement(SolarProductNote, { metadata: { ...day, sourceUrl: 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json' } }));
  assert.match(scalar, /Dados parciais deste produto/);
  assert.doesNotMatch(scalar, /total não/);
});

test('unknown temporal precision does not acquire the viewer clock', () => {
  const html = renderToStaticMarkup(createElement(SolarProductNote, { metadata: { ...day, state: 'unavailable', observedDate: null, timePrecision: 'unknown' } }));
  assert.doesNotMatch(html, /\d{2}\/\d{2}\/\d{4}|Horário informado|Hora de observação/);
  assert.match(html, /Produto NOAA de origem/);
});
