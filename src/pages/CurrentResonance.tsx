import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { CurrentResonanceData } from '../types';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Activity } from 'lucide-react';

export function CurrentResonance() {
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

  if (!data || data.is_demo) return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Monitoramento da Ressonância</h1>
        <p className="text-amber-400 max-w-3xl leading-relaxed mt-4">
          O sistema está operacional, mas as medições eletromagnéticas ELF primárias ainda não estão conectadas.
        </p>
        <p className="text-text-muted mt-4">
          A arquitetura está preparada para extrair e processar os modos 1 ao 5 (7.83Hz até 32.4Hz) a partir de espectrogramas e dados estruturados, entretanto nenhuma fonte de dados real-time (como a Sierra Nevada ELF Station ou observatórios equivalentes) está ligada ao pipeline de ingestão atual.
        </p>
      </div>
    </div>
  );

  const modes = [
    { name: "Frequência Fundamental (Modo 1)", data: data.fundamental, expected: "~7.83 Hz" },
    { name: "Segundo Modo", data: data.mode2, expected: "~14.1 Hz" },
    { name: "Terceiro Modo", data: data.mode3, expected: "~20.3 Hz" },
    { name: "Quarto Modo", data: data.mode4, expected: "~26.4 Hz" },
    { name: "Quinto Modo", data: data.mode5, expected: "~32.4 Hz" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Ressonância Atual</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          A Ressonância de Schumann corresponde a modos eletromagnéticos naturais formados na cavidade entre a superfície terrestre e a ionosfera. As frequências observadas variam e os valores apresentados dependem das condições atmosféricas e da estação de medição.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {modes.map((mode, i) => (
          <Card key={i} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-lg font-medium tracking-tight mb-1">{mode.name}</h3>
              <p className="text-sm text-text-muted">Frequência nominal teórica: {mode.expected}</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 flex-1">
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Frequência</div>
                <div className="text-xl font-light text-primary">{mode.data.frequency.toFixed(2)} Hz</div>
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Amplitude</div>
                <div className="text-xl font-light">{mode.data.amplitude.toFixed(2)} pT</div>
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Qualidade</div>
                <StatusBadge status={mode.data.quality} />
              </div>
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Atualização</div>
                <div className="text-sm font-medium mt-1">{new Date(mode.data.lastUpdate).toLocaleTimeString()}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
