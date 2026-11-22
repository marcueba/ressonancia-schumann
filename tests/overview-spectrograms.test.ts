import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { OverviewSpectrogramsView } from '../src/components/OverviewSpectrograms';
import { BGS_ORIGINAL_URLS, BGS_SOURCE_PAGE_URL, BGS_STATION_ID, type BgsChannel, type BgsChannelMetadata, type BgsSpectrogramsMetadata } from '../shared/bgs';
import type { BgsPanelState, BgsImageState } from '../src/components/BgsSpectrogramPanel';
import { fetchTomskSnapshot } from '../src/data/tomskSnapshot';

// Metadata fixtures are isolated to tests; neither payloads nor images enter the app.
function channel(id: BgsChannel): BgsChannelMetadata {
  const sha256 = (id === 'north' ? 'a' : 'b').repeat(64);
  return {
    channel: id, available: true, imageOrigin: 'archive', imageUrl: `/api/bgs/spectrograms/${id}/${sha256}.jpg`,
    originalUrl: BGS_ORIGINAL_URLS[id], sha256, fetchedAt: null, checkedAt: '2031-01-02T08:00:00Z', nextCheckAt: '2031-01-03T08:00:00Z',
    cacheState: 'cached', error: null, observedPeriod: { label: '17/03/2024', date: '2024-03-17', year: 2024, basis: 'image_verified_by_sha256' },
    credit: 'British Geological Survey © UKRI 2024',
  };
}
function metadata(): BgsSpectrogramsMetadata {
  return { stationId: BGS_STATION_ID, sourcePageUrl: BGS_SOURCE_PAGE_URL, channels: { north: channel('north'), east: channel('east') } };
}
function render(state: BgsPanelState, imageStates: Partial<Record<BgsChannel, BgsImageState>> = { north: 'loaded', east: 'loaded' }, tomskError = false) {
  return renderToStaticMarkup(createElement(OverviewSpectrogramsView, { state, imageStates,
    tomsk: { imgUrl: tomskError ? '' : '/api/spectrogram/tomsk?t=123', loading: false, hasError: tomskError, retry() {} },
  }));
}

test('overview simultaneously presents two verified BGS images and panoramic Tomsk with content-preserving enlargement', () => {
  const data = metadata();
  const html = render({ status: 'ready', metadata: data });
  assert.equal((html.match(/<img /g) ?? []).length, 3);
  assert.deepEqual([...html.matchAll(/data-overview-channel="([^"]+)"/g)].map(match => match[1]), ['tomsk', 'north', 'east']);
  const frames = [...html.matchAll(/data-overview-frame="true" class="([^"]+)"/g)].map(match => match[1]);
  assert.equal(frames.length, 3);
  assert.match(html, /data-overview-tiles="true"/);
  assert.doesNotMatch(html, /data-tomsk-layout|Comparar a legibilidade do Tomsk|[?&]tomsk=/);
  for (const id of ['north', 'east'] as const) {
    const figure = new RegExp(`<figure[^>]*data-overview-channel="${id}"[^>]*>(.*?)</figure>`).exec(html)![1];
    const src = /<img[^>]*src="([^"]+)"/.exec(figure)![1];
    const link = /<a[^>]*href="([^"]+)"[^>]*aria-label="Ampliar esta imagem/.exec(figure)![1];
    assert.equal(src, data.channels[id].imageUrl);
    assert.equal(link, src);
    assert.ok(figure.includes(`href="${BGS_ORIGINAL_URLS[id]}"`));
    assert.match(figure, /Cópia arquivada verificada — 17\/03\/2024/);
    assert.match(figure, /object-contain/);
  }
  assert.match(html, /British Geological Survey © UKRI 2024/);
  assert.match(html, /Horário da imagem não informado/);
  const tomsk = /<button[^>]*aria-label="Ampliar esta imagem — Tomsk \/ SOS-70"[^>]*>(.*?)<\/button>/.exec(html)![1];
  assert.match(tomsk, /src="\/api\/spectrogram\/tomsk\?t=123"/);
  assert.match(tomsk, /object-contain/);
  assert.match(html, /<dialog[^>]*aria-label="Ampliação do espectrograma Tomsk \/ SOS-70"/);
  assert.match(html, /Novas imagens dependem de verificação humana/);
  assert.match(html, /As imagens BGS não alimentam as frequências derivadas/);
  assert.match(html, /fonte BGS podem mostrar outro período/);
  assert.doesNotMatch(html, /object-cover|filter:|clip-path|2031|00:00|imagem de ontem|transmissão em tempo real/);
});

