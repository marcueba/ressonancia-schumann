import type { XRayDataPoint } from '../types';
import { parseObservationTime } from './observationTime';

export const XRAY_BAND = '0.1-0.8nm';
export const isPositiveFlux = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

/** Nulls are missing/non-plottable flux, never zero or an interpolated value. */
export function prepareXRayHistory(records: readonly XRayDataPoint[]): XRayDataPoint[] {
  const sorted = records.filter(point => point.energy === XRAY_BAND && parseObservationTime(point.time_tag))
    .map(point => ({ ...point, flux: isPositiveFlux(point.flux) ? point.flux : null }))
    .sort((a, b) => Date.parse(a.time_tag) - Date.parse(b.time_tag));
  const result: XRayDataPoint[] = [];
  for (const point of sorted) {
    const previous = result[result.length - 1];
    if (previous && isPositiveFlux(previous.flux) && Date.parse(point.time_tag) - Date.parse(previous.time_tag) > 90000) {
      // Chart-only missing-value marker; it is not a measured point or a filled observation.
      result.push({ ...previous, time_tag: new Date(Date.parse(previous.time_tag) + 60000).toISOString(), flux: null });
    }
    result.push(point);
  }
  return result;
}

export function xrayDomain(points: readonly XRayDataPoint[]): [number, number] {
  const positive = points.map(point => point.flux).filter(isPositiveFlux);
  return [Math.min(1e-9, ...positive), Math.max(1e-3, ...positive)];
}

export function flareClass(flux: number): string {
  if (flux < 1e-7) return `A${(flux * 1e8).toFixed(1)}`;
  if (flux < 1e-6) return `B${(flux * 1e7).toFixed(1)}`;
  if (flux < 1e-5) return `C${(flux * 1e6).toFixed(1)}`;
  if (flux < 1e-4) return `M${(flux * 1e5).toFixed(1)}`;
  return `X${(flux * 1e4).toFixed(1)}`;
}
