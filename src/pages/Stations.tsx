import { useSEO } from '../hooks/useSEO';
import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { Station } from '../types';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MapPin } from 'lucide-react';

export function Stations() {
  useSEO({ title: "Estações de Monitoramento ELF | Observatório da Terra", description: "Conheça as estações e fontes de referência utilizadas no monitoramento ELF e no contexto científico da Ressonância de Schumann.", path: "/estacoes" });

  const [stations, setStations] = useState<Station[]>([]);

  useEffect(() => {
    dataProvider.getStations().then(setStations).catch(console.error);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Estações de Monitoramento</h1>
          <p className="text-text-muted max-w-2xl">
            Estações de referência e monitoramento ELF
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {stations.map(station => (
          <Card key={station.id} className="relative overflow-hidden group hover:border-border/80 transition-colors">
            <div className="absolute top-0 right-0 p-4">
              <StatusBadge status={station.status} />
            </div>
            
            <CardHeader>
              <div className="flex items-center gap-2 text-text-muted mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm uppercase tracking-wider">{station.country}</span>
              </div>
              <CardTitle className="text-xl">{station.name}</CardTitle>
            </CardHeader>
            
            <div className="space-y-4 mt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Latitude</div>
                  <div className="text-sm font-medium">{station.latitude.toFixed(4)}°</div>
                </div>
                <div>
                  <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Longitude</div>
                  <div className="text-sm font-medium">{station.longitude.toFixed(4)}°</div>
                </div>
              </div>
              
              <div className="pt-4 border-t border-border">
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Fonte de Dados</div>
                <div className="text-sm font-medium">{station.dataSource}</div>
                <div className="text-xs text-text-muted mt-1">Licença: {station.license}</div>
              </div>
              
              <div className="pt-2">
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Qualidade do Sinal</div>
                <StatusBadge status={station.quality} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
