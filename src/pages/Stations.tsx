import { useSEO } from '../hooks/useSEO';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { MapPin } from 'lucide-react';

export function Stations() {
  useSEO({ title: "Estações e fontes de observação ELF | Observatório da Terra", description: "Conheça as estações e fontes de referência utilizadas no monitoramento ELF e no contexto científico da Ressonância de Schumann.", path: "/estacoes" });

  const stations = [
    {
      id: "tomsk",
      name: "Tomsk",
      country: "Rússia",
      latitude: 56.4977,
      longitude: 84.9744,
      dataSource: "SOSRFF",
      role: "Fonte observacional utilizada pelo sistema",
      type: "Espectrograma ELF"
    },
    {
      id: "bgs",
      name: "BGS Eskdalemuir",
      country: "Reino Unido",
      latitude: 55.314,
      longitude: -3.206,
      dataSource: "British Geological Survey",
      role: "Referência científica / dados instrumentais",
      type: "Magnetômetros de indução (128 Hz)"
    },
    {
      id: "sierra",
      name: "Sierra Nevada",
      country: "Espanha",
      
      dataSource: "Estudo acadêmico",
      role: "Dataset científico de validação",
      type: "Arquivos instrumentais históricos"
    },
    {
      id: "cumiana",
      name: "Cumiana",
      country: "Itália",
      
      dataSource: "Renato Romero / VLF.it",
      role: "Estação observacional externa",
      type: "Receptor VLF/ELF"
    },
    {
      id: "heartmath",
      name: "HeartMath GCI",
      country: "EUA (Global)",
      
      dataSource: "Global Coherence Initiative",
      role: "Estação observacional externa",
      type: "Rede global de magnetômetros (Licença restrita)"
    }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Estações e fontes de observação ELF</h1>
          <p className="text-text-muted max-w-2xl">
            Fontes de dados, referências científicas e estações de monitoramento eletromagnético.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {stations.map(station => (
          <Card key={station.id} className="relative overflow-hidden group hover:border-border/80 transition-colors">
            
            <CardHeader>
              <div className="flex items-center gap-2 text-text-muted mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm uppercase tracking-wider">{station.country}</span>
              </div>
              <CardTitle as="h2" className="text-xl">{station.name}</CardTitle>
            </CardHeader>
            
            <div className="space-y-4 mt-6">
              {station.latitude !== undefined && station.longitude !== undefined && (
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
              )}
              
              <div className="pt-4 border-t border-border">
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Tipo de observação</div>
                <div className="text-sm font-medium text-text-main">{station.type}</div>
              </div>
              
              <div className="pt-2">
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Papel no sistema</div>
                <div className="text-sm font-medium text-primary">{station.role}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
