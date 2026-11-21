import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { getEventListeners } from 'node:events';
import type { Server } from 'node:http';
import type { WorkerOptions } from 'node:worker_threads';
import express from 'express';
import {
  createTomskSpectrogramHandler,
  createTomskSpectrogramService,
  decodeJpeg,
  decodeJpegWhenAvailable,
  fetchTomskSpectrogram,
  type TomskSpectrogramService,
} from '../server/services/spectrogram';
import { createBgsSpectrogramService } from '../server/services/bgs-spectrogram';
import { BGS_ORIGINAL_URLS, BGS_SOURCE_PAGE_URL } from '../shared/bgs';
import { createHash } from 'node:crypto';

// All images/sources in this file are isolated fixtures, never live fallbacks.
const bytes = new Uint8Array(readFileSync(new URL('../public/og-image.jpg', import.meta.url)));
const jpeg = Buffer.from(bytes);
const imageResponse = () => new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } });
const cancelled = { status: 499, code: 'request_cancelled' };
const nativeFetch = globalThis.fetch;

function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function source(read: (signal: AbortSignal) => Response | Promise<Response>): typeof fetch {
  return (async (url, options) => {
    assert.equal(String(url), 'https://sos70.ru/provider.php?file=shm.jpg');
    assert.equal(options?.redirect, 'manual');
    assert.ok(options?.signal instanceof AbortSignal);
    return read(options.signal);
  }) as typeof fetch;
}

/** Observe real worker construction/exit only in this isolated test process. */
function traceWorkers() {
  const module = createRequire(import.meta.url)('node:worker_threads') as typeof import('node:worker_threads');
  const NativeWorker = module.Worker;
  const state = { created: 0, active: 0, peak: 0 };
  const starts = new Map<number, ReturnType<typeof deferred<void>>>();
  class TracedWorker extends NativeWorker {
    constructor(filename: string | URL, options?: WorkerOptions) {
      super(filename, options);
      state.created++;
      state.active++;
      state.peak = Math.max(state.peak, state.active);
      this.once('exit', () => { state.active--; });
      starts.get(state.created)?.resolve();
    }
  }
  module.Worker = TracedWorker;
  syncBuiltinESMExports();
  return {
    state,
    started(number = 1) {
      if (state.created >= number) return Promise.resolve();
      const waiting = deferred<void>();
      starts.set(number, waiting);
      return waiting.promise;
    },
    restore() { module.Worker = NativeWorker; syncBuiltinESMExports(); },
  };
}

/** The source has already received the inner signal before its decoder queue listener is registered. */
function observeNextAbortListener(signal: AbortSignal) {
  const added = deferred<void>();
  const original = signal.addEventListener;
  Object.defineProperty(signal, 'addEventListener', {
    configurable: true,
    value(type: string, listener: EventListenerOrEventListenerObject | null, options?: boolean | AddEventListenerOptions) {
      original.call(signal, type, listener, options);
      if (type === 'abort') added.resolve();
    },
  });
  return { added: added.promise, restore() { delete (signal as any).addEventListener; } };
}

async function localServer(service: TomskSpectrogramService) {
  const app = express();
  app.get('/api/spectrogram/tomsk', createTomskSpectrogramHandler(service));
  const server = await new Promise<Server>((resolve, reject) => {
    const listening = app.listen(0, '127.0.0.1', () => { listening.off('error', reject); resolve(listening); });
    listening.once('error', reject);
  });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return {
    url: `http://127.0.0.1:${address.port}/api/spectrogram/tomsk`,
    async close() { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); },
  };
}

function assertJPEG(response: Response) {
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('cache-control'), 'public, max-age=300');
}

test('Tomsk waits for an occupied decoder and preserves one-worker admission', { timeout: 30000 }, async () => {
  const trace = traceWorkers();
  try {
    const owner = decodeJpeg(jpeg, new AbortController().signal);
    const image = fetchTomskSpectrogram(source(imageResponse));
    await Promise.all([owner, image.then(value => assert.deepEqual(value, jpeg))]);
    assert.equal(trace.state.created, 2, 'owner and Tomsk each fully decode once');
    assert.equal(trace.state.peak, 1);
    assert.equal(trace.state.active, 0);
  } finally { trace.restore(); }
});

