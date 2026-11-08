import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { decodeJpeg, decodeJpegWhenAvailable } from '../server/services/spectrogram';
import { createBgsSpectrogramService, discoverBgsChannels } from '../server/services/bgs-spectrogram';
import { BGS_ORIGINAL_URLS, BGS_SOURCE_PAGE_URL } from '../shared/bgs';
import type { BgsChannel, BgsObservedPeriod } from '../shared/bgs';

// Existing local JPEGs are synthetic source fixtures here, never live fallbacks.
const first = Buffer.from(readFileSync(new URL('../public/og-image.jpg', import.meta.url)));
const second = Buffer.from(readFileSync(new URL('../public/og-article-1.jpg', import.meta.url)));
const third = Buffer.from(readFileSync(new URL('../public/og-article-2.jpg', import.meta.url)));
const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const html = `<a href="../images/Spectrogram_CH1_23_07_2012.jpg" title="Channel 1 North">Historical example</a>
<a href="../images/currentSpectrogramCH1.jpg" title="Yesterday's spectrogram Channel 1 (North pointing)"><img alt="Channel 1 North"></a>
<a href="../images/currentSpectrogramCH2.jpg" title="Yesterday's spectrogram Channel 2 (East pointing)"><img alt="Channel 2 East"></a>`;
const period: BgsObservedPeriod = { label: 'Fixture verified date', date: '2026-11-05', year: 2026, basis: 'image_verified_by_sha256' };
const registry = { north: { [hash(first)]: period, [hash(second)]: period, [hash(third)]: period }, east: { [hash(second)]: period } };
const NOW = Date.parse('2026-11-06T12:00:00Z');
const DAY = 86_400_000;
const pageResponse = () => new Response(html, { headers: { 'Content-Type': 'text/html' } });
const jpegResponse = (bytes: Buffer) => new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } });
function mockSource(handler?: (url: string) => Response | Promise<Response>) {
  const calls: string[] = [];
  const fetchSource = (async (input: string, options: RequestInit) => {
    calls.push(input);
    assert.equal(options.redirect, 'manual');
    assert.ok([BGS_SOURCE_PAGE_URL, ...Object.values(BGS_ORIGINAL_URLS)].includes(input));
    if (handler) return handler(input);
    return input === BGS_SOURCE_PAGE_URL ? pageResponse() : jpegResponse(input === BGS_ORIGINAL_URLS.north ? first : second);
  }) as typeof fetch;
  return { fetchSource, calls };
}

test('discovery accepts only exact official links with matching channel labels, not examples or arbitrary URLs', () => {
  assert.deepEqual([...discoverBgsChannels(html)].sort(), ['east', 'north']);
  assert.deepEqual([...discoverBgsChannels(`<a href="https://evil.invalid/currentSpectrogramCH1.jpg" title="Channel 1 North">bad</a>
<a href="../images/Spectrogram_CH1_23_07_2012.jpg" title="Channel 1 North">example</a>
<a href="../images/currentSpectrogramCH1.jpg" title="Channel 2 East">mislabeled</a>`) ], []);
  assert.deepEqual([...discoverBgsChannels('<a '.repeat(10000))], [], 'malformed HTML is bounded and does not require backtracking over nested anchors');
});

