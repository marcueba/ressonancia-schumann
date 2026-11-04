// Require an unambiguous source observation time. Collection time is a separate field.
export function isValidObservationTime(value: unknown, now = Date.now()): value is string {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return false;

  const [, year, month, day, hour, minute, second, zone, , offsetHour, offsetMinute] = match;
  const y = Number(year), m = Number(month), d = Number(day);
  if (m < 1 || m > 12 || d < 1 || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return false;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > daysInMonth) return false;
  if (zone !== 'Z' && (Number(offsetHour) > 23 || Number(offsetMinute) > 59)) return false;

  const timestamp = Date.parse(value);
  // Do not impose an age cutoff: older observations retain their real source time.
  return Number.isFinite(timestamp) && timestamp <= now;
}
