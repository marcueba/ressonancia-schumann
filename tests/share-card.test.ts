import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ShareCardModal } from '../src/components/ShareCardModal';

function render(data: { f1: number|null; f2: number|null; f3: number|null; intensity: number|null; timestamp: string|null }) {
  return renderToStaticMarkup(createElement(ShareCardModal, { isOpen: true, onClose() {}, data }));
}

test('historical share card uses one visible/exported card and explicit UTC, without claiming today', () => {
  const html = render({ f1: 7.1, f2: 13.4, f3: 20.8, intensity: 64, timestamp: '2020-01-02T03:04:05Z' });
  assert.equal((html.match(/data-share-card=/g) || []).length, 1);
  assert.match(html, /02\/01\/2020, 03:04:05 UTC/);
  assert.match(html, /Última observação disponível/);
  assert.doesNotMatch(html, /HOJE|Dados atuais|display:none|Invalid Date/);
  assert.match(html, /não calibrada em pT/);
});

test('missing values and invalid observation time remain unavailable, while a real zero stays zero', () => {
  const missing = render({ f1: null, f2: null, f3: null, intensity: null, timestamp: 'invalid' });
  assert.match(missing, /Data da observação indisponível/);
  assert.ok((missing.match(/—/g) || []).length >= 4);
  assert.doesNotMatch(missing, /NaN|Invalid Date|1970|>0\.0</);
  const zero = render({ f1: 0, f2: null, f3: null, intensity: 0, timestamp: null });
  assert.equal((zero.match(/>0\.0(?:<| )/g) || []).length, 2);
});
