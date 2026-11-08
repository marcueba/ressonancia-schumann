import type { HistoricalDataPoint } from '../types';
import type { Range } from '../components/SchumannTimelineChart';
import { isSchumannFrequency } from '../../shared/schumann';
import { parseObservationTime } from './observationTime';

const DAY = 24 * 60 * 60 * 1000;
const RANGE_MS: Record<Range, number> = { '24h': DAY, '7d': 7 * DAY, '30d': 30 * DAY, '90d': 90 * DAY, '1y': 365 * DAY };

export interface HistoryPeriodCache {
  data: HistoricalDataPoint[];
  range: Range;
  loading: boolean;
  error: boolean;
}

export interface HistoryPeriodState {
  historyPeriod: {
    version: 1;
    range: Range;
    records: HistoricalDataPoint[];
    consultedRange: Range;
    selectedAt: number;
  };
}

export function historyRangeFromSearch(search: string): Range {
  const value = new URLSearchParams(search).get('range');
  return value && Object.hasOwn(RANGE_MS, value) ? value as Range : '24h';
}

function recordTime(record: unknown): number | null {
  if (!record || typeof record !== 'object') return null;
  const row = record as HistoricalDataPoint;
  const date = parseObservationTime(row.timestamp);
  if (!date || !['f1', 'f2', 'f3'].every(key => row[key] === null || isSchumannFrequency(row[key]))) return null;
  // Metadata is rendered by the existing chart; never accept arbitrary objects as text.
  if (![row.quality, row.sourceType, row.processor].every(value => value == null || typeof value === 'string')) return null;
  if (row.derivedFromImage != null && typeof row.derivedFromImage !== 'boolean') return null;
  return date.getTime();
}

function recordsInRange(data: unknown, range: Range, now: number): HistoricalDataPoint[] {
  if (!Array.isArray(data)) throw new Error('Resposta histórica incompatível.');
  return data.filter(record => {
    const time = recordTime(record);
    return time !== null && time <= now && time >= now - RANGE_MS[range];
  }).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
}

function hasObservation(record: HistoricalDataPoint) {
  return [record.f1, record.f2, record.f3].some(isSchumannFrequency);
}

/** One bounded search, started by the visitor; no month traversal or background lookup. */
export async function findHistoryPeriod(
  cache: HistoryPeriodCache,
  readHistory: (range: Range) => Promise<HistoricalDataPoint[]>,
  clock: () => number = Date.now,
): Promise<HistoryPeriodState | null> {
  let selectedAt = clock();
  let consultedRange = cache.range;
  const cachedRecords = !cache.loading && !cache.error && Array.isArray(cache.data)
    ? recordsInRange(cache.data, cache.range, selectedAt) : [];
  const usableCache = !cache.loading && !cache.error && Array.isArray(cache.data) && cachedRecords.length === cache.data.length;
  let records = usableCache ? cachedRecords : [];
  // A completed full-window query is sufficient evidence of absence too.
  if (usableCache && cache.range === '1y' && !records.some(hasObservation)) return null;
  if (!records.some(hasObservation)) {
    records = await readHistory('1y');
    selectedAt = clock();
    consultedRange = '1y';
    records = recordsInRange(records, consultedRange, selectedAt);
  }
  const latest = records.filter(hasObservation).at(-1);
  if (!latest) return null;
  const age = selectedAt - Date.parse(latest.timestamp);
  const range = (Object.keys(RANGE_MS) as Range[]).find(value => age <= RANGE_MS[value]);
  if (!range) return null;
  return { historyPeriod: { version: 1, range, records: recordsInRange(records, range, selectedAt), consultedRange, selectedAt } };
}

/** PUSH can carry freshly selected rows; reload/back (POP) always re-read the API. */
export function historyRecordsFromNavigation(search: string, state: unknown, navigationType: string, now = Date.now()): HistoricalDataPoint[] | null {
  if (navigationType !== 'PUSH' || !state || typeof state !== 'object') return null;
  const snapshot = (state as HistoryPeriodState).historyPeriod;
  const query = new URLSearchParams(search);
  const range = historyRangeFromSearch(search);
  if (!snapshot || snapshot.version !== 1 || snapshot.range !== range || query.getAll('range').length !== 1 || query.get('range') !== range ||
      !Number.isFinite(snapshot.selectedAt) || snapshot.selectedAt > now || now - snapshot.selectedAt > 60_000 ||
      !Object.hasOwn(RANGE_MS, snapshot.consultedRange) || RANGE_MS[range] > RANGE_MS[snapshot.consultedRange] || !Array.isArray(snapshot.records)) return null;
  const records = recordsInRange(snapshot.records, range, snapshot.selectedAt);
  if (records.length !== snapshot.records.length || !records.some(hasObservation)) return null;
  return records;
}
