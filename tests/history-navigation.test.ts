import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { HistoricalDataPoint } from '../src/types';
import type { Range } from '../src/components/SchumannTimelineChart';
import { LastHistoryPeriodAction } from '../src/components/LastHistoryPeriodAction';
import { findHistoryPeriod, historyRangeFromSearch, historyRecordsFromNavigation } from '../src/utils/historyNavigation';

const NOW = Date.parse('2026-11-06T12:00:00Z');
const DAY = 86_400_000;
function row(age: number, values: [number | null, number | null, number | null] = [7.8, 14.1, null]): HistoricalDataPoint {
  return { timestamp: new Date(NOW - age).toISOString(), f1: values[0], f2: values[1], f3: values[2],
    quality: 'isolated test', sourceType: 'derived_spectrogram', derivedFromImage: true, processor: 'isolated test' };
}
const cache = (data: HistoricalDataPoint[], range: Range = '1y') => ({ data, range, loading: false, error: false });

test('cached valid rows are reused without a request, picking the latest measured row and the smallest supported window', async () => {
  const records = [row(200 * DAY), row(2 * DAY, [null, null, null]), row(45 * DAY, [null, 14.1, null])];
  const before = structuredClone(records);
  let requests = 0;
  const result = await findHistoryPeriod(cache(records), async () => { requests++; return []; }, () => NOW);
  assert.equal(requests, 0);
  assert.equal(result?.historyPeriod.range, '90d');
  assert.equal(result?.historyPeriod.consultedRange, '1y');
  assert.deepEqual(result?.historyPeriod.records, [records[2], records[1]], 'retain all-null rows inside the selected period, but do not use them as observations');
  assert.deepEqual(records, before);
});

test('empty recent cache performs exactly one bounded 365-day request and transfers the selected records', async () => {
  const requests: Range[] = [];
  const result = await findHistoryPeriod(cache([], '7d'), async range => { requests.push(range); return [row(180 * DAY), row(40 * DAY)]; }, () => NOW);
  assert.deepEqual(requests, ['1y']);
  assert.equal(result?.historyPeriod.range, '90d');
  assert.deepEqual(result?.historyPeriod.records, [row(40 * DAY)]);
});

test('an unfinished or failed Home request is not reused as a trustworthy snapshot', async () => {
  for (const status of [{ loading: true, error: false }, { loading: false, error: true }]) {
    const requests: Range[] = [];
    const result = await findHistoryPeriod({ ...cache([row(DAY)]), ...status }, async range => { requests.push(range); return [row(10 * DAY)]; }, () => NOW);
    assert.deepEqual(requests, ['1y']);
    assert.equal(result?.historyPeriod.range, '30d');
  }
});

test('a completed trustworthy one-year cache also reuses an empty or all-null result without another request', async () => {
  for (const records of [[], [row(40 * DAY, [null, null, null])]]) {
    const result = await findHistoryPeriod(cache(records, '1y'), async () => { throw Error('must reuse the completed full window'); }, () => NOW);
    assert.equal(result, null);
  }
});

test('partial numeric observations qualify, while all-null, invalid, future and older-than-window rows do not', async () => {
  const partial = await findHistoryPeriod(cache([row(2 * DAY, [null, 14.1, null])], '7d'), async () => { throw Error('must not request'); }, () => NOW);
  assert.equal(partial?.historyPeriod.range, '7d');
  const invalid = [row(DAY, [null, null, null]), row(-DAY), row(366 * DAY),
    { ...row(DAY), timestamp: '2026-02-30T12:00:00Z' },
    { ...row(DAY), timestamp: '2026-11-05T12:00:00' },
    { ...row(DAY), f1: '7.8' as unknown as number }, row(DAY, [NaN, null, null]), row(DAY, [0, null, null])];
  let requests = 0;
  const result = await findHistoryPeriod(cache(invalid), async () => { requests++; return invalid; }, () => NOW);
  assert.equal(requests, 1);
  assert.equal(result, null);
});

test('supported window boundaries are based on source dates, with no hardcoded calendar month', async () => {
  for (const [age, expected] of [[DAY, '24h'], [DAY + 1, '7d'], [7 * DAY, '7d'], [7 * DAY + 1, '30d'],
    [30 * DAY + 1, '90d'], [90 * DAY + 1, '1y'], [365 * DAY, '1y']] as [number, Range][]) {
    const result = await findHistoryPeriod(cache([row(age)]), async () => { throw Error('must not request'); }, () => NOW);
    assert.equal(result?.historyPeriod.range, expected);
  }
});

test('no valid observation in the one-year response stays empty; a failed query remains an error', async () => {
  assert.equal(await findHistoryPeriod(cache([], '7d'), async () => [], () => NOW), null);
  let requests = 0;
  await assert.rejects(findHistoryPeriod(cache([], '7d'), async () => { requests++; throw Error('query failed'); }, () => NOW), /query failed/);
  assert.equal(requests, 1);
  await assert.rejects(findHistoryPeriod(cache([], '7d'), async () => ({}) as HistoricalDataPoint[], () => NOW), /Resposta histórica incompatível/);
});

test('fresh matching PUSH state avoids the initial duplicate request; refresh/back and explicit selections do not consume old state', async () => {
  const selected = await findHistoryPeriod(cache([row(40 * DAY)]), async () => [], () => NOW);
  assert.ok(selected);
  assert.deepEqual(historyRecordsFromNavigation('?range=90d', selected, 'PUSH', NOW + 100), [row(40 * DAY)]);
  assert.equal(historyRecordsFromNavigation('?range=90d', selected, 'POP', NOW + 100), null, 'reload/back must consult the API');
  assert.equal(historyRecordsFromNavigation('?range=7d', selected, 'PUSH', NOW + 100), null, 'a manual range must not be overwritten by transferred rows');
  assert.equal(historyRangeFromSearch('?range=7d'), '7d');
  assert.equal(historyRecordsFromNavigation('?range=90d', selected, 'PUSH', NOW + 60_001), null);
  assert.equal(historyRecordsFromNavigation('?range=90d', selected, 'PUSH', NOW - 1), null);
});

test('direct query selects only a supported range and malformed navigation state is ignored', async () => {
  for (const value of ['24h', '7d', '30d', '90d', '1y']) assert.equal(historyRangeFromSearch('?range=' + value), value);
  for (const search of ['', '?range=all', '?range=', '?month=2026-09']) assert.equal(historyRangeFromSearch(search), '24h');
  const selected = await findHistoryPeriod(cache([row(40 * DAY)]), async () => [], () => NOW);
  assert.equal(historyRecordsFromNavigation('?range=bad', selected, 'PUSH', NOW), null);
  assert.equal(historyRecordsFromNavigation('?range=90d&range=7d', selected, 'PUSH', NOW), null);
  assert.equal(historyRecordsFromNavigation('?range=90d', { historyPeriod: { ...selected!.historyPeriod, records: [row(-DAY)] } }, 'PUSH', NOW), null);
  assert.equal(historyRecordsFromNavigation('?range=90d', { historyPeriod: { ...selected!.historyPeriod, consultedRange: '24h' } }, 'PUSH', NOW), null);
});

test('the action has no mount-time lookup and discloses its bounded search', () => {
  const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(LastHistoryPeriodAction, cache([], '7d'))));
  assert.match(html, /Ver último período com observações/);
  assert.match(html, /somente a janela consultada \(até 365 dias\)/);
  assert.match(html, /focus-visible/);
  assert.match(html, /aria-busy="false"/);
});