test('daily snapshot preserves exact bytes, source-derived identity and verified credit; later visitors use memory only', async () => {
  let now = NOW;
  const source = mockSource();
  const service = createBgsSpectrogramService({ archiveDir: null, ...source, now: () => now, verifiedImages: registry });
  const firstMeta = await service.getMetadata();
  assert.equal(source.calls.length, 3);
  for (const channel of ['north', 'east'] as BgsChannel[]) {
    const meta = firstMeta.channels[channel];
    assert.equal(meta.available, true);
    assert.equal(meta.cacheState, 'fresh');
    assert.equal(meta.credit, 'British Geological Survey © UKRI 2026');
    assert.deepEqual(meta.observedPeriod, period);
    assert.equal(meta.checkedAt, new Date(NOW).toISOString());
    assert.equal(meta.nextCheckAt, new Date(NOW + DAY).toISOString());
    assert.equal(meta.originalUrl, BGS_ORIGINAL_URLS[channel]);
    assert.match(meta.imageUrl!, new RegExp(`/api/bgs/spectrograms/${channel}/[a-f0-9]{64}\\.jpg$`));
    assert.deepEqual(await service.getImage(channel, meta.sha256), channel === 'north' ? first : second);
  }
  now += 1000;
  assert.equal((await service.getMetadata()).channels.north.cacheState, 'cached');
  assert.equal(source.calls.length, 3);
  assert.equal(await service.getImage('http://127.0.0.1', hash(first)), null);
  assert.equal(await service.getImage('north', '../secret'), null);
  assert.equal(await service.getImage('east', hash(first)), null);
  assert.equal(source.calls.length, 3);
});

test('concurrent visitors share one page check and two sequential image validations', async () => {
  const source = mockSource();
  const service = createBgsSpectrogramService({ archiveDir: null, ...source, now: () => NOW, verifiedImages: registry });
  const metadata = await Promise.all(Array.from({ length: 6 }, () => service.getMetadata()));
  assert.equal(source.calls.length, 3);
  assert.ok(metadata.every(item => item.channels.north.available && item.channels.east.available));
});

test('failure keeps the last verified bytes/period/credit and imposes a full daily cooldown', async () => {
  let now = NOW, failing = false;
  const source = mockSource(url => failing ? new Response(null, { status: 503 }) : url === BGS_SOURCE_PAGE_URL ? pageResponse() : jpegResponse(url === BGS_ORIGINAL_URLS.north ? first : second));
  const service = createBgsSpectrogramService({ archiveDir: null, ...source, now: () => now, verifiedImages: registry });
  const valid = await service.getMetadata();
  failing = true; now += DAY;
  const stale = await service.getMetadata();
  assert.equal(source.calls.length, 4, 'failed source page must not request image endpoints');
  assert.equal(stale.channels.north.cacheState, 'stale');
  assert.equal(stale.channels.north.error, 'upstream_http_error');
  assert.equal(stale.channels.north.fetchedAt, valid.channels.north.fetchedAt);
  assert.equal(stale.channels.north.sha256, valid.channels.north.sha256);
  assert.deepEqual(stale.channels.north.observedPeriod, valid.channels.north.observedPeriod);
  assert.equal(stale.channels.north.credit, valid.channels.north.credit);
  assert.equal(stale.channels.north.checkedAt, new Date(now).toISOString());
  now += DAY - 1;
  await service.getMetadata();
  assert.equal(source.calls.length, 4, 'no immediate retries or timer polling');
});

test('a new valid JPEG without a verified hash/year never replaces a known credited image', async () => {
  let now = NOW, changed = false;
  const source = mockSource(url => url === BGS_SOURCE_PAGE_URL ? pageResponse() : jpegResponse(url === BGS_ORIGINAL_URLS.north ? changed ? third : first : second));
  const verifiedImages = { north: { [hash(first)]: period }, east: { [hash(second)]: period } };
  const service = createBgsSpectrogramService({ archiveDir: null, ...source, now: () => now, verifiedImages });
  const original = await service.getMetadata();
  changed = true; now += DAY;
  const unknown = await service.getMetadata();
  assert.equal(unknown.channels.north.error, 'material_unverified');
  assert.equal(unknown.channels.north.cacheState, 'stale');
  assert.equal(unknown.channels.north.imageUrl, original.channels.north.imageUrl);
  assert.equal(unknown.channels.north.fetchedAt, original.channels.north.fetchedAt);
  assert.equal(await service.getImage('north', hash(third)), null);
  const cold = await createBgsSpectrogramService({ archiveDir: null, ...source, now: () => now, verifiedImages: {} }).getMetadata();
  assert.equal(cold.channels.north.available, false);
  assert.equal(cold.channels.north.imageUrl, null);
  assert.equal(cold.channels.north.observedPeriod, null);
  assert.equal(cold.channels.north.credit, null);
  assert.equal(cold.channels.north.error, 'material_unverified');
});

