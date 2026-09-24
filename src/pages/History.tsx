import { useSEO } from '../hooks/useSEO';
import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { HistoricalDataPoint } from '../types';
import { Card, CardTitle, CardDescription } from '../components/ui/Card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';

export function HistoryPage() {
  useSEO({ title: "Histórico da Ressonância de Schumann | Observatório da Terra", description: "Consulte o histórico disponível de observações relacionadas à Ressonância de Schumann e conheça a origem e as limitações dos dados.", path: "/historico" });

  const [data, setData] = useState<HistoricalDataPoint[]>([]);

  useEffect(() => {
    dataProvider.getHistoricalData().then(setData).catch(console.error);
  }, []);

  const formatDate = (isoStr: string) => {
    try {
      return format(new Date(isoStr), 'HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Histórico</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          Explore o histórico de variações na amplitude e frequência fundamental (modo 1).
        </p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {['24h', '7 dias', '30 dias', '90 dias', '1 ano'].map((filter, i) => (
          <button 
            key={filter}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${i === 0 ? 'bg-primary text-background' : 'bg-surface border border-border text-text-muted hover:text-text-main'}`}
          >
            {filter}
          </button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="p-6 border-b border-border">
          <CardTitle as="h2">Variação da Amplitude (24h)</CardTitle>
          <CardDescription>Estação Principal</CardDescription>
        </div>
        {data.length === 0 ? (
          <div className="h-[400px] w-full p-6 flex flex-col items-center justify-center text-center">
            <h2 className="text-xl font-medium text-text-main mb-2">Histórico ELF indisponível</h2>
            <p className="text-text-muted max-w-lg">
              Sem uma fonte ELF conectada, os registros estruturados do espectrograma não estão sendo salvos no momento.
            </p>
          </div>
        ) : (
          <div className="h-[400px] w-full p-6 pt-8 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="var(--color-text-muted)" 
                  tick={{fill: 'var(--color-text-muted)', fontSize: 12}}
                  tickFormatter={formatDate}
                  minTickGap={30}
                />
                <YAxis 
                  stroke="var(--color-text-muted)" 
                  tick={{fill: 'var(--color-text-muted)', fontSize: 12}}
                  tickFormatter={(val) => `${val}pT`}
                  domain={['dataMin - 1', 'dataMax + 1']}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-text-main)' }}
                  labelStyle={{ color: 'var(--color-text-muted)' }}
                  labelFormatter={(label) => `Horário: ${formatDate(label)}`}
                  formatter={(value: number) => [`${value.toFixed(2)} pT`, 'Amplitude']}
                />
                <Line type="monotone" dataKey="amplitude" stroke="var(--color-violet)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>
      
      {data.length > 0 && (
        <div className="flex justify-end gap-4 pt-4">
          <button className="px-4 py-2 border border-border rounded-md text-sm text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors">
            Exportar JSON
          </button>
          <button className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-md text-sm hover:bg-primary/20 transition-colors">
            Exportar CSV
          </button>
        </div>
      )}
    </div>
  );
}
