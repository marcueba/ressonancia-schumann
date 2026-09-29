import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { XRayDataPoint } from '../types';

interface XRayChartProps {
  data: XRayDataPoint[];
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: XRayDataPoint }[] }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const flux = data.flux;
    
    if (flux === null || flux === undefined) return null;
    
    // Classify
    let flareClass = '';
    if (flux < 1e-7) flareClass = `A${(flux * 1e8).toFixed(1)}`;
    else if (flux < 1e-6) flareClass = `B${(flux * 1e7).toFixed(1)}`;
    else if (flux < 1e-5) flareClass = `C${(flux * 1e6).toFixed(1)}`;
    else if (flux < 1e-4) flareClass = `M${(flux * 1e5).toFixed(1)}`;
    else flareClass = `X${(flux * 1e4).toFixed(1)}`;

    const date = new Date(data.time_tag);

    return (
      <div className="bg-surface border border-border p-3 rounded-lg shadow-xl text-xs">
        <div className="font-semibold text-text-main mb-1 text-sm">{flareClass}</div>
        <div className="text-text-muted mb-2">Fluxo: {flux.toExponential(2)} W/m²</div>
        <div className="text-text-muted">Banda: {data.energy}</div>
        <div className="text-text-muted">Satélite: GOES-{data.satellite}</div>
        <div className="mt-2 pt-2 border-t border-border">
          {date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} <br/>
          {date.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
        </div>
      </div>
    );
  }
  return null;
};

export function XRayChart({ data }: XRayChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-border/50 rounded-lg bg-surface-hover/10">
        <p className="text-text-muted text-sm">Dados de Raios X não disponíveis.</p>
      </div>
    );
  }

  // To make log scale work properly and look good, we need strictly positive data and defined ticks
  const ticks = [1e-9, 1e-8, 1e-7, 1e-6, 1e-5, 1e-4, 1e-3];
  const formatTick = (val: number) => {
    if (val === 1e-8) return 'A';
    if (val === 1e-7) return 'B';
    if (val === 1e-6) return 'C';
    if (val === 1e-5) return 'M';
    if (val === 1e-4) return 'X';
    return '';
  };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <XAxis 
            dataKey="time_tag" 
            tickFormatter={(timeStr) => {
              const d = new Date(timeStr);
              return d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
            }}
            stroke="#4b5563"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            tickMargin={10}
            minTickGap={40}
          />
          <YAxis 
            scale="log" 
            domain={[1e-9, 1e-3]} 
            ticks={ticks}
            tickFormatter={formatTick}
            stroke="#4b5563"
            tick={{ fill: '#9ca3af', fontSize: 10 }}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <ReferenceLine y={1e-8} stroke="#4b5563" strokeDasharray="3 3" opacity={0.3} />
          <ReferenceLine y={1e-7} stroke="#4b5563" strokeDasharray="3 3" opacity={0.3} />
          <ReferenceLine y={1e-6} stroke="#4b5563" strokeDasharray="3 3" opacity={0.3} />
          <ReferenceLine y={1e-5} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.3} />
          <ReferenceLine y={1e-4} stroke="#ef4444" strokeDasharray="3 3" opacity={0.3} />

          <Line 
            type="monotone" 
            dataKey="flux" 
            stroke="#ef4444" 
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 4, fill: "#ef4444", stroke: "none" }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
