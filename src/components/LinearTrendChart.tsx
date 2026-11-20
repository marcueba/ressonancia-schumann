import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatSeriesInterval, prepareLinearTrend, type LinearTrendPoint } from '../utils/chartSeries';
import { formatObservationTime } from '../utils/observationTime';

interface LinearTrendChartProps {
  data: LinearTrendPoint[];
  unit: string;
  label: string;
  color?: string;
  compact?: boolean;
}

export function LinearTrendChart({ data, unit, label, color = '#67e8dc', compact = true }: LinearTrendChartProps) {
  const points = prepareLinearTrend(data);
  const validCount = points.filter(point => point.value !== null).length;
  if (!validCount) return <div className={compact ? 'flex h-[100px] items-center justify-center text-xs text-text-muted' : 'flex h-64 items-center justify-center text-sm text-text-muted'}>Histórico indisponível</div>;
  const first = points[0].time, last = points[points.length - 1].time;
  return <div className="min-w-0" data-trend-unit={unit}>
    <div className={compact ? 'h-[100px] w-full' : 'h-64 w-full'} role="img" aria-label={`${label}, ${unit}. ${validCount} leituras. ${formatSeriesInterval(data.map(point => point.timestamp))}. Lacunas não são interpoladas.`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 5, left: -12, bottom: 0 }}>
          <XAxis dataKey="time" type="number" scale="time" domain={first === last ? [first - 60_000, last + 60_000] : [first, last]}
            tickFormatter={value => new Date(value).toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })}
            tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} stroke="var(--color-border)" minTickGap={28} />
          <YAxis width={42} domain={['auto', 'auto']} tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} stroke="var(--color-border)" tickCount={3} />
          <Tooltip content={({ active, payload }) => {
            const point = payload?.[0]?.payload;
            return active && point && point.value !== null ? <div className="rounded-lg border border-border bg-surface p-3 text-xs">
              <p>{label}: {point.value} {unit}</p>
              <p className="mt-1 text-text-muted">{formatObservationTime(new Date(point.time).toISOString(), 'UTC')}</p>
            </div> : null;
          }} />
          {unit === 'nT' && <ReferenceLine y={0} stroke="var(--color-text-muted)" strokeDasharray="3 3" />}
          <Line dataKey="value" type="linear" stroke={color} strokeWidth={1.5} connectNulls={false} isAnimationActive={false}
            dot={(props: any) => {
              const index = props.index;
              const isolated = points[index]?.value !== null && (points[index - 1]?.value ?? null) === null && (points[index + 1]?.value ?? null) === null;
              return isolated ? <circle key={index} cx={props.cx} cy={props.cy} r={2.5} fill={color} /> : <g key={index} />;
            }} activeDot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
    <p className="mt-1 text-[11px] leading-relaxed text-text-muted">{unit} · {formatSeriesInterval(data.map(point => point.timestamp), compact)}</p>
  </div>;
}
