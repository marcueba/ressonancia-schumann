import { useSEO } from '../hooks/useSEO';
import { useEffect, useState, useMemo } from 'react';
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
  ResponsiveContainer,
  Legend
} from 'recharts';

type Range = '24h' | '7d' | '30d' | '90d' | '1y';
const RANGES: { value: Range; label: string }[] = [
  { value: '24h', label: '24 horas' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '1y', label: '1 ano' },
];

export function HistoryPage() {
  useSEO({ title: "Histórico da Ressonância de Schumann | Observatório da Terra", description: "Consulte o histórico disponível de observações relacionadas à Ressonância de Schumann.", path: "/historico" });

  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [range, setRange] = useState<Range>('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(false);
    dataProvider.getHistoricalData(range)
      .then(res => {
        setData(res);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(true);
        setLoading(false);
      });
  }, [range]);

  const formatDate = (isoStr: string, detailed = false) => {
    try {
      const d = new Date(isoStr);
      const opts: Intl.DateTimeFormatOptions = detailed 
        ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo', timeZoneName: 'short' }
        : { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' };
      return new Intl.DateTimeFormat('pt-BR', opts).format(d);
    } catch {
      return '';
    }
  };

  const calcStats = (key: 'f1' | 'f2' | 'f3') => {
    const valid = data.map(d => d[key]).filter(v => v !== null) as number[];
    if (valid.length === 0) return null;
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
    return { min: min.toFixed(2), max: max.toFixed(2), avg: avg.toFixed(2) };
  };

  const stats = useMemo(() => {
    return {
      f1: calcStats('f1'),
      f2: calcStats('f2'),
      f3: calcStats('f3')
    };
  }, [data]);

  const hasDerived = data.some(d => d.derivedFromImage);
  
  // Para exibir gaps (lacunas), o Recharts com connectNulls={false} requer que haja pontos nulos no array.
  // Como os dados vêm esparsos, precisamos injetar nulls se o intervalo for maior que 2 horas (por exemplo).
  const chartData = useMemo(() => {
    if (data.length === 0) return [];
    const withGaps: any[] = [];
    
    for (let i = 0; i < data.length; i++) {
      withGaps.push({ ...data[i] });
      
      if (i < data.length - 1) {
        const currTime = new Date(data[i].timestamp).getTime();
        const nextTime = new Date(data[i+1].timestamp).getTime();
        const hoursDiff = (nextTime - currTime) / (1000 * 60 * 60);
        
        // Se a lacuna for maior que 2.5 horas, injeta um ponto nulo no meio para quebrar a linha visualmente
        if (hoursDiff > 2.5) {
          withGaps.push({
            timestamp: new Date(currTime + (nextTime - currTime)/2).toISOString(),
            f1: null,
            f2: null,
            f3: null
          });
        }
      }
    }
    return withGaps;
  }, [data]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Histórico</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          Explore o histórico de variações na frequência observada.
        </p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
        {RANGES.map((r) => (
          <button 
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              range === r.value ? 'bg-primary text-background' : 'bg-surface hover:bg-surface-hover text-text-main border border-border'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-[400px] w-full flex items-center justify-center border border-border rounded-lg bg-surface">
          <p className="text-text-muted">Carregando...</p>
        </div>
      ) : error ? (
        <div className="h-[400px] w-full flex items-center justify-center border border-red-900/30 rounded-lg bg-red-900/10">
          <p className="text-red-400">Erro ao carregar os dados.</p>
        </div>
      ) : data.length === 0 ? (
        <div className="h-[400px] w-full p-6 flex flex-col items-center justify-center text-center border border-border rounded-lg bg-surface">
          <h2 className="text-xl font-medium text-text-main mb-2">Nenhuma observação válida disponível neste período.</h2>
          <p className="text-text-muted max-w-lg">
            A fonte primária não registrou medições válidas persistidas no intervalo selecionado.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-4 flex flex-col justify-center">
              <span className="text-xs text-text-muted uppercase tracking-wider mb-1">Cobertura observacional</span>
              <span className="text-2xl text-text-main">{data.length} <span className="text-sm text-text-muted font-normal">observações</span></span>
            </Card>
            <Card className="p-4 flex flex-col justify-center">
              <span className="text-xs text-text-muted uppercase tracking-wider mb-1">Primeira</span>
              <span className="text-sm text-text-main">{formatDate(data[0].timestamp, true)}</span>
            </Card>
            <Card className="p-4 flex flex-col justify-center">
              <span className="text-xs text-text-muted uppercase tracking-wider mb-1">Última</span>
              <span className="text-sm text-text-main">{formatDate(data[data.length - 1].timestamp, true)}</span>
            </Card>
          </div>

          <Card className="p-0 overflow-hidden">
            <div className="p-6 border-b border-border">
              <CardTitle as="h2">Frequências Observadas ({RANGES.find(r => r.value === range)?.label})</CardTitle>
            </div>
            
            <div className="h-[400px] w-full p-6 pt-8 relative">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
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
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--color-text-main)' }}
                    labelStyle={{ color: 'var(--color-text-muted)', marginBottom: '8px', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px' }}
                    labelFormatter={(label) => {
                      const point = data.find(d => d.timestamp === label);
                      if (!point) return 'Lacuna de dados';
                      let str = `${formatDate(label, true)}\n`;
                      if (point.quality) str += `\nQualidade: ${point.quality}`;
                      if (point.derivedFromImage) str += `\nOrigem: espectrograma derivado`;
                      return str.split('\n').map((line, i) => <div key={i}>{line}</div>);
                    }}
                    formatter={(value: number, name: string) => {
                      if (value === null) return ['-', name];
                      return [`${value.toFixed(2)} Hz`, name];
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Line type="monotone" name="F1 — Fundamental" dataKey="f1" stroke="var(--color-violet)" strokeWidth={2} dot={{r: 3, fill: 'var(--color-violet)', strokeWidth: 0}} activeDot={{r: 5}} connectNulls={false} />
                  <Line type="monotone" name="F2 — Segundo modo" dataKey="f2" stroke="var(--color-cyan)" strokeWidth={2} dot={{r: 3, fill: 'var(--color-cyan)', strokeWidth: 0}} activeDot={{r: 5}} connectNulls={false} />
                  <Line type="monotone" name="F3 — Terceiro modo" dataKey="f3" stroke="var(--color-emerald)" strokeWidth={2} dot={{r: 3, fill: 'var(--color-emerald)', strokeWidth: 0}} activeDot={{r: 5}} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="px-6 pb-6 text-xs text-text-muted leading-relaxed">
              <p>Os valores apresentados correspondem às observações disponíveis na base do projeto. Lacunas representam períodos sem observação válida persistida.</p>
              {hasDerived && <p className="mt-1">Dados derivados de espectrograma.</p>}
            </div>
          </Card>
          
          <Card className="p-6">
            <CardTitle as="h3" className="mb-4 text-lg">Resumo Estatístico do Período</CardTitle>
            {data.length < 10 ? (
              <div className="py-4 text-center">
                <p className="text-text-main font-medium mb-1">DADOS AINDA INSUFICIENTES PARA ANÁLISE ESTATÍSTICA</p>
                <p className="text-sm text-text-muted max-w-lg mx-auto">O histórico está sendo construído automaticamente. As estatísticas ganham significado à medida que novas observações são acumuladas (mínimo de 10 requeridas).</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {['f1', 'f2', 'f3'].map((key) => {
                  const s = stats[key as keyof typeof stats];
                  if (!s) return null;
                  const title = key === 'f1' ? 'Fundamental (F1)' : key === 'f2' ? 'Segundo Modo (F2)' : 'Terceiro Modo (F3)';
                  return (
                    <div key={key} className="space-y-2">
                      <h4 className="text-sm font-medium text-text-muted">{title}</h4>
                      <div className="flex justify-between border-b border-border pb-1">
                        <span className="text-sm">Média</span>
                        <span className="text-sm text-text-main font-medium">{s.avg} Hz</span>
                      </div>
                      <div className="flex justify-between border-b border-border pb-1">
                        <span className="text-sm">Mínima</span>
                        <span className="text-sm text-text-main">{s.min} Hz</span>
                      </div>
                      <div className="flex justify-between pb-1">
                        <span className="text-sm">Máxima</span>
                        <span className="text-sm text-text-main">{s.max} Hz</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