test('year and observation period never advance with download time or Last-Modified', async () => {
  const source = mockSource();
  const meta = await createBgsSpectrogramService({ archiveDir: null, ...source, now: () => Date.parse('2028-01-01T12:00:00Z'), verifiedImages: registry }).getMetadata();
  assert.equal(meta.channels.north.credit, 'British Geological Survey © UKRI 2026');
  assert.equal(meta.channels.north.observedPeriod?.date, '2026-11-05');
  assert.match(meta.channels.north.fetchedAt!, /^2028-/);
});

test('one channel may fail without hiding the other and absent channel links are not guessed', async () => {
  const source = mockSource(url => url === BGS_SOURCE_PAGE_URL ? pageResponse() : url === BGS_ORIGINAL_URLS.north ? new Response('blocked', { status: 403 }) : jpegResponse(second));
  const meta = await createBgsSpectrogramService({ archiveDir: null, ...source, now: () => NOW, verifiedImages: registry }).getMetadata();
  assert.equal(meta.channels.north.available, false);
  assert.equal(meta.channels.north.error, 'upstream_http_error');
  assert.equal(meta.channels.east.available, true);
  const missing = mockSource(url => url === BGS_SOURCE_PAGE_URL ? new Response('<p>No official daily links</p>', { headers: { 'Content-Type': 'text/html' } }) : jpegResponse(first));
  const absent = await createBgsSpectrogramService({ archiveDir: null, ...missing, now: () => NOW, verifiedImages: registry }).getMetadata();
  assert.equal(absent.channels.north.error, 'source_link_missing');
  assert.equal(missing.calls.length, 1);
});

test('HTML posing as JPEG, invalid image structure and oversized dimensions remain controlled failures', async () => {
  const frameOffset = first.indexOf(Buffer.from([0xff, 0xc0]));
  const oversized = Buffer.from(first); oversized.writeUInt16BE(8193, frameOffset + 7);
  for (const [body, mime, error] of [
    ['<html>blocked</html>', 'text/html', 'invalid_image'],
    ['<html>blocked</html>', 'image/jpeg', 'invalid_image'],
    [oversized, 'image/jpeg', 'image_dimensions_exceeded'],
  ] as const) {
    const source = mockSource(url => url === BGS_SOURCE_PAGE_URL ? pageResponse() : url === BGS_ORIGINAL_URLS.north ? new Response(body, { headers: { 'Content-Type': mime } }) : jpegResponse(second));
    const meta = await createBgsSpectrogramService({ archiveDir: null, ...source, now: () => NOW, verifiedImages: registry }).getMetadata();
    assert.equal(meta.channels.north.error, error);
    assert.equal(meta.channels.east.available, true);
  }
});

