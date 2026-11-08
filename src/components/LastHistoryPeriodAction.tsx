import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { HistoryPeriodCache } from '../utils/historyNavigation';
import { findHistoryPeriod } from '../utils/historyNavigation';
import { dataProvider } from '../data/dataProvider';

export interface LastHistoryPeriodActionProps extends HistoryPeriodCache {
  className?: string;
}

export function LastHistoryPeriodAction({ data, range, loading, error, className }: LastHistoryPeriodActionProps) {
  const navigate = useNavigate();
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle');
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function openHistory() {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus('loading');
    try {
      const state = await findHistoryPeriod({ data, range, loading, error }, dataProvider.getHistoricalData);
      if (!mounted.current) return;
      if (!state) { setStatus('empty'); return; }
      navigate(`/historico?range=${state.historyPeriod.range}`, { state });
    } catch {
      if (mounted.current) setStatus('error');
    } finally {
      inFlight.current = false;
      if (mounted.current) setStatus(previous => previous === 'loading' ? 'idle' : previous);
    }
  }

  return <div className={className}>
    <button type="button" onClick={openHistory} disabled={status === 'loading'} aria-busy={status === 'loading'}
      className="min-h-11 max-w-full rounded-lg border border-primary/40 px-4 py-2 text-sm text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60">
      {status === 'loading' ? 'Buscando período…' : 'Ver último período com observações'}
    </button>
    <p className="mt-2 text-xs text-text-muted">Considera somente a janela consultada (até 365 dias).</p>
    {status === 'empty' && <p role="status" className="mt-2 text-sm text-text-muted">Nenhuma observação válida foi encontrada na janela consultada de 365 dias. <Link to="/historico" className="text-primary underline focus-visible:outline-2 focus-visible:outline-offset-4">Abrir histórico</Link></p>}
    {status === 'error' && <p role="alert" className="mt-2 text-sm text-red-400">Não foi possível consultar o histórico. <Link to="/historico" className="text-primary underline focus-visible:outline-2 focus-visible:outline-offset-4">Abrir histórico</Link></p>}
  </div>;
}