test('overview retains verification gates and independent channel/source failures', () => {
  for (const invalid of [{ credit: null }, { observedPeriod: null }, { sha256: 'unapproved' }, { imageUrl: 'https://untrusted.invalid/image.jpg' }]) {
    const data = metadata();
    Object.assign(data.channels.north, invalid);
    const html = render({ status: 'ready', metadata: data });
    assert.doesNotMatch(html, /src="\/api\/bgs\/spectrograms\/north\//);
    assert.match(html, /src="\/api\/bgs\/spectrograms\/east\//);
    assert.match(html, /src="\/api\/spectrogram\/tomsk/);
  }
  const failedImage = render({ status: 'ready', metadata: metadata() }, { north: 'error', east: 'loaded' });
  assert.match(failedImage, /Falha ao carregar esta imagem/);
  assert.match(failedImage, /src="\/api\/bgs\/spectrograms\/east\//);
  assert.match(failedImage, /17\/03\/2024/);
  assert.match(failedImage, /British Geological Survey © UKRI 2024/);
  const bgsFailure = render({ status: 'error' });
  assert.match(bgsFailure, /Falha ao consultar BGS/);
  assert.match(bgsFailure, /src="\/api\/spectrogram\/tomsk/);
  const tomskFailure = render({ status: 'ready', metadata: metadata() }, undefined, true);
  assert.match(tomskFailure, /Tomsk temporariamente indisponível/);
  assert.equal((tomskFailure.match(/data-overview-frame=/g) ?? []).length, 3);
  assert.match(tomskFailure, /src="\/api\/bgs\/spectrograms\/north\//);
  assert.doesNotMatch(tomskFailure, /src="\/api\/spectrogram\/tomsk/);
});

test('overview distinguishes unverified new material from consultation failure while retaining a verified archive', () => {
  for (const error of ['material_unverified', 'upstream_timeout']) {
    const data = metadata();
    data.channels.north.error = error;
    const html = render({ status: 'ready', metadata: data });
    assert.match(html, /Cópia arquivada verificada — 17\/03\/2024/);
    assert.match(html, /Cópia verificada disponível/);
    assert.match(html, error === 'material_unverified' ? /Material novo aguarda verificação/ : /Falha na consulta à origem/);
    assert.match(html, /src="\/api\/bgs\/spectrograms\/north\//);
  }
  const missing = metadata();
  Object.assign(missing.channels.north, { available: false, error: 'material_unverified', imageUrl: null, sha256: null, observedPeriod: null, credit: null });
  assert.match(render({ status: 'ready', metadata: missing }), /Novo material BGS aguardando verificação/);
});

test('Tomsk snapshot preserves the selected proxy response bytes even when the source changes', async () => {
  let calls = 0;
  let sourceBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const fetcher = (async (url, init) => {
    calls++;
    assert.equal(url, '/api/spectrogram/tomsk?t=123');
    assert.ok(init?.signal instanceof AbortSignal);
    return new Response(sourceBytes, { headers: { 'content-type': 'image/jpeg' } });
  }) as typeof fetch;
  const blob = await fetchTomskSnapshot('/api/spectrogram/tomsk?t=123', new AbortController().signal, fetcher);
  const selectedBytes = new Uint8Array(await blob.arrayBuffer());
  sourceBytes = new Uint8Array([1, 2, 3]);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const enlargement = await fetch(objectUrl);
    assert.deepEqual(new Uint8Array(await enlargement.arrayBuffer()), selectedBytes);
    assert.equal(enlargement.headers.get('content-type'), 'image/jpeg');
    assert.equal(calls, 1, 'enlargement does not request the mutable proxy again');
  } finally { URL.revokeObjectURL(objectUrl); }
});

test('Tomsk snapshot failure never creates a decorative fallback', async () => {
  for (const response of [new Response('unavailable', { status: 504 }), new Response('<html>error</html>', { headers: { 'content-type': 'text/html' } })]) {
    await assert.rejects(fetchTomskSnapshot('/api/spectrogram/tomsk?t=123', new AbortController().signal, (async () => response) as typeof fetch), /Tomsk image unavailable/);
  }
});
