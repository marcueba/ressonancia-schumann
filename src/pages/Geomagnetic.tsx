import { useSEO } from '../hooks/useSEO';
import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { GeomagneticData } from '../types';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Compass } from 'lucide-react';

export function Geomagnetic() {
  useSEO({ title: "Atividade Geomagnética | Observatório da Terra", description: "Acompanhe a atividade geomagnética por meio dos dados do NOAA Space Weather Prediction Center e entenda sua relação contextual com a Ressonância de Schumann.", path: "/geomagnetica" });

  const [data, setData] = useState<GeomagneticData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dataProvider.getGeomagneticData().then(res => {
      if (!res) setError(true);
      else setData(res);
    }).catch(() => setError(true))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return <div className="p-8">Carregando...</div>;
  if (error || !data) return <div className="p-8 text-center text-rose-400">Dados geomagnéticos temporariamente indisponíveis.</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Atividade Geomagnética</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          Monitoramento do Índice Kp, um indicador global da atividade magnética da Terra gerada pela interação do vento solar com a magnetosfera.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <Compass className="w-12 h-12 text-primary mb-6 opacity-80" />
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Índice Kp Atual</div>
          <div className="text-6xl font-light text-text-main mb-4">{data.currentKp}</div>
          <StatusBadge status={data.status} />
        </Card>

        <Card className="flex flex-col justify-center p-8">
          <h2 className="text-lg font-medium mb-6">Escala Kp</h2>
          <ul className="space-y-4">
            <li className="flex items-center justify-between">
              <span className="text-text-muted">Kp 0–2</span>
              <StatusBadge status="Calma" />
            </li>
            <li className="flex items-center justify-between">
              <span className="text-text-muted">Kp 3</span>
              <StatusBadge status="Instável" />
            </li>
            <li className="flex items-center justify-between">
              <span className="text-text-muted">Kp 4</span>
              <StatusBadge status="Ativa" />
            </li>
            <li className="flex items-center justify-between">
              <span className="text-text-muted">Kp 5+</span>
              <StatusBadge status="Tempestade Geomagnética" />
            </li>
          </ul>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-2">
          <h2 className="text-lg font-medium">Histórico Recente (Últimas 24h)</h2>
          <span className="text-xs text-text-muted uppercase tracking-wider">Horários em UTC</span>
        </div>
        <div className="flex items-end gap-1 sm:gap-2 h-48 pt-8">
          {data.recentKp.map((item, i) => {
            const dateObj = item.time ? new Date(item.time) : null;
            const timeStr = dateObj ? dateObj.toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' }) : '--:--';
            
            return (
              <div 
                key={i} 
                className="flex-1 flex flex-col items-center justify-end h-full group relative"
              >
                {/* Tooltip Visual Customizado */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 bg-surface border border-border p-3 rounded-md shadow-lg text-xs z-10 w-max pointer-events-none text-center flex flex-col gap-1 left-1/2 -translate-x-1/2">
                  <div className="font-medium text-text-main">Horário: {timeStr} UTC</div>
                  <div className="text-text-muted">Kp: <span className="font-medium text-text-main">{item.kp}</span></div>
                  <div className="text-[10px] text-text-muted/60 mt-1 uppercase tracking-wider">Fonte: NOAA SWPC</div>
                </div>

                <span className="text-xs font-medium text-text-main mb-2">{item.kp}</span>
                <div 
                  className="w-full bg-primary/40 rounded-t-sm transition-all group-hover:bg-primary/60" 
                  style={{ height: `${Math.max((item.kp / 9) * 100, 2)}%` }}
                />
                <span className="text-[9px] sm:text-[10px] text-text-muted mt-2">{timeStr}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
