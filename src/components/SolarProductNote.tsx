import type { SolarData } from '../types';
import { formatNoaaObservationTime } from '../utils/observationTime';

type ProductKey = keyof NonNullable<SolarData['productMetadata']>;
export type SolarProductMetadata = NonNullable<NonNullable<SolarData['productMetadata']>[ProductKey]>;

export function formatProductDay(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Data não informada';
  const time = Date.parse(value + 'T00:00:00Z');
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== value) return 'Data não informada';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

/** Source precision is retained: a day-only record never gains a measurement hour. */
export function SolarProductNote({ metadata, fallbackTime, partialLabel = 'Dados parciais deste produto.' }: { metadata?: SolarProductMetadata; fallbackTime?: string | null; partialLabel?: string }) {
  const at = metadata?.observedAt ?? fallbackTime;
  return <div className="min-w-0 mt-3 space-y-1 text-xs text-text-muted [overflow-wrap:anywhere]">
    {metadata?.state === 'partial' && <p className="text-amber-400">{partialLabel}</p>}
    {metadata?.timePrecision === 'date' && metadata.observedDate
      ? <p>Data informada no produto: {formatProductDay(metadata.observedDate)}. Hora de observação não informada.</p>
      : at && <p>{metadata?.timeKind === 'begin' ? 'Início catalogado' : metadata?.timeKind === 'maximum' ? 'Máximo catalogado' : 'Horário informado no produto'}: {formatNoaaObservationTime(at, 'UTC')}</p>}
    {metadata?.reportingSchedule && <p>Agenda informada pela fonte: {metadata.reportingSchedule}</p>}
    {metadata?.note && <p>{metadata.note}</p>}
    {metadata?.sourceUrl && <p><a href={metadata.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Produto NOAA de origem</a></p>}
  </div>;
}
