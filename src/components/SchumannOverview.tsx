import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Radio } from 'lucide-react';
import type { CurrentResonanceData } from '../types';
import { Card, CardTitle } from './ui/Card';
import { SchumannTimes } from './SchumannTimes';
import { displayFrequency, schumannAvailability, schumannStatus } from '../utils/schumannState';

export function SchumannOverview({ data, loading, children }: { data: CurrentResonanceData | null; loading: boolean; children?: ReactNode }) {
  const availability = schumannAvailability(data);
  return <Card className="flex flex-col min-w-0 border-primary/20">
    <div className="flex items-center gap-2 mb-3">
      <Radio className="w-5 h-5 shrink-0 text-primary" />
      <CardTitle as="h2" className="min-w-0 break-words">Ressonância Schumann</CardTitle>
    </div>
    <div className="text-sm mb-4" role="status" aria-live="polite">
      <p className={availability === 'unavailable' ? 'text-amber-400' : 'text-text-main'}>
        {loading ? 'Consultando Schumann...' : schumannStatus(data)}
      </p>
      {!loading && data && availability === 'unavailable' && <p className="text-text-muted mt-1">Sem nova observação válida para exibir.</p>}
      {data?.is_historical && availability !== 'unavailable' && <p className="text-text-muted mt-1">Registro histórico fornecido pela fonte.</p>}
    </div>
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,4.5rem),1fr))] gap-2 mb-4 text-center">
      {[['F1', data?.fundamental?.frequency], ['F2', data?.mode2?.frequency], ['F3', data?.mode3?.frequency]].map(([label, value]) => <div key={label} className="min-w-0 bg-surface-hover/30 rounded-lg p-2">
        <div className="text-xs text-text-muted mb-1">{label}</div>
        <div className="text-xl font-light whitespace-nowrap">{displayFrequency(availability === 'unavailable' ? null : value, label === 'F1' ? 2 : 1)}</div>
        <div className="text-xs text-text-muted">Hz</div>
      </div>)}
    </div>
    {data && <div className="pt-3 border-t border-border space-y-2 mt-auto">
      <SchumannTimes data={data} zone="America/Sao_Paulo" />
      <p className="text-xs text-text-muted">{data.source || 'Fonte não informada'}{data.source_type === 'derived_spectrogram' ? ' · Derivado de espectrograma' : ''}</p>
    </div>}
    <Link to="/atual" className="text-sm text-primary mt-4 self-start rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Abrir painel Schumann</Link>
    {children}
  </Card>;
}