test('simultaneous HTTP consumers share one fetch/decode and receive independent identical response bodies', { timeout: 30000 }, async t => {
  const trace = traceWorkers();
  t.after(() => trace.restore());
  const release = deferred<void>(), joined = deferred<void>();
  let reads = 0, consumers = 0;
  const service = createTomskSpectrogramService({ fetchSource: source(async () => { reads++; await release.promise; return imageResponse(); }) });
  const server = await localServer({ getImage(signal) { if (++consumers === 2) joined.resolve(); return service.getImage(signal); } });
  try {
    const first = nativeFetch(server.url), second = nativeFetch(server.url);
    await joined.promise;
    assert.equal(reads, 1);
    release.resolve();
    const responses = await Promise.all([first, second]);
    for (const response of responses) assertJPEG(response);
    const bodies = await Promise.all(responses.map(async response => Buffer.from(await response.arrayBuffer())));
    assert.deepEqual(bodies, [jpeg, jpeg]);
    assert.equal(trace.state.created, 1);
    assert.equal(trace.state.peak, 1);
    assert.equal(trace.state.active, 0);
    const later = await nativeFetch(server.url);
    assertJPEG(later);
    assert.deepEqual(Buffer.from(await later.arrayBuffer()), jpeg);
    assert.equal(reads, 2, 'a completed result is not cached by the service');
    assert.equal(trace.state.created, 2);
  } finally { release.resolve(); await server.close(); trace.restore(); }
});

test('disconnecting one HTTP consumer leaves the shared operation alive for the remaining response', { timeout: 30000 }, async t => {
  const trace = traceWorkers();
  t.after(() => trace.restore());
  const release = deferred<void>(), joined = deferred<void>(), firstDetached = deferred<void>();
  let calls = 0, count = 0;
  let underlying!: AbortSignal;
  const signals: AbortSignal[] = [];
  const service = createTomskSpectrogramService({ fetchSource: source(async signal => { calls++; underlying = signal; await release.promise; return imageResponse(); }) });
  const server = await localServer({ getImage(signal) {
    assert.ok(signal);
    signals.push(signal);
    const ordinal = ++count;
    const onAbort = () => { if (ordinal === 1) firstDetached.resolve(); };
    signal.addEventListener('abort', onAbort, { once: true });
    if (count === 2) joined.resolve();
    return service.getImage(signal).finally(() => signal.removeEventListener('abort', onAbort));
  } });
  const firstController = new AbortController();
  try {
    const first = nativeFetch(server.url, { signal: firstController.signal });
    const firstRejected = assert.rejects(first, { name: 'AbortError' });
    const second = nativeFetch(server.url);
    await joined.promise;
    firstController.abort();
    await Promise.all([firstRejected, firstDetached.promise]);
    assert.equal(underlying.aborted, false, 'another consumer still needs the operation');
    release.resolve();
    const response = await second;
    assertJPEG(response);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), jpeg);
    assert.equal(calls, 1);
    assert.equal(trace.state.created, 1);
    assert.equal(trace.state.active, 0);
    for (const signal of signals) assert.equal(getEventListeners(signal, 'abort').length, 0);
  } finally { release.resolve(); firstController.abort(); await server.close(); trace.restore(); }
});

test('cancelling all consumers while queued removes that waiter and allows a fresh operation', { timeout: 30000 }, async () => {
  const trace = traceWorkers();
  const first = new AbortController(), second = new AbortController();
  const observed = deferred<ReturnType<typeof observeNextAbortListener>>();
  let calls = 0, underlying!: AbortSignal;
  const service = createTomskSpectrogramService({ fetchSource: source(signal => {
    calls++;
    if (calls === 1) { underlying = signal; observed.resolve(observeNextAbortListener(signal)); }
    return imageResponse();
  }) });
  const owner = decodeJpeg(jpeg, new AbortController().signal);
  try {
    const a = service.getImage(first.signal), b = service.getImage(second.signal);
    const rejectedA = assert.rejects(a, cancelled), rejectedB = assert.rejects(b, cancelled);
    const watch = await observed.promise;
    await watch.added;
    assert.equal(trace.state.created, 1, 'Tomsk is waiting behind the existing decoder');
    first.abort();
    assert.equal(underlying.aborted, false);
    second.abort();
    await Promise.all([rejectedA, rejectedB]);
    assert.equal(underlying.aborted, true);
    watch.restore();
    const next = service.getImage();
    await Promise.all([owner, next.then(value => assert.deepEqual(value, jpeg))]);
    assert.equal(calls, 2);
    assert.equal(trace.state.created, 2, 'cancelled queued work never created a worker');
    assert.equal(trace.state.peak, 1);
    assert.equal(trace.state.active, 0);
    assert.equal(getEventListeners(first.signal, 'abort').length, 0);
    assert.equal(getEventListeners(second.signal, 'abort').length, 0);
    assert.equal(getEventListeners(underlying, 'abort').length, 0);
  } finally { first.abort(); second.abort(); await owner; trace.restore(); }
});

