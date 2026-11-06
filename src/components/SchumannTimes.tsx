import type { CurrentResonanceData } from '../types';
import { formatObservationTime, type ObservationTimeZone } from '../utils/observationTime';
import { schumannAvailability } from '../utils/schumannState';

export function SchumannTimes({ data, zone }: { data: CurrentResonanceData; zone: ObservationTimeZone }) {
  const hasObservation = schumannAvailability(data) !== 'unavailable';
  const readingTime = data.estimated_observation_at ?? data.timestamp;
  return <div className="space-y-2 text-[11px]">
    {hasObservation && <div className="flex flex-col gap-1">
      <span className="text-text-muted">{readingTime ? 'Horário estimado da leitura derivada' : 'Horário da medição não informado pela fonte'}</span>
      {readingTime && <span className="text-text-main font-medium">{formatObservationTime(readingTime, zone)}</span>}
    </div>}
    {data.source_updated_at && <div className="flex flex-col gap-1">
      <span className="text-text-muted">Atualização do documento da fonte</span>
      <span className="text-text-main">{formatObservationTime(data.source_updated_at, zone)}</span>
    </div>}
  </div>;
}
