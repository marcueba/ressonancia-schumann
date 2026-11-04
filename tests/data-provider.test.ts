import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dataProvider } from '../src/data/dataProvider';

test('unavailable APIs release response bodies while preserving failure contracts', async () => {
  const originalFetch = globalThis.fetch;
  let released = 0;
  globalThis.fetch = async () => new Response(new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('{"error":"unavailable"}')); },
    cancel() { released++; },
  }), { status: 503 });
  try {
    assert.equal(await dataProvider.getCurrentData(), null);
    assert.equal(await dataProvider.getGeomagneticData(), null);
    assert.equal(await dataProvider.getSolarData(), null);
    await assert.rejects(dataProvider.getHistoricalData(), /Failed to fetch historical data/);
    await assert.rejects(dataProvider.getERI(), /Failed to fetch ERI/);
    assert.equal(released, 5, 'all unread error streams must be closed');
  } finally { globalThis.fetch = originalFetch; }
});
