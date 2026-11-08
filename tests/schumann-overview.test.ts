import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { SchumannOverview } from '../src/components/SchumannOverview';
import type { CurrentResonanceData } from '../src/types';

const mode = (frequency: number | null) => ({ frequency, amplitude: null, quality: 'isolated test' });
function data(values: (number | null)[]): CurrentResonanceData {
  return { fundamental: mode(values[0]), mode2: mode(values[1]), mode3: mode(values[2]), mode4: mode(values[3]), mode5: mode(values[4]),
    source: 'isolated station', source_type: 'derived_spectrogram', source_updated_at: '2026-11-05T15:42:00Z', timestamp: null };
}
const render = (data: CurrentResonanceData | null, loading = false) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SchumannOverview, { data, loading })));

test('Schumann absence has one compact status and a document update, never a fake observation', () => {
  const html = render({ ...data([null, null, null, null, null]), available: false });
  assert.match(html, /Sem nova observação válida para exibir/);
  assert.equal((html.match(/Schumann indisponível/g) || []).length, 1);
  assert.match(html, /Atualização do documento da fonte/);
  assert.doesNotMatch(html, /Última observação disponível|Horário estimado da leitura|Frequências derivadas disponíveis|>0\.0</);
});

test('valid and partial values retain their own source, date and availability state', () => {
  const valid = render({ ...data([7.8, 14.3, 20.8, 27.3, 33.8]), estimated_observation_at: '2026-11-05T14:42:00Z' });
  assert.match(valid, /Frequências derivadas disponíveis/);
  assert.match(valid, /7\.80|14\.3|20\.8/);
  assert.match(valid, /Horário estimado da leitura derivada/);
  assert.match(valid, /05\/11\/2026, 11:42:00 \(São Paulo, UTC-03:00\)/);
  assert.match(valid, /isolated station/);
  const partial = render(data([null, 14.3, null, null, null]));
  assert.match(partial, /Dados derivados parciais/);
  assert.match(partial, /14\.3/);
  assert.match(partial, /Horário da medição não informado pela fonte/);
  assert.doesNotMatch(partial, /Sem nova observação válida/);
});

test('technical failure, loading and historical readings remain distinct', () => {
  assert.match(render(null), /Falha ao consultar os dados Schumann/);
  assert.doesNotMatch(render(null), /Sem nova observação válida|Atualização do documento/);
  assert.match(render(null, true), /Consultando Schumann/);
  const historical = render({ ...data([7.8, null, null, null, null]), is_historical: true, estimated_observation_at: '2020-01-02T03:04:05Z' });
  assert.match(historical, /Registro histórico/);
  assert.match(historical, /02\/01\/2020/);
});
