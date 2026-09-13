import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { SolarData } from '../types';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Sun } from 'lucide-react';

export function Solar() {
  const [data, setData] = useState<SolarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dataProvider.getSolarData()
      .then(res => {
        if (res) {
          setData(res);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="p-8 text-text-muted">Carregando...</div>;
  }

  if (error || !data) {
    return <div className="p-8 text-rose-400">Dados solares temporariamente indisponíveis.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Atividade Solar</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          A atividade solar e o clima espacial influenciam o ambiente eletromagnético e ionosférico da Terra. Esses dados são apresentados aqui como contexto para a análise das condições geofísicas, não como uma medição direta da Ressonância de Schumann.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center justify-center py-10 text-center">
          <Sun className="w-10 h-10 text-gold mb-6 opacity-80" />
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Fluxo Solar</div>
          <div className="text-5xl font-light text-text-main mb-4">{data.solarFlux ?? 'Não disponível'}</div>
          {data.status && <StatusBadge status={data.status} />}
        </Card>

        <Card className="flex flex-col items-center justify-center py-10 text-center">
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Manchas Solares</div>
          <div className="text-5xl font-light text-text-main mb-4">{data.sunspots ?? 'Não disponível'}</div>
        </Card>

        <Card className="flex flex-col items-center justify-center py-10 text-center">
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Flares Recentes</div>
          <div className="text-5xl font-light text-primary mb-4">{data.flares ?? 'Não disponível'}</div>
        </Card>
      </div>
      
      <div className="mt-4">
        <p className="text-sm text-text-muted font-medium">
          Fonte: NOAA SWPC — dados de atividade solar contextual.
        </p>
      </div>

      <div className="bg-surface-hover/20 border border-border/50 rounded-lg p-6 mt-6">
        <p className="text-sm text-text-muted text-center italic">
          Os dados apresentados são observações de campos eletromagnéticos naturais. A plataforma não atribui automaticamente efeitos psicológicos, médicos ou espirituais às variações observadas.
        </p>
      </div>
    </div>
  );
}
