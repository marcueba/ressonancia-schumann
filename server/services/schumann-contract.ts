import type { NormalizedSchumannData } from '../types';
import { isValidObservationTime } from './observation-time';
import { getSchumannAvailability, isRelativeIntensity, isSchumannFrequency } from '../../shared/schumann';

export class SchumannSourceError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

/** Contract of the existing external JSON, not an image extractor.
 * The source's own js/app.js says atualizado is when its robot ran;
 * atraso_horas is the distance back into the image. Both are required to
 * estimate a reading time. An error document has no measurement time.
 */
export function normalizeSchumannDocument(json: unknown, stationId: string, queriedAt: string): NormalizedSchumannData {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    throw new SchumannSourceError('invalid_schema', 'A fonte retornou uma estrutura JSON incompatível.');
  }
  const source = json as Record<string, any>;
  if (!('estado' in source) && !('fundamental' in source)) {
    throw new SchumannSourceError('invalid_schema', 'A fonte retornou uma estrutura JSON incompatível.');
  }
  if ((source.fundamental != null && (typeof source.fundamental !== 'object' || Array.isArray(source.fundamental))) ||
      (source.harmonicas != null && !Array.isArray(source.harmonicas))) {
    throw new SchumannSourceError('invalid_schema', 'A estrutura dos modos da fonte mudou.');
  }
  const rawModes = [source.fundamental, ...Array.from({ length: 4 }, (_, i) => source.harmonicas?.[i])];
  const explicitlyUnavailable = source.estado === 'fonte_indisponivel';
  let previousFrequency = 0;
  const modes = rawModes.map(mode => {
    const value = mode?.pico_hz;
    const valid = !explicitlyUnavailable && mode?.estado === 'ok' && isSchumannFrequency(value) && value > previousFrequency;
    if (valid) previousFrequency = value;
    return { frequency: valid ? value : null, amplitude: null, quality: typeof mode?.estado === 'string' ? mode.estado : 'desconhecido' };
  });
  const availability = getSchumannAvailability(modes.map(mode => mode.frequency));
  const sourceUpdatedAt = isValidObservationTime(source.atualizado, Date.parse(queriedAt)) && !source.atualizado.endsWith('-00:00') ? source.atualizado : null;
  const delay = typeof source.atraso_horas === 'number' && Number.isFinite(source.atraso_horas) && source.atraso_horas >= 0 && source.atraso_horas <= 72
    ? source.atraso_horas : null;
  const estimatedAt = availability !== 'unavailable' && sourceUpdatedAt && delay !== null
    ? new Date(Date.parse(sourceUpdatedAt) - delay * 3_600_000).toISOString() : null;
  const intensity = source.fundamental?.intensidade;
  return {
    // The document exposes a robot time plus a relative image delay, not a
    // verified instrument timestamp. Keep the estimate separate so the existing
    // collector cannot persist it as an unqualified observation/deduplication key.
    stationId, timestamp: null, estimated_observation_at: estimatedAt,
    available: availability !== 'unavailable', availability,
    availability_reason: availability === 'unavailable' ? (explicitlyUnavailable ? 'source_unavailable' : 'no_valid_frequencies') : availability === 'partial' ? 'partial_frequencies' : undefined,
    source_updated_at: sourceUpdatedAt, source_delay_hours: delay,
    timestamp_basis: estimatedAt ? 'source_update_minus_delay' : null,
    // A source fallback or an estimate older than 24h must not be presented as current.
    is_historical: source.estado === 'ultima_conhecida' || (delay !== null && delay > 0.5) ||
      (estimatedAt !== null && Date.parse(queriedAt) - Date.parse(estimatedAt) > 86_400_000),
    fundamental: modes[0], mode2: modes[1], mode3: modes[2], mode4: modes[3], mode5: modes[4],
    quality: typeof source.estado === 'string' ? source.estado : 'desconhecido',
    source: 'Tomsk / SOS-70', source_type: 'derived_spectrogram',
    source_url: 'https://sos70.ru/provider.php?file=shm.jpg',
    processing_method: 'Processamento de Imagem Externo',
    processing_version: 'Dataset JSON — Ressonância Schumann Hoje',
    derived_from_image: true, is_primary_measurement: false, is_demo: false, collected_at: queriedAt,
    relativeIntensity: !explicitlyUnavailable && source.fundamental?.estado === 'ok' && isRelativeIntensity(intensity)
      ? { value: intensity, scale: '0-100', calibrated: false, source: 'spectrogram_color_scale' } : undefined,
  };
}
