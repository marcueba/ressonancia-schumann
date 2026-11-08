import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BgsSpectrogramView, fetchBgsSpectrograms } from '../src/components/BgsSpectrogramPanel';
import type { BgsPanelState, BgsImageState } from '../src/components/BgsSpectrogramPanel';
import { BGS_ORIGINAL_URLS, BGS_SOURCE_PAGE_URL, BGS_STATION_ID } from '../shared/bgs';
import type { BgsChannel, BgsChannelMetadata, BgsSpectrogramsMetadata } from '../shared/bgs';

// Synthetic metadata only; no fixture is imported by production code.
function channel(id: BgsChannel): BgsChannelMetadata {
  const sha256 = (id === 'north' ? 'a' : 'b').repeat(64);
  return {
    channel: id, available: true, imageOrigin: 'remote',
    imageUrl: `/api/bgs/spectrograms/${id}/${sha256}.jpg`,
    originalUrl: BGS_ORIGINAL_URLS[id], sha256,
    fetchedAt: '2024-03-18T10:00:00Z', checkedAt: '2031-01-02T08:00:00Z', nextCheckAt: '2031-01-03T08:00:00Z',
    cacheState: 'cached', error: null,
    observedPeriod: { label: '17/03/2024 (data inscrita na imagem)', date: '2024-03-17', year: 2024, basis: 'image_verified_by_sha256',
      ...(id === 'east' ? { note: 'Nota sintética do canal Leste.' } : {}) },
    credit: 'British Geological Survey © UKRI 2024',
  };
}
function metadata(): BgsSpectrogramsMetadata {
  return { stationId: BGS_STATION_ID, sourcePageUrl: BGS_SOURCE_PAGE_URL, channels: { north: channel('north'), east: channel('east') } };
}
function render(state: BgsPanelState, selectedChannel: BgsChannel = 'north', imageState: BgsImageState = 'loaded') {
  return renderToStaticMarkup(createElement(BgsSpectrogramView, { state, selectedChannel, imageState, onSelectChannel() {} }));
}

test('BGS loading and query failure stay explicit and independent from Tomsk', () => {
  const loading = render({ status: 'loading' });
  assert.match(loading, /Espectrogramas ELF — Eskdalemuir \/ BGS/);
  assert.match(loading, /role="status"/);
  assert.match(loading, /Observações diárias, não em tempo real/);
  assert.match(loading, /não correspondem à estação Tomsk/);
  assert.match(loading, /aria-label="Canais do espectrograma BGS"/);
  assert.match(loading, /aria-pressed="true"/);
  assert.doesNotMatch(loading, /<img|F1|F2|F3|OGL/);
  const error = render({ status: 'error' });
  assert.match(error, /role="alert"/);
  assert.match(error, /Não foi possível consultar os espectrogramas BGS/);
  assert.match(error, /href="https:\/\/geomag.bgs.ac.uk\/research\/inductioncoils.html"/);
});

