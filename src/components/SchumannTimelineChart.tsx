import { useMemo } from 'react';
import { HistoricalDataPoint } from '../types';
import { Card, CardTitle } from './ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

export type Range = '24h' | '7d' | '30d' | '90d' | '1y';

export const RANGES: { value: Range; label: string }[] = [
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '1y', label: '1 ano' },
];

interface SchumannTimelineChartProps {
  data: HistoricalDataPoint[];
  loading: boolean;
  error: boolean;
  range: Range;
  onRangeChange?: (range: Range) => void;
  showCoverageStats?: boolean;
}

export function SchumannTimelineChart({ 
  data, 
  loading, 
  error, 
  range, 
  onRangeChange,
  showCoverageStats = true
}: SchumannTimelineChartProps) {
  
  const formatDate = (isoStr: string, detailed = false) => {
    try {
      const d = new Date(isoStr);
      const opts: Intl.DateTimeFormatOptions = detailed 
        ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }
        : { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' };
      return new Intl.DateTimeFormat('pt-BR', opts).format(d).replace(',', '');
    } catch {
      return '';
    }
  };

  const observedInterval = useMemo(() => {
    if (data.length < 2) return null;
    const first = new Date(data[0].timestamp).getTime();
    const last = new Date(data[data.length - 1].timestamp).getTime();
    const diffMs = last - first;
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      const remHours = hours % 24;
      return `${days}d ${remHours}h`;
    }
    return `${hours}h${minutes}min`;
  }, [data]);

  const rangeLabel = RANGES.find(r => r.value === range)?.label || '';

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = data.find(d => d.timestamp === label);
      if (!point) return null;

      // Because recharts might pass multiple payloads if multiple series overlap perfectly on X,
      // but here we just show the selected one, or we show all lines for this timestamp.
      // The user wants:
      // F1
      // 8.10 Hz
      // 
      // 28/09/2026
      // 14:17
      // 
      // Qualidade: ok
      // Fonte: Dataset JSON — Ressonância Schumann Hoje
      // Dado derivado de espectrograma

      const dateTimeStr = formatDate(label, true);
      const parts = dateTimeStr.split(' ');
      const dateStr = parts[0];
      const timeStr = parts.length > 1 ? parts[1] : '';

      return (
        <div className="bg-surface border border-border p-4 rounded-lg shadow-lg text-sm min-w-[200px]">
          {payload.map((p: any, idx: number) => (
            <div key={idx} className="mb-3">
              <p className="font-bold text-text-main" style={{ color: p.color }}>{p.name}</p>
              <p className="text-lg text-text-main mb-1">{p.value != null ? `${p.value.toFixed(2)} Hz` : '-'}</p>
            </div>
          ))}
          
          <div className="text-text-muted mt-3 mb-3 border-t border-border pt-2">
            <p>{dateStr}</p>
            <p>{timeStr}</p>
          </div>

          <div className="text-text-muted text-xs space-y-1">
            {point.quality && <p>Qualidade: {point.quality}</p>}
            {point.sourceType && <p>Fonte: {point.sourceType}</p>}
            {point.derivedFromImage && <p className="text-amber-500 mt-1">Dado derivado de espectrograma</p>}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {onRangeChange && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {RANGES.map((r) => (
            <button 
              key={r.value}
              onClick={() => onRangeChange(r.value)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                range === r.value ? 'bg-primary text-background' : 'bg-surface hover:bg-surface-hover text-text-main border border-border'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      )}

      {showCoverageStats && data.length > 0 && !loading && !error && (
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${observedInterval ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4`}>
          <Card className="p-4 flex flex-col justify-center">
            <span className="text-xs text-text-muted uppercase tracking-wider mb-1">Observações</span>
            <span className="text-xl text-text-main font-medium">{data.length}</span>
          </Card>
          {observedInterval && (
            <Card className="p-4 flex flex-col justify-center">
              <span className="text-xs text-text-muted uppercase tracking-wider mb-1">Cobertura observacional</span>
              <span className="text-xl text-text-main font-medium">{observedInterval}</span>
            </Card>
          )}
          <Card className="p-4 flex flex-col justify-center">
            <span className="text-xs text-text-muted uppercase tracking-wider mb-1">Primeira observação</span>
            <span className="text-sm text-text-main">{formatDate(data[0].timestamp, true)}</span>
          </Card>
          <Card className="p-4 flex flex-col justify-center">
            <span className="text-xs text-text-muted uppercase tracking-wider mb-1">Última observação</span>
            <span className="text-sm text-text-main">{formatDate(data[data.length - 1].timestamp, true)}</span>
          </Card>
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle as="h2">Evolução Observacional ({rangeLabel})</CardTitle>
          {!loading && !error && (
            <span className="text-xs text-text-muted bg-surface-hover px-2 py-1 rounded">
              {data.length} {data.length === 1 ? 'observação disponível' : 'observações disponíveis'} neste período
            </span>
          )}
        </div>
        
        {loading ? (
          <div className="h-[400px] w-full flex items-center justify-center bg-surface">
            <p className="text-text-muted">Carregando dados observacionais...</p>
          </div>
        ) : error ? (
          <div className="h-[400px] w-full flex items-center justify-center bg-red-900/10">
            <p className="text-red-400">Erro ao carregar o histórico.</p>
          </div>
        ) : data.length === 0 ? (
          <div className="h-[400px] w-full p-6 flex flex-col items-center justify-center text-center bg-surface">
            <h2 className="text-xl font-medium text-text-main mb-2">Nenhuma observação disponível neste período.</h2>
            <p className="text-text-muted max-w-lg">
              O sistema depende da proveniência validada. Lacunas longas significam ausência de registros disponíveis.
            </p>
          </div>
        ) : (
          <div className="h-[400px] w-full p-6 pt-8 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis 
                  dataKey="timestamp" 
                  stroke="var(--color-text-muted)" 
                  tick={{fill: 'var(--color-text-muted)', fontSize: 12}}
                  tickFormatter={(val) => formatDate(val)}
                  minTickGap={30}
                />
                <YAxis 
                  stroke="var(--color-text-muted)" 
                  tick={{fill: 'var(--color-text-muted)', fontSize: 12}}
                  tickFormatter={(val) => `${val} Hz`}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Line type="monotone" name="F1" dataKey="f1" stroke="none" strokeWidth={0} dot={{r: 4, fill: 'var(--color-violet)', strokeWidth: 0}} activeDot={{r: 6}} connectNulls={false} isAnimationActive={false} />
                <Line type="monotone" name="F2" dataKey="f2" stroke="none" strokeWidth={0} dot={{r: 4, fill: 'var(--color-cyan)', strokeWidth: 0}} activeDot={{r: 6}} connectNulls={false} isAnimationActive={false} />
                <Line type="monotone" name="F3" dataKey="f3" stroke="none" strokeWidth={0} dot={{r: 4, fill: 'var(--color-emerald)', strokeWidth: 0}} activeDot={{r: 6}} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="px-6 pb-6 text-xs text-text-muted leading-relaxed">
          <p>Os pontos representam observações persistidas. Intervalos sem observação não são interpolados.</p>
        </div>
      </Card>
    </div>
  );
}