test('redirects are never followed; byte limits apply to declarations and received data', async () => {
  const redirect = mockSource(() => new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/private' } }));
  const blocked = await createBgsSpectrogramService({ archiveDir: null, ...redirect, now: () => NOW }).getMetadata();
  assert.equal(blocked.channels.north.error, 'upstream_redirect');
  assert.equal(redirect.calls.length, 1);
  for (const declared of [false, true]) {
    const source = mockSource(url => url === BGS_SOURCE_PAGE_URL ? pageResponse() : new Response(first, { headers: { 'Content-Type': 'image/jpeg', ...(declared ? { 'Content-Length': '9999999' } : {}) } }));
    const meta = await createBgsSpectrogramService({ archiveDir: null, ...source, now: () => NOW, verifiedImages: registry, limits: { timeoutMs: 8000, htmlMaxBytes: 1024 * 1024, imageMaxBytes: 4 } }).getMetadata();
    assert.equal(meta.channels.north.error, 'image_too_large');
  }
  const source = mockSource();
  const tooLargePage = await createBgsSpectrogramService({ archiveDir: null, ...source, now: () => NOW, verifiedImages: registry, limits: { timeoutMs: 8000, htmlMaxBytes: 4, imageMaxBytes: 5 * 1024 * 1024 } }).getMetadata();
  assert.equal(tooLargePage.channels.north.error, 'source_page_too_large');
  assert.equal(source.calls.length, 1);
});

test('total header/body deadlines are controlled and a failed cold check is cached for24hours', async () => {
  for (const stalledBody of [false, true]) {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(new TextEncoder().encode('<html>')); }, cancel() { cancelled = true; } });
    const source = mockSource(() => stalledBody ? new Response(body, { headers: { 'Content-Type': 'text/html' } }) : new Promise(() => {}));
    const service = createBgsSpectrogramService({ archiveDir: null, ...source, now: () => NOW, limits: { timeoutMs: 20, htmlMaxBytes: 1024 * 1024, imageMaxBytes: 5 * 1024 * 1024 } });
    const meta = await service.getMetadata();
    assert.equal(meta.channels.north.error, 'upstream_timeout');
    assert.equal(meta.channels.north.cacheState, 'unavailable');
    assert.equal(meta.channels.north.nextCheckAt, new Date(NOW + DAY).toISOString());
    await service.getMetadata();
    assert.equal(source.calls.length, 1);
    if (stalledBody) assert.equal(cancelled, true);
  }
});

test('hashed byte URLs retain at most the current and previous verified version per channel', async () => {
  let now = NOW, current = first;
  const source = mockSource(url => url === BGS_SOURCE_PAGE_URL ? pageResponse() : jpegResponse(url === BGS_ORIGINAL_URLS.north ? current : second));
  const service = createBgsSpectrogramService({ archiveDir: null, ...source, now: () => now, verifiedImages: registry });
  await service.getMetadata(); current = second; now += DAY; await service.getMetadata();
  assert.deepEqual(await service.getImage('north', hash(first)), first);
  current = third; now += DAY; await service.getMetadata();
  assert.equal(await service.getImage('north', hash(first)), null);
  assert.deepEqual(await service.getImage('north', hash(second)), second);
  assert.deepEqual(await service.getImage('north', hash(third)), third);
});


test('BGS waits for a busy Tomsk decoder without refetching and both channels still validate', async () => {
  const activeDecoder = decodeJpeg(first, new AbortController().signal);
  const source = mockSource();
  const service = createBgsSpectrogramService({ archiveDir: null, ...source, now: () => NOW, verifiedImages: registry });
  const [_, meta] = await Promise.all([activeDecoder, service.getMetadata()]);
  assert.equal(meta.channels.north.available, true);
  assert.equal(meta.channels.east.available, true);
  assert.equal(meta.channels.north.error, null);
  assert.equal(source.calls.length, 3, 'wait must not refetch headers or body');
});

test('a queued validation aborts within the same deadline and releases its waiting slot', async () => {
  const activeDecoder = decodeJpeg(first, new AbortController().signal);
  const controllers = Array.from({ length: 8 }, () => new AbortController());
  const waiting = controllers.map(controller => decodeJpegWhenAvailable(second, controller.signal));
  const overflow = decodeJpegWhenAvailable(second, new AbortController().signal);
  await assert.rejects(overflow, { code: 'decoder_busy', status: 503 });
  for (const controller of controllers) controller.abort();
  for (const result of await Promise.allSettled(waiting)) {
    assert.equal(result.status, 'rejected');
    assert.equal((result as PromiseRejectedResult).reason.code, 'image_validation_timeout');
  }
  await activeDecoder;
  await decodeJpegWhenAvailable(second, new AbortController().signal);
});