test('cancelling every consumer during decoding terminates the worker and a later request succeeds', { timeout: 30000 }, async () => {
  const trace = traceWorkers();
  const first = new AbortController(), second = new AbortController();
  let calls = 0, underlying!: AbortSignal;
  const service = createTomskSpectrogramService({ fetchSource: source(signal => { calls++; if (calls === 1) underlying = signal; return imageResponse(); }) });
  try {
    const a = service.getImage(first.signal), b = service.getImage(second.signal);
    const rejectedA = assert.rejects(a, cancelled), rejectedB = assert.rejects(b, cancelled);
    await trace.started();
    first.abort();
    assert.equal(underlying.aborted, false);
    second.abort();
    await Promise.all([rejectedA, rejectedB]);
    assert.equal(underlying.aborted, true);
    assert.deepEqual(await service.getImage(), jpeg);
    assert.equal(calls, 2);
    assert.equal(trace.state.created, 2);
    assert.equal(trace.state.peak, 1, 'replacement waits until the previous worker really exits');
    assert.equal(trace.state.active, 0);
    for (const signal of [first.signal, second.signal, underlying]) assert.equal(getEventListeners(signal, 'abort').length, 0);
  } finally { first.abort(); second.abort(); trace.restore(); }
});

test('a shared invalid result is discarded and the same service can validate the next attempt', { timeout: 30000 }, async () => {
  const release = deferred<void>();
  let calls = 0, invalid = true;
  const service = createTomskSpectrogramService({ fetchSource: source(async () => { calls++; await release.promise; return invalid ? new Response('<html>error</html>', { headers: { 'Content-Type': 'text/html' } }) : imageResponse(); }) });
  const a = service.getImage(), b = service.getImage();
  const rejectedA = assert.rejects(a, { status: 502, code: 'invalid_image' });
  const rejectedB = assert.rejects(b, { status: 502, code: 'invalid_image' });
  release.resolve();
  await Promise.all([rejectedA, rejectedB]);
  assert.equal(calls, 1);
  invalid = false;
  assert.deepEqual(await service.getImage(), jpeg);
  assert.equal(calls, 2, 'a rejected flight is not retained');
});

test('late consumers inherit the original deadline and a timed-out flight does not block retry', { timeout: 30000 }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let calls = 0, stalled = true, underlying!: AbortSignal;
  const signals: AbortSignal[] = [];
  const service = createTomskSpectrogramService({ fetchSource: source(signal => {
    calls++; underlying = signal; signals.push(signal);
    return stalled ? new Promise<Response>(() => {}) : imageResponse();
  }) });
  const first = new AbortController(), second = new AbortController();
  try {
    const a = service.getImage(first.signal);
    const rejectedA = assert.rejects(a, { status: 504, code: 'upstream_timeout' });
    t.mock.timers.tick(6000);
    const b = service.getImage(second.signal);
    const rejectedB = assert.rejects(b, { status: 504, code: 'upstream_timeout' });
    t.mock.timers.tick(1999);
    assert.equal(underlying.aborted, false);
    t.mock.timers.tick(1);
    await Promise.all([rejectedA, rejectedB]);
    assert.equal(calls, 1);
    assert.equal(underlying.aborted, true, 'both consumers terminate at the first operation\'s 8000ms deadline');
    for (const signal of [first.signal, second.signal, ...signals]) assert.equal(getEventListeners(signal, 'abort').length, 0);
    t.mock.timers.reset();
    stalled = false;
    assert.deepEqual(await service.getImage(), jpeg);
    assert.equal(calls, 2);
    assert.equal(signals[1].aborted, false);
    assert.equal(getEventListeners(signals[1], 'abort').length, 0);
  } finally { first.abort(); second.abort(); t.mock.timers.reset(); }
});

