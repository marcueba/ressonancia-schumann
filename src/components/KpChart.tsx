import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { KpDataPoint } from '../types';
import { formatSeriesInterval, seriesTime } from '../utils/chartSeries';

interface KpChartProps {
  data: KpDataPoint[];
  compact?: boolean;
}

export function prepareKpChart(data: readonly KpDataPoint[]) {
  return data.flatMap(point => {
    const time = seriesTime(point.time_tag);
    return time === null || !Number.isFinite(point.kp) || point.kp < 0 || point.kp > 9 ? [] : [{ ...point, time, time_tag: new Date(time).toISOString() }];
  }).sort((a, b) => a.time - b.time);
}

const getKpColor = (kp: number) => {
  if (kp < 4) return '#22c55e'; // Green
  if (kp < 5) return '#eab308'; // Yellow
  if (kp < 6) return '#f97316'; // Orange (G1)
  if (kp < 7) return '#ef4444'; // Red (G2)
  if (kp < 8) return '#b91c1c'; // Dark Red (G3)
  if (kp < 9) return '#991b1b'; // Darker Red (G4)
  return '#7f1d1d'; // Extreme (G5)
};

const getGScale = (kp: number) => {
  if (kp >= 5) {
    return `G${Math.floor(kp) - 4}`;
  }
  return '';
};

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: KpDataPoint }[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const kp = data.kp;
    
    if (kp === null || kp === undefined) return null;
    
    const date = new Date(data.time_tag);
    const gScale = getGScale(kp);

    return (
      <div className="bg-surface border border-border p-3 rounded-lg shadow-xl text-xs">
        <div className="font-semibold text-text-main mb-1 text-sm">
          Kp {kp.toFixed(2)} {gScale && <span className="ml-1 text-primary">({gScale})</span>}
        </div>
        <div className="text-text-muted mb-2">Índice Planetário NOAA</div>
        <div className="mt-2 pt-2 border-t border-border">
          {date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} <br/>
          {date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  }
  return null;
};

export function KpChart({ data, compact = false }: KpChartProps) {
  const points = prepareKpChart(data || []);
  if (!points.length) {
    return (
      <div className={`${compact ? 'h-[155px]' : 'h-64 border border-border/50 rounded-lg bg-surface-hover/10'} flex items-center justify-center`}>
        <p className={`text-text-muted ${compact ? 'text-xs' : 'text-sm'}`}>{compact ? 'Histórico indisponível' : 'Dados Geomagnéticos Kp não disponíveis.'}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0" data-kp-domain="0,9">
      <div className={compact ? 'h-[155px] w-full' : 'h-80 w-full'} role="img" aria-label={`Índice planetário Kp, escala de 0 a 9. ${points.length} leituras. ${formatSeriesInterval(points.map(point => point.time_tag))}.`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={points} margin={{ top: compact ? 8 : 20, right: 10, left: -20, bottom: 0 }}>
          <XAxis 
            dataKey={compact ? 'time' : 'time_tag'}
            type={compact ? 'number' : 'category'}
            scale={compact ? 'time' : 'auto'}
            domain={compact ? [points[0].time - 5_400_000, points[points.length - 1].time + 5_400_000] : undefined}
            tickFormatter={(timeStr) => {
              const d = new Date(timeStr);
              return compact && points[points.length - 1].time - points[0].time > 86_400_000
                ? d.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: '2-digit' })
                : d.toLocaleTimeString('pt-BR', { timeZone: compact ? 'UTC' : 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
            }}
            stroke="#4b5563"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickMargin={10}
            minTickGap={30}
          />
          <YAxis 
            domain={[0, 9]} 
            allowDataOverflow
            ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
            stroke="#4b5563"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#374151', opacity: 0.4 }} />
          
          <ReferenceLine y={4} stroke="#eab308" strokeDasharray="3 3" opacity={0.5} />
          {!compact && <ReferenceLine y={5} stroke="#f97316" strokeDasharray="3 3" opacity={0.5} label={{ value: 'G1', position: 'insideTopLeft', fill: '#f97316', fontSize: 10 }} />}
          {!compact && <ReferenceLine y={6} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} label={{ value: 'G2', position: 'insideTopLeft', fill: '#ef4444', fontSize: 10 }} />}
          {!compact && <ReferenceLine y={7} stroke="#b91c1c" strokeDasharray="3 3" opacity={0.5} label={{ value: 'G3', position: 'insideTopLeft', fill: '#b91c1c', fontSize: 10 }} />}

          <Bar dataKey="kp" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {points.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={compact && entry.kp < 4 ? '#67e8dc' : getKpColor(entry.kp)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </div>
      {compact && <p className="mt-1 text-[11px] leading-relaxed text-text-muted">Kp · {formatSeriesInterval(points.map(point => point.time_tag), true)}</p>}
    </div>
  );
}
