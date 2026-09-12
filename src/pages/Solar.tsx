import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { SolarData } from '../types';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Sun } from 'lucide-react';

export function Solar() {
  const [data, setData] = useState<SolarData | null>(null);

  useEffect(() => {
    dataProvider.getSolarData().then(setData).catch(console.error);
  }, []);

  if (!data) return <div className="p-8">Carregando...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Atividade Solar</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          O clima espacial afeta diretamente a ionosfera da Terra e, consequentemente, a Ressonância de Schumann. Acompanhe a emissão de raios-X e atividade de manchas solares.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center justify-center py-10 text-center">
          <Sun className="w-10 h-10 text-gold mb-6 opacity-80" />
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Fluxo Solar</div>
          <div className="text-5xl font-light text-text-main mb-4">{data.solarFlux}</div>
          <StatusBadge status={data.status} />
        </Card>

        <Card className="flex flex-col items-center justify-center py-10 text-center">
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Manchas Solares</div>
          <div className="text-5xl font-light text-text-main mb-4">{data.sunspots}</div>
        </Card>

        <Card className="flex flex-col items-center justify-center py-10 text-center">
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Flares Recentes</div>
          <div className="text-5xl font-light text-primary mb-4">{data.flares}</div>
        </Card>
      </div>
    </div>
  );
}
