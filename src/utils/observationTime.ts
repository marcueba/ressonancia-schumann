export type ObservationTimeZone = 'UTC' | 'America/Sao_Paulo';

/** Parse only calendar-valid ISO timestamps with an explicit, known offset. */
export function parseObservationTime(value: string | null | undefined): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;

  const [, year, month, day, hour, minute, second, zone] = match;
  const y = Number(year), m = Number(month), d = Number(day);
  const leapYear = y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (m < 1 || m > 12 || d < 1 || d > monthDays[m - 1] || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null;
  if (zone === '-00:00') return null; // RFC 3339 uses this for an unknown local offset.
  if (zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59)) return null;

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}

/** Display source time with its full date and an explicit zone, never the viewer's zone. */
export function formatObservationTime(value: string | null | undefined, timeZone: ObservationTimeZone): string {
  const date = parseObservationTime(value);
  if (!date) return 'Data da observação indisponível';

  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    timeZoneName: 'longOffset'
  }).formatToParts(date);
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === name)?.value || '';
  const dateAndTime = `${part('day')}/${part('month')}/${part('year')}, ${part('hour')}:${part('minute')}:${part('second')}`;
  const offset = part('timeZoneName').replace(/^GMT/, 'UTC');
  return timeZone === 'UTC' ? `${dateAndTime} UTC` : `${dateAndTime} (São Paulo, ${offset})`;
}

/** NOAA SWPC context time_tag fields are UTC even when the suffix is omitted.
 * Keep this source-specific rule separate from the strict observation parser.
 * NOAA's own parser: https://www.spaceweather.gov/modules/custom/swpc_planetary_k_index/planetary_k_index.js
 */
export function formatNoaaObservationTime(value: string | null | undefined, timeZone: ObservationTimeZone): string {
  const utcValue = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
    ? `${value.replace(' ', 'T')}Z`
    : value;
  return formatObservationTime(utcValue, timeZone);
}
