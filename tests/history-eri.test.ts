import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import express from 'express';
import { createHistoryHandler } from '../server/services/history';
import { getERIState } from '../server/services/eri';

async function serverFor(handler: ReturnType<typeof createHistoryHandler>) {
  const app = express();
  app.get('/api/history', handler);
  app.get('/api/eri', (_req, res) => res.json(getERIState()));
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port');
  return { url: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>(resolve => server.close(() => resolve())) };
}

const live = { DATA_MODE: 'live', SUPABASE_URL: 'https://database.invalid', SUPABASE_ANON_KEY: 'not-a-secret' };
function resultFactory(result: unknown) {
  return (() => {
    const query: any = { select: () => query, order: () => query, gte: () => query, lt: () => query,
      then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject) };
    return { from: () => query };
  }) as any;
}

test('ERI HTTP contract has an explicit disabled state and no numerical score', async () => {
  const srv = await serverFor(createHistoryHandler(undefined, {}));
  try {
    const res = await fetch(srv.url + '/api/eri');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { enabled: false, status: 'Em desenvolvimento', experimental: true });
  } finally { await srv.close(); }
});

test('missing configuration, failed query, thrown client error and prerender are unavailable, never empty success', async () => {
  for (const handler of [
    createHistoryHandler(undefined, { DATA_MODE: 'live' }),
    createHistoryHandler(resultFactory({ data: null, error: { message: 'secret upstream detail' } }), live),
    createHistoryHandler((() => { throw new Error('private detail'); }) as any, live),
    createHistoryHandler((() => { throw new Error('must not query'); }) as any, { ...live, PRERENDER: 'true' }),
  ]) {
    const srv = await serverFor(handler);
    try {
      const res = await fetch(srv.url + '/api/history');
      assert.equal(res.status, 503);
      assert.deepEqual(await res.json(), { available: false, error: 'history_unavailable', message: 'Histórico temporariamente indisponível.' });
    } finally { await srv.close(); }
  }
});

test('only a successful empty database response is represented by []', async () => {
  const srv = await serverFor(createHistoryHandler(resultFactory({ data: [], error: null }), live));
  try {
    const res = await fetch(srv.url + '/api/history?month=2026-11');
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), []);
    for (const query of ['month=2026-13', 'month=0000-01', 'month=x', 'month[x]=y', 'range=invalid', 'range=24h&range=7d']) {
      assert.equal((await fetch(srv.url + '/api/history?' + query)).status, 400, query);
    }
  } finally { await srv.close(); }
});
