import { CartesianGrid, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { HistoricalDataPoint } from '../types';
import type { Range } from './SchumannTimelineChart';
import { isSchumannFrequency } from '../../shared/schumann';
import { formatObservationTime } from '../utils/observationTime';
import { formatSeriesInterval, seriesTime } from '../utils/chartSeries';

interface CompactSchumannTimelineProps {
  data: HistoricalDataPoint[];
  loading: boolean;
  error: boolean;
  range: Range;
  onRangeChange?: (range: Range) => void;
}

const modes = [
  { key: 'f1', label: 'F1', color: '#67e8dc' },
  { key: 'f2', label: 'F2', color: '#fcd56a' },
  { key: 'f3', label: 'F3', color: '#c58bef' },
] as const;

export function CompactSchumannTimeline({ data, loading, error, range, onRangeChange }: CompactSchumannTimelineProps) {
  const points = data.flatMap(point => {
    const time = seriesTime(point.timestamp);
    return time === null ? [] : [{ ...point, time,
      f1: isSchumannFrequency(point.f1) ? point.f1 : null,
      f2: isSchumannFrequency(point.f2) ? point.f2 : null,
      f3: isSchumannFrequency(point.f3) ? point.f3 : null,
    }];
  }).sort((a, b) => a.time - b.time);
  const hasFrequency = points.some(point => modes.some(mode => point[mode.key] !== null));
  const first = points[0]?.time, last = points[points.length - 1]?.time;
  const interval = formatSeriesInterval(points.map(point => point.timestamp));
  return <div className="min-w-0" data-compact-history>
    <div className="flex flex-wrap items-center justify-between gap-2">
      {onRangeChange && <div className="flex gap-1.5" role="group" aria-label="Período do histórico">
        {(['7d', '30d', '90d'] as const).map(value => <button type="button" key={value} onClick={() => onRangeChange(value)} aria-pressed={range === value}
          className={`min-h-9 rounded-lg border px-3 text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${value === range ? 'border-primary bg-primary text-background' : 'border-border text-text-main hover:bg-surface-hover'}`}>{value}</button>)}
      </div>}
      {!loading && !error && <p className="text-xs text-text-muted">{data.length} {data.length === 1 ? 'registro' : 'registros'}</p>}
    </div>
    {loading ? <div className="flex h-[210px] items-center justify-center text-sm text-text-muted" role="status">Carregando histórico...</div>
      : error ? <div className="flex h-[210px] flex-col items-center justify-center gap-2 text-center text-sm" role="alert"><p className="text-red-300">Não foi possível consultar o histórico.</p><p className="text-xs text-text-muted">Falha de acesso não significa ausência de registros.</p></div>
      : !data.length ? <div className="flex h-[210px] flex-col items-center justify-center gap-2 text-center text-sm"><p>Nenhum registro disponível neste período.</p><p className="text-xs text-text-muted">A janela consultada não garante cobertura completa.</p></div>
      : !hasFrequency ? <div className="flex h-[210px] items-center justify-center text-center text-sm text-text-muted">Os registros retornados não contêm frequências válidas.</div>
      : <>
        <div className="mt-2 flex items-center justify-between text-[11px] text-text-muted"><span>Hz</span><div className="flex gap-3" aria-label="Legenda das frequências">{modes.map(mode => <span key={mode.key} className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: mode.color }} />{mode.label}</span>)}</div></div>
        <div className="h-[210px] min-w-0" role="img" aria-label={`Frequências F1, F2 e F3 em Hz; ${data.length} registros. Apenas frequências presentes são desenhadas; lacunas não são interpoladas.`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 10, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="time" type="number" scale="time" domain={first === last ? [first - 60_000, last + 60_000] : [first, last]}
                tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} stroke="var(--color-border)" minTickGap={28}
                tickFormatter={value => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' }).format(value)} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="var(--color-border)" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
              <Tooltip content={({ active, payload }) => {
                const point = payload?.[0]?.payload;
                return active && point ? <div className="max-w-64 rounded-lg border border-border bg-surface p-3 text-xs shadow-xl">
                  {modes.map(mode => isSchumannFrequency(point[mode.key]) && <p key={mode.key} style={{ color: mode.color }}>{mode.label}: {point[mode.key].toFixed(2)} Hz</p>)}
                  <p className="mt-2 text-text-muted">{formatObservationTime(point.timestamp, 'UTC')}</p>
                  <p className="mt-1 text-text-muted">Fonte: {point.sourceType || 'Não identificada'}</p>
                  {point.derivedFromImage && <p className="mt-1 text-amber-300">Derivado de espectrograma</p>}
                </div> : null;
              }} />
              {modes.map(mode => <Line key={mode.key} dataKey={mode.key} name={mode.label} stroke={mode.color} strokeWidth={0} dot={{ r: 3, fill: mode.color, strokeWidth: 0 }} activeDot={{ r: 5 }} connectNulls={false} isAnimationActive={false} />)}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </>}
    {!loading && !error && data.length > 0 && <p className="mt-2 text-[11px] leading-relaxed text-text-muted">{interval}{data.some(point => point.derivedFromImage) ? ' · Dados derivados de imagens' : ''}</p>}
    <p className="mt-1 text-[11px] leading-relaxed text-text-muted">Pontos observados; ausências e lacunas preservadas.</p>
  </div>;
}
