import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { XRayDataPoint } from '../types';
import { flareClass, isPositiveFlux, prepareXRayHistory, xrayDomain } from '../utils/xrayData';
import { formatObservationTime } from '../utils/observationTime';
import { formatSeriesInterval } from '../utils/chartSeries';

interface XRayChartProps { data: XRayDataPoint[]; unavailableReason?: string; compact?: boolean }
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: XRayDataPoint }[] }) => {
  const point = payload?.[0]?.payload;
  if (!active || !point || !isPositiveFlux(point.flux)) return null;
  return <div className="bg-surface border border-border p-3 rounded-lg shadow-xl text-xs">
    <div className="font-semibold text-text-main mb-1 text-sm">{flareClass(point.flux)}</div>
    <div className="text-text-muted mb-2">Fluxo: {point.flux.toExponential(2)} W/m²</div>
    <div className="text-text-muted">Banda: {point.energy}</div>
    <div className="text-text-muted">Satélite: GOES-{point.satellite}</div>
    {point.electronContaminated && <div className="text-amber-400 mt-1">Fonte sinaliza contaminação eletrônica; fluxo corrigido pela NOAA.</div>}
    <div className="mt-2 pt-2 border-t border-border">{formatObservationTime(point.time_tag, 'America/Sao_Paulo')}</div>
  </div>;
};

export function XRayChart({ data, unavailableReason, compact = false }: XRayChartProps) {
  const points = prepareXRayHistory(data || []).map(point => ({ ...point, time: Date.parse(point.time_tag) }));
  const validCount = points.filter(point => isPositiveFlux(point.flux)).length;
  if (!validCount) return <div className={`${compact ? 'h-[100px]' : 'h-64 border border-border/50 rounded-lg bg-surface-hover/10'} flex items-center justify-center`}>
    <p className={`text-text-muted ${compact ? 'text-xs' : 'text-sm'}`}>{unavailableReason || (compact ? 'Histórico indisponível' : 'Nenhum fluxo de raios X positivo e válido disponível para o gráfico.')}</p>
  </div>;
  const first = points[0].time, last = points[points.length - 1].time;
  const timeDomain: [number, number] = first === last ? [first - 60000, last + 60000] : [first, last];
  const ticks = [1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3];
  const formatTick = (value: number) => ({ '1e-8': 'A', '1e-7': 'B', '0.000001': 'C', '0.00001': 'M', '0.0001': 'X' }[String(value)] || '');
  return <div className="min-w-0" data-xray-scale="log" data-xray-valid-points={validCount}>
    <div className={compact ? 'h-[100px] w-full' : 'h-80 w-full'} role="img" aria-label={`Fluxo de raios X GOES em W/m², escala logarítmica. ${validCount} leituras. ${formatSeriesInterval(data.map(point => point.time_tag))}. Lacunas não são interpoladas.`}>
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
        <XAxis dataKey="time" type="number" scale="time" domain={timeDomain}
          tickFormatter={value => new Date(value).toLocaleTimeString('pt-BR', { timeZone: compact ? 'UTC' : 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
          stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 10 }} tickMargin={10} minTickGap={40} />
        <YAxis type="number" scale="log" domain={xrayDomain(points)} allowDataOverflow ticks={ticks} tickFormatter={formatTick}
          stroke="#4b5563" tick={{ fill: '#9ca3af', fontSize: 10 }} width={30} />
        <Tooltip content={<CustomTooltip />} />
        {[1e-8, 1e-7, 1e-6, 1e-5, 1e-4].map(value => <ReferenceLine key={value} y={value} stroke={value >= 1e-4 ? '#ef4444' : value >= 1e-5 ? '#f59e0b' : '#4b5563'} strokeDasharray="3 3" opacity={0.3} />)}
        <Line type="linear" dataKey="flux" stroke={compact ? '#67e8dc' : '#ef4444'} strokeWidth={1.5}
          dot={(props: any) => {
            const index = props.index;
            const isolated = isPositiveFlux(points[index]?.flux) && !isPositiveFlux(points[index - 1]?.flux) && !isPositiveFlux(points[index + 1]?.flux);
            return isolated ? <circle key={index} cx={props.cx} cy={props.cy} r={3} fill="#ef4444" data-xray-isolated-point /> : <g key={index} />;
          }}
          activeDot={{ r: 4, fill: '#ef4444', stroke: 'none' }} connectNulls={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
    </div>
    {compact && <p className="mt-1 text-[11px] leading-relaxed text-text-muted">W/m² · escala log · {formatSeriesInterval(data.map(point => point.time_tag), true)}</p>}
  </div>;
}
