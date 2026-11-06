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

test('concurrent requests cannot multiply the decoder memory budget', async () => {
  const outcomes = await Promise.allSettled([
    fetchTomskSpectrogram(source(imageResponse)),
    fetchTomskSpectrogram(source(imageResponse)),
  ]);
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
  const rejected = outcomes.find(x => x.status === 'rejected') as PromiseRejectedResult;
  assert.equal(rejected.reason.status, 503);
  assert.equal(rejected.reason.code, 'decoder_busy');
});

test('a valid JPEG with a wrong MIME remains a controlled rejection until the real source proves that mismatch', async () => {
  for (const mime of ['text/html', 'application/octet-stream']) {
    await assert.rejects(fetchTomskSpectrogram(source(() => new Response(jpeg, {
      headers: { 'Content-Type': mime },
    }))), { status: 502, code: 'invalid_image' });
  }
});

test('HTML, wrong magic bytes and truncated images are rejected', async () => {
  for (const response of [
    new Response('<html>blocked</html>', { headers: { 'Content-Type': 'text/html' } }),
    new Response('<html>blocked</html>', { headers: { 'Content-Type': 'image/jpeg' } }),
    new Response(jpeg.slice(0, 4), { headers: { 'Content-Type': 'image/jpeg' } }),
    // This six-byte fake passed the previous SOI/EOI-only validation.
    new Response(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0xff, 0xd9]), { headers: { 'Content-Type': 'image/jpeg' } }),
  ]) {
    await assert.rejects(fetchTomskSpectrogram(source(() => response)), { status: 502, code: 'invalid_image' });
  }
});

test('a truncated JPEG with an appended EOI still must really decode', async () => {
  const truncated = Buffer.concat([jpeg.slice(0, Math.floor(jpeg.length / 2)), Buffer.from([0xff, 0xd9])]);
  await assert.rejects(fetchTomskSpectrogram(source(() => new Response(truncated, {
    headers: { 'Content-Type': 'image/jpeg' },
  }))), { status: 502, code: 'invalid_image' });
});

test('dimensions and pixel count are bounded before decoder allocation', async () => {
  const frameOffset = Buffer.from(jpeg).indexOf(Buffer.from([0xff, 0xc0]));
  assert.ok(frameOffset > 0, 'fixture must contain a baseline SOF frame');
  for (const [width, height] of [[8193, 1], [1, 8193], [4096, 4096]]) {
    const oversized = Buffer.from(jpeg);
    oversized.writeUInt16BE(height, frameOffset + 5);
    oversized.writeUInt16BE(width, frameOffset + 7);
    await assert.rejects(fetchTomskSpectrogram(source(() => new Response(oversized, {
      headers: { 'Content-Type': 'image/jpeg' },
    }))), { status: 502, code: 'image_dimensions_exceeded' });
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

test('the total deadline also terminates a real decoder worker without blocking the event loop', async () => {
  const started = performance.now();
  await assert.rejects(fetchTomskSpectrogram(source(imageResponse), { timeoutMs: 1, maxBytes: 5 * 1024 * 1024 }), {
    status: 504, code: 'image_validation_timeout',
  });
  assert.ok(performance.now() - started < 1000, 'worker should not hold up the deadline');
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
