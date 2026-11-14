import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../src/pages/Dashboard';
import { BgsSpectrogramView } from '../src/components/BgsSpectrogramPanel';
import { CurrentResonance } from '../src/pages/CurrentResonance';

test('redesigned home prioritizes ELF, then solar and geomagnetic context without promoting ERI', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Dashboard)));
  const positions = ['id="campo-elf"', 'id="atividade-solar"', 'id="atividade-geomagnetica"'].map(value => html.indexOf(value));
  assert.ok(positions.every(position => position >= 0));
  assert.ok(positions[0] < positions[1] && positions[1] < positions[2]);
  assert.match(html, /Amplitude física indisponível/);
  assert.match(html, /F1 · Frequência fundamental/);
  assert.match(html, /F2 · Segunda frequência/);
  assert.match(html, /F3 · Terceira frequência/);
  assert.match(html, /Espectrogramas oficiais do BGS/);
  assert.match(html, /Compartilhar leitura/);
  assert.doesNotMatch(html, /Earth Resonance Index|ÍNDICE EXPERIMENTAL|Intensidade Relativa/);
  assert.doesNotMatch(html, />0\.0<|>0 pT</);
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
