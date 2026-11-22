import assert from 'node:assert/strict';
import test from 'node:test';

import { fetchCollectorRuns } from './coletor.mjs';

const completed = {
  id: 44898192958,
  event: 'schedule',
  head_branch: 'main',
  status: 'completed',
  conclusion: 'success',
  created_at: '2026-11-21T11:15:02Z',
  updated_at: '2026-11-21T11:15:16Z',
  run_started_at: '2026-11-21T11:15:04Z',
  run_attempt: 2,
  actor: { login: 'ignore-this-metadata' },
};

function fixture(runs) {
  return Response.json({ total_count: runs.length, workflow_runs: runs });
}

test('uses a single public GET and retains only scheduled main run metadata', async () => {
  let calls = 0;
  const runs = await fetchCollectorRuns({
    fetcher: async (url, options) => {
      calls++;
      assert.equal(url, 'https://api.github.com/repos/marcueba/ressonancia-schumann/actions/workflows/schumann-cron.yml/runs?branch=main&event=schedule&per_page=12');
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'error');
      assert.equal(options.credentials, 'omit');
      assert.equal(options.signal.aborted, false);
      assert.deepEqual(Object.keys(options.headers).sort(), ['Accept', 'User-Agent']);
      return fixture([
        completed,
        { ...completed, id: completed.id + 1, status: 'queued', conclusion: null,
          run_started_at: undefined, run_attempt: undefined },
      ]);
    },
  });
  assert.equal(calls, 1);
  assert.deepEqual(runs, [
    {
      databaseId: completed.id,
      event: 'schedule',
      status: 'completed',
      conclusion: 'success',
      createdAt: completed.created_at,
      updatedAt: completed.updated_at,
      startedAt: completed.run_started_at,
      attempt: 2,
    },
    {
      databaseId: completed.id + 1,
      event: 'schedule',
      status: 'queued',
      conclusion: null,
      createdAt: completed.created_at,
      updatedAt: completed.updated_at,
      startedAt: null,
      attempt: null,
    },
  ]);
});

test('distinguishes confirmed absence from a malformed or incomplete run page', async () => {
  assert.deepEqual(await fetchCollectorRuns({ fetcher: async () => fixture([]) }), []);
  for (const page of [
    null,
    { workflow_runs: [] },
    { total_count: 1, workflow_runs: [] },
    { total_count: 1, workflow_runs: [{ ...completed, event: 'workflow_dispatch' }] },
    { total_count: 1, workflow_runs: [{ ...completed, head_branch: 'another-branch' }] },
    { total_count: 1, workflow_runs: [{ ...completed, created_at: '2026-02-30T00:00:00Z' }] },
    { total_count: 1, workflow_runs: [{ ...completed, conclusion: null }] },
  ]) {
    assert.equal(await fetchCollectorRuns({ fetcher: async () => Response.json(page) }), null);
  }
});

test('returns unknown on HTTP, MIME, JSON and transport failures', async () => {
  for (const response of [
    Response.redirect('https://example.test/'),
    Response.json({ message: 'API limit' }, { status: 429 }),
    Response.json({ message: 'inaccessible' }, { status: 403 }),
    new Response('<html>Not JSON</html>', { headers: { 'Content-Type': 'text/html' } }),
    new Response('{', { headers: { 'Content-Type': 'application/json' } }),
  ]) {
    assert.equal(await fetchCollectorRuns({ fetcher: async () => response }), null);
  }
  assert.equal(await fetchCollectorRuns({ fetcher: async () => { throw new Error('connection failed'); } }), null);
});

test('enforces the byte budget for declared and chunked response bodies', async () => {
  for (const declared of [true, false]) {
    let cancelled = false;
    const stream = new ReadableStream({
      start(controller) { controller.enqueue(new Uint8Array(512 * 1024 + 1)); },
      cancel() { cancelled = true; },
    });
    const headers = { 'Content-Type': 'application/json' };
    if (declared) headers['Content-Length'] = String(512 * 1024 + 1);
    const fetcher = async () => new Response(stream, { headers });
    assert.equal(await fetchCollectorRuns({ fetcher }), null);
    assert.equal(cancelled, true);
  }
});

test('times out even when the fetcher does not observe the abort signal', async () => {
  let signal;
  const result = await fetchCollectorRuns({
    timeoutMs: 15,
    fetcher: (_url, options) => {
      signal = options.signal;
      return new Promise(() => {});
    },
  });
  assert.equal(result, null);
  assert.equal(signal.aborted, true);
});

test('cancels a stalled response body at the same deadline', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('{')); },
    cancel() { cancelled = true; },
  });
  const fetcher = async () => new Response(stream, { headers: { 'Content-Type': 'application/json' } });
  assert.equal(await fetchCollectorRuns({ fetcher, timeoutMs: 15 }), null);
  assert.equal(cancelled, true);
});
