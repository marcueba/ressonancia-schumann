import { useSEO } from '../hooks/useSEO';
import { useEffect, useState, useMemo } from 'react';
import { dataProvider } from '../data/dataProvider';
import { HistoricalDataPoint } from '../types';
import { Card, CardTitle } from '../components/ui/Card';
import { SchumannTimelineChart, Range } from '../components/SchumannTimelineChart';

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
  
  const qualitySummary = useMemo(() => {
    if (data.length === 0) return null;
    const counts = data.reduce((acc, curr) => {
      const q = curr.quality || 'Desconhecida';
      acc[q] = (acc[q] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(counts).map(([q, count]) => `${count} com qualidade "${q}"`).join(', ');
  }, [data]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Histórico</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          Explore o histórico de variações na frequência observada.
        </p>
      </div>

      <SchumannTimelineChart 
        data={data}
        loading={loading}
        error={error}
        range={range}
        onRangeChange={setRange}
        showCoverageStats={true}
      />

      {data.length > 0 && !loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <CardTitle as="h3" className="mb-4 text-lg">Qualidade dos Registros</CardTitle>
            <div className="space-y-4">
              <p className="text-sm text-text-muted">{qualitySummary}</p>
              <div className="mt-4 p-4 bg-surface-hover rounded-md border border-border">
                <h4 className="text-xs font-semibold text-text-main mb-2 uppercase tracking-wide">Sobre estes dados</h4>
                {hasDerived ? (
                  <p className="text-sm text-text-muted">
                    Os registros atualmente disponíveis são derivados de espectrograma e não representam leitura instrumental direta realizada por este projeto.
                  </p>
                ) : (
                  <p className="text-sm text-text-muted">
                    Os dados disponíveis consistem nas observações persistidas em banco até o momento.
                  </p>
                )}
                {data[0]?.sourceType && (
                  <p className="text-xs text-text-muted mt-2 pt-2 border-t border-border">
                    Fonte principal: {data[0].sourceType} {data[0].processor ? `(${data[0].processor})` : ''}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <CardTitle as="h3" className="mb-4 text-lg">Resumo Estatístico</CardTitle>
            {data.length < 10 ? (
              <div className="py-2 text-center h-full flex flex-col justify-center">
                <p className="text-text-main font-medium mb-1">DADOS AINDA INSUFICIENTES PARA ANÁLISE ESTATÍSTICA</p>
                <p className="text-sm text-text-muted max-w-sm mx-auto">O histórico está sendo construído automaticamente. As estatísticas ganham significado à medida que novas observações são acumuladas (mínimo de 10 requeridas).</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
        </div>
      )}
    </div>
  );
}