test('a full decoder queue still returns controlled capacity failure and then recovers', { timeout: 30000 }, async () => {
  const owner = decodeJpeg(jpeg, new AbortController().signal);
  const queued = Array.from({ length: 8 }, () => new AbortController());
  const waiting = queued.map(controller => decodeJpegWhenAvailable(jpeg, controller.signal));
  const waitingHandled = Promise.allSettled(waiting);
  let calls = 0;
  const service = createTomskSpectrogramService({ fetchSource: source(() => { calls++; return imageResponse(); }) });
  try {
    await assert.rejects(service.getImage(), { status: 503, code: 'decoder_busy' });
    assert.equal(calls, 1);
    for (const controller of queued) controller.abort();
    const outcomes = await waitingHandled;
    for (const outcome of outcomes) { assert.equal(outcome.status, 'rejected'); if (outcome.status === 'rejected') assert.equal(outcome.reason.code, 'image_validation_timeout'); }
    await owner;
    assert.deepEqual(await service.getImage(), jpeg);
    assert.equal(calls, 2);
  } finally { for (const controller of queued) controller.abort(); await waitingHandled; await owner; }
});

test('the existing overall deadline includes time spent waiting in the decoder queue', { timeout: 30000 }, async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const trace = traceWorkers();
  const observed = deferred<ReturnType<typeof observeNextAbortListener>>();
  const service = createTomskSpectrogramService({ fetchSource: source(signal => { observed.resolve(observeNextAbortListener(signal)); return imageResponse(); }) });
  const owner = decodeJpeg(jpeg, new AbortController().signal);
  try {
    const request = service.getImage();
    const rejected = assert.rejects(request, { status: 504, code: 'image_validation_timeout' });
    const watch = await observed.promise;
    await watch.added;
    assert.equal(trace.state.created, 1);
    t.mock.timers.tick(8000);
    await rejected;
    watch.restore();
    t.mock.timers.reset();
    await owner;
    assert.deepEqual(await service.getImage(), jpeg);
    assert.equal(trace.state.created, 2, 'expired queued work did not create a worker');
    assert.equal(trace.state.peak, 1);
    assert.equal(trace.state.active, 0);
  } finally { t.mock.timers.reset(); await owner; trace.restore(); }
});

test('Tomsk and the BGS service both progress through the unchanged global decoder queue', { timeout: 30000 }, async () => {
  const trace = traceWorkers();
  const releaseTomsk = deferred<void>();
  const hash = createHash('sha256').update(jpeg).digest('hex');
  const period = { label: 'Isolated test period', date: '2026-11-05', year: 2026, basis: 'image_verified_by_sha256' as const };
  const html = '<a href="../images/currentSpectrogramCH1.jpg" title="Channel 1 North">N</a><a href="../images/currentSpectrogramCH2.jpg" title="Channel 2 East">E</a>';
  let bgsCalls = 0, tomskCalls = 0;
  const bgs = createBgsSpectrogramService({ archiveDir: null, verifiedImages: { north: { [hash]: period }, east: { [hash]: period } },
    fetchSource: (async (url, options) => { bgsCalls++; assert.equal(options?.redirect, 'manual'); assert.ok([BGS_SOURCE_PAGE_URL, ...Object.values(BGS_ORIGINAL_URLS)].includes(String(url))); return String(url) === BGS_SOURCE_PAGE_URL ? new Response(html, { headers: { 'Content-Type': 'text/html' } }) : imageResponse(); }) as typeof fetch,
  });
  const tomsk = createTomskSpectrogramService({ fetchSource: source(async () => { tomskCalls++; await releaseTomsk.promise; return imageResponse(); }) });
  try {
    const pendingTomsk = tomsk.getImage();
    const pendingBgs = bgs.getMetadata();
    await trace.started();
    releaseTomsk.resolve();
    const [image, metadata] = await Promise.all([pendingTomsk, pendingBgs]);
    assert.deepEqual(image, jpeg);
    assert.equal(metadata.channels.north.available, true);
    assert.equal(metadata.channels.east.available, true);
    assert.equal(metadata.channels.north.error, null);
    assert.equal(metadata.channels.east.error, null);
    assert.equal(tomskCalls, 1);
    assert.equal(bgsCalls, 3);
    assert.equal(trace.state.created, 3);
    assert.equal(trace.state.peak, 1);
    assert.equal(trace.state.active, 0);
  } finally { releaseTomsk.resolve(); trace.restore(); }
});

