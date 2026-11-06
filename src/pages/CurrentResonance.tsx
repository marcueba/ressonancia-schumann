import { useSEO } from '../hooks/useSEO';
import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { CurrentResonanceData } from '../types';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Activity, Info } from 'lucide-react';
import { SchumannSpectrogramPanel } from '../components/SchumannSpectrogramPanel';
import { ShareCardModal } from '../components/ShareCardModal';
import { Share2 } from 'lucide-react';
import { SchumannTimes } from '../components/SchumannTimes';
import { schumannAvailability, schumannStatus } from '../utils/schumannState';
import { isSchumannFrequency } from '../../shared/schumann';

export function CurrentResonance() {
  useSEO({ title: "Dados Atuais da Ressonância Schumann | Frequências Hoje", description: "Últimas observações da Ressonância Schumann hoje. Monitoramento das frequências F1, F2, F3 e intensidade relativa derivadas do espectrograma.", path: "/atual" });

  const [data, setData] = useState<CurrentResonanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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

  const availability = schumannAvailability(data);
  const observedModes = availability === 'unavailable' ? [] : [
    { name: 'F1 (Fundamental)', mode: data?.fundamental },
    { name: 'F2', mode: data?.mode2 }, { name: 'F3', mode: data?.mode3 },
    { name: 'F4', mode: data?.mode4 }, { name: 'F5', mode: data?.mode5 },
  ].flatMap(({ name, mode }) => isSchumannFrequency(mode?.frequency)
    ? [{ name, freq: mode.frequency, quality: mode.quality }] : []);

  const theoreticalModes = [
    { name: "F1", freq: "~7.83" },
    { name: "F2", freq: "~14.3" },
    { name: "F3", freq: "~20.8" },
    { name: "F4", freq: "~27.3" },
    { name: "F5", freq: "~33.8" }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Painel Observacional</h1>
          <p className="text-text-muted max-w-3xl leading-relaxed">
            Monitoramento derivado da atividade eletromagnética ELF associada às Ressonâncias de Schumann.
          </p>
        </div>
        <button 
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border hover:border-gold/50 text-gold text-sm font-medium rounded-lg transition-colors uppercase tracking-widest whitespace-nowrap"
        >
          <Share2 className="w-4 h-4" />
          <span>Criar Share Card</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle as="h2" className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              {schumannStatus(data)}
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
              <div className="text-sm text-rose-400 py-4 text-center">{data ? 'A fonte não forneceu frequências válidas. Não há observação numérica disponível.' : 'Não foi possível consultar os dados Schumann.'}</div>
            )}
            {data && (
              <div className="pt-4 border-t border-border/50 text-xs text-text-muted flex flex-col gap-2 sm:flex-row sm:justify-between">
                <SchumannTimes data={data} zone="UTC" />
                <span>Estação: {data.source || 'Tomsk'}</span>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle as="h2">Médias Históricas / Teóricas</CardTitle>
          <CardDescription>Valores não constituem observações.</CardDescription>
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
      
      <div className="mt-6">
          <SchumannSpectrogramPanel 
            currentF1={data?.fundamental?.frequency}
            currentF2={data?.mode2?.frequency}
            currentF3={data?.mode3?.frequency}
            timestamp={data?.estimated_observation_at ?? data?.timestamp}
            sourceUpdatedAt={data?.source_updated_at}
            historical={data?.is_historical}
          />
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
            A estação de Tomsk publica um espectrograma ELF. Quando disponíveis, as frequências são estimativas computacionais produzidas por um serviço externo. Não são telemetria numérica bruta do instrumento. A imagem e o JSON são consultados separadamente; a disponibilidade de um não comprova a do outro.
          </p>
        </Card>
      )}

      <ShareCardModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)}
        data={{
          f1: data?.fundamental?.frequency ?? null,
          f2: data?.mode2?.frequency ?? null,
          f3: data?.mode3?.frequency ?? null,
          intensity: data?.relativeIntensity?.value ?? null,
          timestamp: data?.estimated_observation_at ?? data?.timestamp ?? null,
          sourceUpdatedAt: data?.source_updated_at ?? null,
          historical: data?.is_historical,
          availability
        }}
      />
    </div>
  );
}
