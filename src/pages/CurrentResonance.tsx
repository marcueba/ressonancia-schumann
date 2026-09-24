import { useSEO } from '../hooks/useSEO';
import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { CurrentResonanceData } from '../types';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Activity, Info } from 'lucide-react';

export function CurrentResonance() {
  useSEO({ title: "Ressonância de Schumann em Tempo Real | Observatório da Terra", description: "Acompanhe o estado atual do monitoramento da Ressonância de Schumann e conheça os limites e a disponibilidade das fontes ELF utilizadas pelo observatório.", path: "/atual" });

  const [data, setData] = useState<CurrentResonanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dataProvider.getCurrentData()
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="p-8 text-center text-text-muted">Carregando dados...</div>;

  const observedModes = [];
  if (data && data.fundamental.frequency !== null) observedModes.push({ name: "F1 (Fundamental)", freq: data.fundamental.frequency, quality: data.fundamental.quality });
  if (data && data.mode2.frequency !== null) observedModes.push({ name: "F2", freq: data.mode2.frequency, quality: data.mode2.quality });
  if (data && data.mode3.frequency !== null) observedModes.push({ name: "F3", freq: data.mode3.frequency, quality: data.mode3.quality });
  if (data && data.mode4.frequency !== null) observedModes.push({ name: "F4", freq: data.mode4.frequency, quality: data.mode4.quality });
  if (data && data.mode5.frequency !== null) observedModes.push({ name: "F5", freq: data.mode5.frequency, quality: data.mode5.quality });

  const theoreticalModes = [
    { name: "F1", freq: "~7.83" },
    { name: "F2", freq: "~14.3" },
    { name: "F3", freq: "~20.8" },
    { name: "F4", freq: "~27.3" },
    { name: "F5", freq: "~33.8" }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Painel Observacional</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          Monitoramento derivado da atividade eletromagnética ELF associada às Ressonâncias de Schumann.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Observados agora
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {observedModes.length > 0 ? (
              observedModes.map((mode, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="font-medium text-text-main">{mode.name}</div>
                    <div className="text-sm text-text-muted">Estado: {mode.quality}</div>
                  </div>
                  <div className="text-2xl font-light text-primary">
                    {mode.freq.toFixed(2)} <span className="text-sm text-text-muted">Hz</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-rose-400 py-4 text-center">Nenhum modo observável no momento.</div>
            )}
            {data && (
              <div className="pt-4 border-t border-border/50 text-xs text-text-muted flex justify-between">
                <span>Horário da observação UTC: {new Date(data.timestamp).toLocaleString()}</span>
                <span>Estação: {data.source || 'Tomsk'}</span>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Referência teórica</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {theoreticalModes.map((mode, i) => (
              <div key={i} className="flex items-center justify-between border-b border-border/50 pb-3 last:border-0 last:pb-0">
                <div className="text-text-muted">{mode.name}</div>
                <div className="text-text-main">{mode.freq} Hz</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      
      {data && data.derived_from_image && (
        <Card className="mt-6 bg-surface/50 border-primary/20">
          <CardHeader>
            <CardTitle as="h3" className="text-lg flex items-center gap-2">
              <Info className="w-4 h-4 text-primary" />
              Como esta leitura é obtida
            </CardTitle>
          </CardHeader>
          <p className="text-sm text-text-muted leading-relaxed">
            A estação de Tomsk publica um espectrograma ELF. A frequência exibida aqui é uma estimativa computacional derivada desse espectrograma. Por isso, ela é apresentada como observação derivada e não como telemetria numérica bruta do instrumento.
          </p>
        </Card>
      )}
    </div>
  );
}
