import assert from 'node:assert/strict';
import { resolveObjectURL } from 'node:buffer';
import { test, type TestContext } from 'node:test';
import { decode, encode } from 'jpeg-js';
import { createTomskSnapshotSession } from '../src/data/tomskSnapshot';

// All bytes and responses in these tests are controlled. No request reaches the proxy or source.
function jpeg(pixel: number[]) {
  return Uint8Array.from(encode({ width: 1, height: 1, data: Uint8Array.from(pixel) }, 90).data);
}

const firstImage = jpeg([180, 30, 40, 255]);
const secondImage = jpeg([30, 40, 180, 255]);
const response = (bytes = firstImage) => new Response(bytes, { headers: { 'content-type': 'image/jpeg' } });
const unavailable = () => new Response('unavailable', { status: 504 });

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(accept => { resolve = accept; });
  return { promise, resolve };
}

async function assertImage(url: string, expected: Uint8Array) {
  assert.match(url, /^blob:/);
  const blob = resolveObjectURL(url);
  assert.ok(blob, 'snapshot URL still resolves');
  assert.equal(blob.type, 'image/jpeg');
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), expected);
}

async function decodeSnapshot(url: string) {
  const blob = resolveObjectURL(url);
  assert.ok(blob, 'candidate is usable during validation');
  decode(new Uint8Array(await blob.arrayBuffer()), { tolerantDecoding: false });
}

type OnChange = Parameters<typeof createTomskSnapshotSession>[0];
type Snapshot = Parameters<OnChange>[0];
type Decode = (url: string, signal: AbortSignal) => Promise<void>;
type Read = (index: number, signal: AbortSignal) => Response | Promise<Response>;

function mount(t: TestContext, read: Read, decodeImage: Decode = decodeSnapshot) {
  const states: Snapshot[] = [];
  const requests: { url: string; cache: RequestCache | undefined; signal: AbortSignal }[] = [];
  const candidates: string[] = [];
  const session = createTomskSnapshotSession(state => states.push(state), {
    fetcher: async (input, init) => {
      assert.ok(init?.signal instanceof AbortSignal);
      requests.push({ url: String(input), cache: init.cache, signal: init.signal });
      return read(requests.length - 1, init.signal);
    },
    decode: (url, signal) => {
      candidates.push(url);
      return decodeImage(url, signal);
    },
  });
  t.after(() => session.dispose());
  return { session, requests, candidates, states, get state() { return states.at(-1)!; } };
}

test('Tomsk publishes the first validated JPEG with the selected bytes', async t => {
  const view = mount(t, () => response());
  await view.session.refresh();

  assert.deepEqual(view.state, { imgUrl: view.candidates[0], loading: false, hasError: false });
  assert.equal(view.requests.length, 1);
  assert.match(view.requests[0].url, /^\/api\/spectrogram\/tomsk\?t=\d+$/);
  await assertImage(view.state.imgUrl, firstImage);

  view.session.releaseUnused(view.state.imgUrl);
  await assertImage(view.state.imgUrl, firstImage);
  view.session.dispose();
  assert.equal(resolveObjectURL(view.state.imgUrl), undefined);
});

test('Tomsk keeps the exact displayed image during an update and after an HTTP failure', async t => {
  const pending = deferred<Response>();
  const view = mount(t, index => index === 0 ? response() : pending.promise);
  await view.session.refresh();
  const image = view.state.imgUrl;
  view.session.releaseUnused(image);

  const refresh = view.session.refresh();
  assert.deepEqual(view.state, { imgUrl: image, loading: true, hasError: false });
  await assertImage(image, firstImage);

  pending.resolve(unavailable());
  await refresh;
  assert.deepEqual(view.state, { imgUrl: image, loading: false, hasError: true });
  assert.deepEqual(view.candidates, [image]);
  await assertImage(image, firstImage);
});

test('An initial Tomsk HTTP or MIME failure leaves no image or candidate to display', async t => {
  const view = mount(t, index => index === 0 ? unavailable() : new Response('<html>error</html>', {
    headers: { 'content-type': 'text/html' },
  }));

  await view.session.refresh();
  assert.deepEqual(view.state, { imgUrl: '', loading: false, hasError: true });
  await view.session.refresh(true);
  assert.deepEqual(view.state, { imgUrl: '', loading: false, hasError: true });
  assert.deepEqual(view.candidates, []);
});