test('each selected channel embeds only its verified local image, completely and without recoloring', () => {
  for (const selected of ['north', 'east'] as const) {
    const html = render({ status: 'ready', metadata: metadata() }, selected);
    assert.match(html, new RegExp(`src="/api/bgs/spectrograms/${selected}/`));
    assert.doesNotMatch(html, new RegExp(`src="/api/bgs/spectrograms/${selected === 'north' ? 'east' : 'north'}/`));
    assert.equal((html.match(/<img /g) ?? []).length, 1);
    assert.match(html, /class="block h-auto w-full max-w-full"/);
    assert.doesNotMatch(html, /object-cover|filter:|clip-path|aspect-ratio|overflow-x-hidden|height="/);
    assert.match(html, /target="_blank" rel="noopener noreferrer"/);
    assert.ok(html.includes(`href="${BGS_ORIGINAL_URLS[selected]}"`));
    assert.match(html, /British Geological Survey © UKRI 2024/);
    assert.match(html, /uso não comercial/);
    assert.match(html, /Uso comercial exige autorização separada/);
    if (selected === 'east') assert.match(html, /Nota sintética do canal Leste/);
  }
});

test('the material period and credit year never become the check/download time or viewer year', () => {
  const originalTZ = process.env.TZ;
  try {
    for (const zone of ['UTC', 'Asia/Tokyo', 'America/Los_Angeles']) {
      process.env.TZ = zone;
      const html = render({ status: 'ready', metadata: metadata() });
      assert.match(html, /Período identificado na imagem:<\/strong> 17\/03\/2024/);
      assert.match(html, /Última consulta à fonte<\/dt><dd>02\/01\/2031, 08:00:00 UTC/);
      assert.match(html, /Última imagem válida obtida em<\/dt><dd>18\/03\/2024, 10:00:00 UTC/);
      assert.match(html, /British Geological Survey © UKRI 2024/);
      assert.doesNotMatch(html, /UKRI 2031|imagem de ontem|tempo real\.<\/p>/);
      assert.match(html, /download não é o horário da observação/);
    }
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
});

test('an unverified new material cannot display; a verified stale image retains its real period and attribution', () => {
  const data = metadata();
  Object.assign(data.channels.north, { available: false, imageUrl: null, sha256: null, credit: null, observedPeriod: null, cacheState: 'unavailable', error: 'material_unverified' });
  const unavailable = render({ status: 'ready', metadata: data });
  assert.match(unavailable, /atualização aguarda verificação do período e do ano/);
  assert.doesNotMatch(unavailable, /<img|UKRI \d{4}|\[year\]/);
  const east = render({ status: 'ready', metadata: data }, 'east');
  assert.match(east, /<img/);
  assert.match(east, /Canal Leste/);
  const staleData = metadata();
  Object.assign(staleData.channels.north, { cacheState: 'stale', error: 'material_unverified' });
  const stale = render({ status: 'ready', metadata: staleData });
  assert.match(stale, /Novo material da fonte BGS aguarda verificação do período e do ano/);
  assert.match(stale, /A imagem verificada permanece em cache/);
  assert.match(stale, /17\/03\/2024/);
  assert.match(stale, /British Geological Survey © UKRI 2024/);
  assert.match(stale, /<img/);
});

test('missing verification/attribution or mismatched channel URL never embeds an image', () => {
  for (const invalid of [
    { credit: null }, { observedPeriod: null }, { sha256: 'invalid' }, { imageOrigin: null },
    { imageUrl: `/api/bgs/spectrograms/east/${'a'.repeat(64)}.jpg` },
    { imageUrl: 'https://untrusted.invalid/image.jpg' },
    { credit: 'British Geological Survey © UKRI 2031' },
  ]) {
    const data = metadata();
    Object.assign(data.channels.north, invalid);
    assert.doesNotMatch(render({ status: 'ready', metadata: data }), /<img/);
  }
});

test('individual image-load failure does not erase metadata or disable the other channel', () => {
  const data = metadata();
  const north = render({ status: 'ready', metadata: data }, 'north', 'error');
  assert.match(north, /Não foi possível carregar a imagem deste canal/);
  assert.match(north, /17\/03\/2024/);
  assert.match(north, /British Geological Survey © UKRI 2024/);
  assert.doesNotMatch(north, /<img|original continua acessível|fonte continua acessível/);
  assert.ok(north.includes(`href="${data.channels.north.imageUrl}"`));
  assert.match(north, /Ampliar esta imagem/);
  assert.match(north, /Ver imagem na fonte BGS/);
  assert.match(render({ status: 'ready', metadata: data }, 'east'), /src="\/api\/bgs\/spectrograms\/east\//);
});

test('metadata request is bounded, makes one fetch without retry, and releases a failed response', async () => {
  let count = 0;
  let released = 0;
  const failing = (async (url, init) => {
    count++;
    assert.equal(url, '/api/bgs/spectrograms');
    assert.ok(init?.signal instanceof AbortSignal);
    return new Response(new ReadableStream({ cancel() { released++; } }), { status: 503 });
  }) as typeof fetch;
  await assert.rejects(fetchBgsSpectrograms(failing), /BGS metadata unavailable/);
  assert.equal(count, 1);
  assert.equal(released, 1);
  const good = (async () => new Response(JSON.stringify(metadata()), { status: 200 })) as typeof fetch;
  assert.equal((await fetchBgsSpectrograms(good)).channels.east.channel, 'east');
  const wrong = metadata();
  wrong.channels.north.channel = 'east';
  await assert.rejects(fetchBgsSpectrograms((async () => new Response(JSON.stringify(wrong))) as typeof fetch), /Invalid BGS metadata/);
});


test('archive copies keep their verified period and attribution with no invented download time', () => {
  for (const selected of ['north', 'east'] as const) {
    const data = metadata();
    Object.assign(data.channels[selected], { imageOrigin: 'archive', fetchedAt: null, cacheState: 'cached' });
    const html = render({ status: 'ready', metadata: data }, selected);
    assert.match(html, /Cópia arquivada verificada — 17\/03\/2024 \(data inscrita na imagem\)/);
    assert.match(html, /data-bgs-image-origin="archive"/);
    assert.match(html, /British Geological Survey © UKRI 2024/);
    assert.match(html, /Última consulta à fonte<\/dt><dd>02\/01\/2031, 08:00:00 UTC/);
    assert.doesNotMatch(html, /Última imagem válida obtida em|18\/03\/2024|imagem de ontem|imagem atual|última imagem BGS/);
    const imageSrc = /<img\b[^>]*src="([^"]+)"/.exec(html)?.[1];
    const enlargedHref = /<a\b[^>]*href="([^"]+)"[^>]*>Ampliar esta imagem<\/a>/.exec(html)?.[1];
    const sourceHref = /<a\b[^>]*href="([^"]+)"[^>]*>Ver imagem na fonte BGS<\/a>/.exec(html)?.[1];
    assert.equal(imageSrc, data.channels[selected].imageUrl);
    assert.equal(enlargedHref, imageSrc, 'enlargement opens exactly the displayed content-addressed image');
    assert.equal(sourceHref, BGS_ORIGINAL_URLS[selected]);
    assert.notEqual(sourceHref, enlargedHref);
    assert.match(html, /fonte BGS pode apresentar uma imagem de outro período/);
  }
});

test('source failure and unverified new material stay distinct from an available archived copy', () => {
  for (const error of ['upstream_timeout', 'material_unverified']) {
    const data = metadata();
    Object.assign(data.channels.north, { imageOrigin: 'archive', fetchedAt: null, cacheState: 'stale', error });
    const html = render({ status: 'ready', metadata: data });
    assert.match(html, /Cópia arquivada verificada — 17\/03\/2024/);
    assert.match(html, /A cópia arquivada permanece disponível/);
    assert.match(html, /<img/);
    assert.match(html, /British Geological Survey © UKRI 2024/);
    assert.doesNotMatch(html, /Imagem indisponível|Última imagem válida obtida em/);
    if (error === 'material_unverified') {
      assert.match(html, /Novo material da fonte BGS aguarda verificação do período e do ano/);
      assert.doesNotMatch(html, /consulta à fonte BGS não forneceu/);
    } else {
      assert.match(html, /A consulta à fonte BGS não forneceu uma atualização válida/);
      assert.doesNotMatch(html, /Novo material da fonte BGS/);
    }
  }
});
