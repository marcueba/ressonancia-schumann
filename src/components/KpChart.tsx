import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { KpDataPoint } from '../types';

interface KpChartProps {
  data: KpDataPoint[];
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

const CustomTooltip = ({ active, payload }: any) => {
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

export function KpChart({ data }: KpChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-border/50 rounded-lg bg-surface-hover/10">
        <p className="text-text-muted text-sm">Dados Geomagnéticos Kp não disponíveis.</p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
          <XAxis 
            dataKey="time_tag" 
            tickFormatter={(timeStr) => {
              const d = new Date(timeStr);
              return d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
            }}
            stroke="#4b5563"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickMargin={10}
            minTickGap={30}
          />
          <YAxis 
            domain={[0, 9]} 
            ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
            stroke="#4b5563"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#374151', opacity: 0.4 }} />
          
          <ReferenceLine y={4} stroke="#eab308" strokeDasharray="3 3" opacity={0.5} />
          <ReferenceLine y={5} stroke="#f97316" strokeDasharray="3 3" opacity={0.5} label={{ value: 'G1', position: 'insideTopLeft', fill: '#f97316', fontSize: 10 }} />
          <ReferenceLine y={6} stroke="#ef4444" strokeDasharray="3 3" opacity={0.5} label={{ value: 'G2', position: 'insideTopLeft', fill: '#ef4444', fontSize: 10 }} />
          <ReferenceLine y={7} stroke="#b91c1c" strokeDasharray="3 3" opacity={0.5} label={{ value: 'G3', position: 'insideTopLeft', fill: '#b91c1c', fontSize: 10 }} />

          <Bar dataKey="kp" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getKpColor(entry.kp)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