test('A validated replacement keeps both URLs until the newly displayed image commits', async t => {
  const validating = deferred<string>();
  const finishDecode = deferred();
  let decodes = 0;
  const view = mount(t, index => response(index === 0 ? firstImage : secondImage), async url => {
    await decodeSnapshot(url);
    if (++decodes === 2) {
      validating.resolve(url);
      await finishDecode.promise;
    }
  });
  await view.session.refresh();
  const previous = view.state.imgUrl;
  view.session.releaseUnused(previous);

  const refresh = view.session.refresh();
  const candidate = await validating.promise;
  assert.notEqual(candidate, previous);
  assert.equal(view.state.imgUrl, previous);
  view.session.releaseUnused(previous);
  await assertImage(candidate, secondImage);
  await assertImage(previous, firstImage);

  finishDecode.resolve();
  await refresh;
  assert.deepEqual(view.state, { imgUrl: candidate, loading: false, hasError: false });
  view.session.releaseUnused(previous);
  await assertImage(previous, firstImage);
  await assertImage(candidate, secondImage);

  view.session.releaseUnused(candidate);
  assert.equal(resolveObjectURL(previous), undefined, 'old thumbnail and enlargement have been replaced');
  await assertImage(candidate, secondImage);
});

test('A candidate with JPEG MIME that fails decoding is discarded while the previous URL remains', async t => {
  const corrupt = Uint8Array.of(0xff, 0xd8, 0xff, 0xd9);
  const view = mount(t, index => response(index === 0 ? firstImage : corrupt));
  await view.session.refresh();
  const image = view.state.imgUrl;
  view.session.releaseUnused(image);

  await view.session.refresh();
  assert.deepEqual(view.state, { imgUrl: image, loading: false, hasError: true });
  assert.equal(view.candidates.length, 2);
  assert.equal(resolveObjectURL(view.candidates[1]), undefined);
  await assertImage(image, firstImage);
});

test('Manual retry bypasses the cached response in the same time bucket and overlaps no other read', async t => {
  t.mock.method(Date, 'now', () => 600_000);
  const pending = deferred<Response>();
  const view = mount(t, index => index === 0 ? unavailable() : pending.promise);
  await view.session.refresh();
  assert.equal(view.state.hasError, true);

  const retry = view.session.refresh(true);
  const duplicates = [view.session.refresh(true), view.session.refresh()];
  assert.equal(view.state.loading, true);
  assert.equal(view.requests.length, 2);
  assert.equal(view.requests[0].url, '/api/spectrogram/tomsk?t=2');
  assert.equal(view.requests[1].url, view.requests[0].url);
  assert.notEqual(view.requests[0].cache, 'reload');
  assert.equal(view.requests[1].cache, 'reload');
  pending.resolve(response());
  await Promise.all([retry, ...duplicates]);

  assert.equal(view.state.hasError, false);
  assert.equal(view.requests.length, 2);
  await assertImage(view.state.imgUrl, firstImage);
});

test('Unmount releases the displayed image and aborts an outstanding read without publishing late results', async t => {
  const pending = deferred<Response>();
  const view = mount(t, index => index === 0 ? response() : pending.promise);
  await view.session.refresh();
  const image = view.state.imgUrl;
  view.session.releaseUnused(image);
  const refresh = view.session.refresh();
  const published = view.states.length;

  view.session.dispose();
  assert.equal(view.requests[1].signal.aborted, true);
  assert.equal(resolveObjectURL(image), undefined);
  await view.session.refresh(true);
  assert.equal(view.requests.length, 2);
  pending.resolve(response(secondImage));
  await refresh;
  assert.equal(view.states.length, published);
  assert.deepEqual(view.candidates, [image]);

  const nextPage = mount(t, () => unavailable());
  await nextPage.session.refresh();
  assert.deepEqual(nextPage.state, { imgUrl: '', loading: false, hasError: true }, 'another page instance inherits no image');
});

test('Unmount during browser decoding cleans up the unpublished candidate as well as the displayed URL', async t => {
  const validating = deferred<{ candidate: string; signal: AbortSignal }>();
  const finishDecode = deferred();
  let decodes = 0;
  const view = mount(t, index => response(index === 0 ? firstImage : secondImage), async (candidate, signal) => {
    await decodeSnapshot(candidate);
    if (++decodes === 2) {
      validating.resolve({ candidate, signal });
      await finishDecode.promise;
    }
  });
  await view.session.refresh();
  const displayed = view.state.imgUrl;
  view.session.releaseUnused(displayed);
  const refresh = view.session.refresh();
  const { candidate, signal } = await validating.promise;
  const published = view.states.length;

  view.session.dispose();
  assert.equal(signal.aborted, true);
  assert.equal(resolveObjectURL(displayed), undefined);
  assert.equal(resolveObjectURL(candidate), undefined);
  finishDecode.resolve();
  await refresh;
  assert.equal(view.states.length, published);
});
