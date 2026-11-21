import { parseObservationTime } from './observationTime';

/** NOAA context products use UTC for time_tag even when the offset is omitted. */
export function seriesTime(value: string): number | null {
  const normalized = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
    ? `${value.replace(' ', 'T')}Z` : value;
  return parseObservationTime(normalized)?.getTime() ?? null;
}

/** Describes the returned observations, not an assumed query window. */
export function formatSeriesInterval(timestamps: readonly string[], compact = false): string {
  const times = timestamps.map(seriesTime).filter((time): time is number => time !== null).sort((a, b) => a - b);
  if (!times.length) return 'Período indisponível';
  const crossesYear = new Date(times[0]).getUTCFullYear() !== new Date(times[times.length - 1]).getUTCFullYear();
  const format = (time: number) => new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'UTC', day: '2-digit', month: '2-digit', ...(!compact || crossesYear ? { year: 'numeric' as const } : {}), hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(time).replace(',', '');
  return times.length === 1 ? `${format(times[0])} UTC` : `${format(times[0])} – ${format(times[times.length - 1])} UTC`;
}

export interface LinearTrendPoint { timestamp: string; value: number | null }

/** A null chart-only separator interrupts missing one-minute NOAA samples; no value is estimated. */
export function prepareLinearTrend(data: readonly LinearTrendPoint[], maxGapMs = 90_000) {
  const sorted = data.flatMap(point => {
    const time = seriesTime(point.timestamp);
    return time === null ? [] : [{ ...point, time, value: typeof point.value === 'number' && Number.isFinite(point.value) ? point.value : null }];
  }).sort((a, b) => a.time - b.time);
  const result: (LinearTrendPoint & { time: number; separator?: boolean })[] = [];
  for (const point of sorted) {
    const previous = result[result.length - 1];
    if (previous && previous.value !== null && point.time - previous.time > maxGapMs) {
      result.push({ timestamp: new Date(previous.time + 1).toISOString(), time: previous.time + 1, value: null, separator: true });
    }
    result.push(point);
  }
  return result;
}
