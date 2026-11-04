import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fetchTomskSpectrogram, serveTomskSpectrogram } from '../server/services/spectrogram';

// A real, existing JPEG; never used as fallback for the external source.
const jpeg = new Uint8Array(readFileSync(new URL('../public/og-image.jpg', import.meta.url)));
const imageResponse = () => new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg' } });
const source = (factory: () => Response | Promise<Response>) => (async (url: string, options: RequestInit) => {
  assert.equal(url, 'https://sos70.ru/provider.php?file=shm.jpg');
  assert.equal(options.redirect, 'manual');
  return factory();
}) as typeof fetch;

test('fixed upstream returns a bounded JPEG with declared image content', async () => {
  assert.deepEqual(await fetchTomskSpectrogram(source(imageResponse)), Buffer.from(jpeg));
});

test('HTML, wrong magic bytes and truncated images are rejected', async () => {
  for (const response of [
    new Response('<html>blocked</html>', { headers: { 'Content-Type': 'text/html' } }),
    new Response('<html>blocked</html>', { headers: { 'Content-Type': 'image/jpeg' } }),
    new Response(jpeg.slice(0, 4), { headers: { 'Content-Type': 'image/jpeg' } }),
  ]) {
    await assert.rejects(fetchTomskSpectrogram(source(() => response)), { status: 502, code: 'invalid_image' });
  }
});

test('upstream 404, rejection and redirect are distinct from a missing local route', async () => {
  for (const status of [404, 403, 302, 503]) {
    await assert.rejects(fetchTomskSpectrogram(source(() => new Response(null, { status }))), {
      status: 502, code: 'upstream_http_error',
    });
  }
  await assert.rejects(fetchTomskSpectrogram(source(() => { throw new TypeError('network unavailable'); })), {
    status: 502, code: 'upstream_unavailable',
  });
});

test('size cap is enforced from both Content-Length and bytes actually received', async () => {
  for (const response of [
    new Response(jpeg, { headers: { 'Content-Type': 'image/jpeg', 'Content-Length': '999' } }),
    imageResponse(),
  ]) {
    await assert.rejects(fetchTomskSpectrogram(source(() => response), { timeoutMs: 1000, maxBytes: 4 }), {
      status: 502, code: 'image_too_large',
    });
  }
});

test('total timeout applies before headers and while the body is stalled', async () => {
  await assert.rejects(fetchTomskSpectrogram(source(() => new Promise(() => {})), { timeoutMs: 20, maxBytes: 999 }), {
    status: 504, code: 'upstream_timeout',
  });
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({
    start(controller) { controller.enqueue(jpeg.slice(0, 4)); },
    cancel() { cancelled = true; },
  });
  await assert.rejects(fetchTomskSpectrogram(source(() => new Response(body, {
    headers: { 'Content-Type': 'image/jpeg' },
  })), { timeoutMs: 20, maxBytes: 999 }), { status: 504, code: 'upstream_timeout' });
  assert.equal(cancelled, true);
});

test('HTTP handler exposes controlled availability error without upstream details', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = source(() => { throw new Error('private transport details'); });
  const response: any = {
    statusCode: 200,
    status(code: number) { this.statusCode = code; return this; },
    set() { return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  try {
    await serveTomskSpectrogram({} as any, response, () => {});
    assert.equal(response.statusCode, 502);
    assert.equal(response.body.available, false);
    assert.equal(response.body.error, 'upstream_unavailable');
    assert.ok(!JSON.stringify(response.body).includes('private'));
  } finally {
    globalThis.fetch = original;
  }
});
