export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export const DEFAULT_POLICY = Object.freeze({
  siteCadenceMs: 5 * MINUTE,
  sourceCadenceMs: HOUR,
  maxGapPeriods: 2.5,
  failureSamples: 3,
  slowSamples: 5,
  recoverySamples: 2,
  siteLatencyMs: 2_000,
  collectorDelayMs: 135 * MINUTE,
  noaaFastMaxAgeMs: HOUR,
  noaaKpMaxAgeMs: 6 * HOUR,
  noaaF107MaxAgeMs: 48 * HOUR,
  noaaF107MaxAgeDays: 3,
  noaaRegionsMaxAgeDays: 3,
  tomskPublicationMaxAgeMs: DAY,
  elfSilenceMs: 48 * HOUR,
});

export function resolvePolicy(overrides = {}) {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
    throw new TypeError('Invalid monitoring policy');
  }
  for (const [key, value] of Object.entries(overrides)) {
    const max = key.endsWith('Ms') ? 366 * DAY : key === 'maxGapPeriods' ? 24 : 366;
    if (!Object.hasOwn(DEFAULT_POLICY, key) || !Number.isFinite(value) || value < 1 || value > max ||
        (key !== 'maxGapPeriods' && !Number.isInteger(value))) {
      throw new TypeError('Invalid monitoring policy field');
    }
  }
  return { ...DEFAULT_POLICY, ...overrides };
}
