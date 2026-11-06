export type SchumannAvailability = 'available' | 'partial' | 'unavailable';

// The connected source describes peaks within a 0–40 Hz spectrogram.
// A numeric string, zero, NaN or infinity is not a measured frequency.
export function isSchumannFrequency(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 40;
}

export function getSchumannAvailability(values: unknown[]): SchumannAvailability {
  const count = values.filter(isSchumannFrequency).length;
  return count === 0 ? 'unavailable' : count === values.length ? 'available' : 'partial';
}

export function isRelativeIntensity(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}
