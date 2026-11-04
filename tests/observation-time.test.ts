import assert from 'node:assert/strict';
import test from 'node:test';
import { isValidObservationTime } from '../server/services/observation-time';

const now = Date.parse('2026-11-04T20:00:00Z');

test('source time requires a real, timezone-qualified timestamp no later than collection', () => {
  for (const value of [undefined, null, '', 0, 'not-a-date', '2026-11-04', '2026-11-04T18:00:00',
    '2026-02-30T18:00:00Z', '2026-11-04T24:00:00Z', '2026-11-04T18:00:00+24:00',
    '2026-11-04T20:00:01Z']) {
    assert.equal(isValidObservationTime(value, now), false, String(value));
  }
  for (const value of ['2026-11-04T19:00:00+00:00', '2026-11-04T16:00:00-03:00',
    '2026-11-04T20:00:00.000Z', '2024-02-29T12:00:00Z', '2020-01-01T00:00:00Z']) {
    assert.equal(isValidObservationTime(value, now), true, value);
  }
});

test('live provider rejects missing/invalid source time instead of manufacturing an observation', async () => {
  const previousMode = process.env.DATA_MODE;
  process.env.DATA_MODE = 'live';
  const { tomskProvider } = await import('../server/providers/SchumannProviders');
  const { apiCache } = await import('../server/services/cache');
  const originalFetch = globalThis.fetch;
  const originalSet = apiCache.set;
  // Do not retain a prior valid fixture in the process-wide production cache.
  apiCache.set = () => {};
  try {
    for (const atualizado of [undefined, '', 'invalid', '2026-02-30T12:00:00Z', '2099-01-01T00:00:00Z', '2026-09-30T11:00:00+00:00']) {
      globalThis.fetch = async () => new Response(JSON.stringify({ atualizado, fundamental: { pico_hz: 7.9 } }), {
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await tomskProvider.getCurrent();
      assert.equal(result.success, atualizado === '2026-09-30T11:00:00+00:00');
      if (result.success) assert.equal(result.data?.timestamp, atualizado);
      else assert.equal(result.data, undefined);
    }
  } finally {
    globalThis.fetch = originalFetch;
    apiCache.set = originalSet;
    if (previousMode === undefined) delete process.env.DATA_MODE;
    else process.env.DATA_MODE = previousMode;
  }
});

test('collector revalidates before upsert and preserves source time and deduplication', async () => {
  const envKeys = ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const;
  const previousEnv = Object.fromEntries(envKeys.map(key => [key, process.env[key]]));
  const originalFetch = globalThis.fetch;
  const { tomskProvider } = await import('../server/providers/SchumannProviders');
  const originalGetCurrent = tomskProvider.getCurrent;
  const writes: { payload: any; url: URL }[] = [];
  process.env.SUPABASE_URL = 'https://isolated-collector.invalid';
  delete process.env.VITE_SUPABASE_URL;
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'isolated-test-key';
  globalThis.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    assert.equal(url.hostname, 'isolated-collector.invalid', 'No production request is permitted');
    writes.push({ payload: JSON.parse(String(init?.body)), url });
    return new Response(JSON.stringify(writes.length === 1 ? [{ id: 'test-observation' }] : []), {
      headers: { 'Content-Type': 'application/json' }
    });
  };
  try {
    const { runCollector } = await import('../server/services/collector');
    const data = {
      stationId: 'tomsk', timestamp: '2026-09-30T11:00:00+00:00', collected_at: '2026-11-04T20:00:00Z',
      fundamental: { frequency: 7.9, amplitude: null, quality: 'test' },
      mode2: { frequency: null, amplitude: null, quality: 'test' },
      mode3: { frequency: null, amplitude: null, quality: 'test' },
      mode4: { frequency: null, amplitude: null, quality: 'test' },
      mode5: { frequency: null, amplitude: null, quality: 'test' }, quality: 'test', source: 'isolated test'
    };
    for (const timestamp of ['', 'invalid', '2099-01-01T00:00:00Z']) {
      tomskProvider.getCurrent = async () => ({ success: true, timestamp, data: { ...data, timestamp } });
      assert.equal(await runCollector(), 'no_valid_observation');
      assert.equal(writes.length, 0);
    }
    tomskProvider.getCurrent = async () => ({ success: true, timestamp: data.timestamp, data });
    assert.equal(await runCollector(), 'persisted');
    assert.equal(writes[0].payload.timestamp, data.timestamp);
    assert.equal(writes[0].payload.collected_at, data.collected_at);
    assert.equal(writes[0].url.searchParams.get('on_conflict')?.replace(/\s/g, ''), 'station_id,timestamp');
    assert.equal(await runCollector(), 'already_exists');
  } finally {
    globalThis.fetch = originalFetch;
    tomskProvider.getCurrent = originalGetCurrent;
    for (const key of envKeys) {
      if (previousEnv[key] === undefined) delete process.env[key];
      else process.env[key] = previousEnv[key];
    }
  }
});