test('disconnecting all HTTP consumers aborts pending upstream work and a later HTTP request succeeds', { timeout: 30000 }, async () => {
  const joined = deferred<void>(), upstreamAborted = deferred<void>();
  let calls = 0, consumers = 0, hold = true;
  const service = createTomskSpectrogramService({ fetchSource: source(signal => {
    calls++;
    if (!hold) return imageResponse();
    return new Promise<Response>((_resolve, reject) => signal.addEventListener('abort', () => { upstreamAborted.resolve(); reject(signal.reason); }, { once: true }));
  }) });
  const server = await localServer({ getImage(signal) { if (++consumers === 2) joined.resolve(); return service.getImage(signal); } });
  const first = new AbortController(), second = new AbortController();
  try {
    const a = nativeFetch(server.url, { signal: first.signal }), b = nativeFetch(server.url, { signal: second.signal });
    const rejectedA = assert.rejects(a, { name: 'AbortError' }), rejectedB = assert.rejects(b, { name: 'AbortError' });
    await joined.promise;
    first.abort(); second.abort();
    await Promise.all([rejectedA, rejectedB, upstreamAborted.promise]);
    assert.equal(calls, 1);
    hold = false;
    const response = await nativeFetch(server.url);
    assertJPEG(response);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), jpeg);
    assert.equal(calls, 2);
  } finally { first.abort(); second.abort(); await server.close(); }
});

test('an already-cancelled consumer does not start or join work', { timeout: 30000 }, async () => {
  const controller = new AbortController();controller.abort();
  let calls = 0;
  const service = createTomskSpectrogramService({ fetchSource: source(() => { calls++; return imageResponse(); }) });
  await assert.rejects(service.getImage(controller.signal), cancelled);
  assert.equal(calls, 0);
  assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
  assert.deepEqual(await service.getImage(), jpeg);
  assert.equal(calls, 1);
});

test('late headers after abandonment or timeout are cancelled without erasing a replacement flight', { timeout: 30000 }, async t => {
  for (const mode of ['cancelled', 'timed-out'] as const) {
    const late = deferred<Response>(), replacement = deferred<Response>(), cancelledBody = deferred<void>();
    const controller = new AbortController();
    let calls = 0, bodyCancelCount = 0;
    const service = createTomskSpectrogramService({ fetchSource: source(() => ++calls === 1 ? late.promise : replacement.promise) });
    if (mode === 'timed-out') t.mock.timers.enable({ apis: ['setTimeout'] });
    try {
      const abandoned = service.getImage(controller.signal);
      const rejected = assert.rejects(abandoned, mode === 'cancelled' ? cancelled : { status: 504, code: 'upstream_timeout' });
      if (mode === 'cancelled') controller.abort();
      else t.mock.timers.tick(8000);
      await rejected;
      if (mode === 'timed-out') t.mock.timers.reset();
      const next = service.getImage();
      const unconsumed = new ReadableStream<Uint8Array>({ cancel() { bodyCancelCount++; cancelledBody.resolve(); } });
      late.resolve(new Response(unconsumed, { headers: { 'Content-Type': 'image/jpeg' } }));
      await cancelledBody.promise;
      const sameReplacement = service.getImage();
      assert.equal(calls, 2, 'late abandoned work cannot clear the replacement operation');
      assert.equal(bodyCancelCount, 1);
      replacement.resolve(imageResponse());
      assert.deepEqual(await next, jpeg);
      assert.deepEqual(await sameReplacement, jpeg);
      assert.equal(getEventListeners(controller.signal, 'abort').length, 0);
    } finally { controller.abort(); late.resolve(imageResponse()); replacement.resolve(imageResponse()); if (mode === 'timed-out') t.mock.timers.reset(); }
  }
});
