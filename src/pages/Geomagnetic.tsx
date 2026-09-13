import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { GeomagneticData } from '../types';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Compass } from 'lucide-react';

export function Geomagnetic() {
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
          <h3 className="text-lg font-medium mb-6">Escala Kp</h3>
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
        <h3 className="text-lg font-medium mb-6">Histórico Recente (Últimas 24h)</h3>
        <div className="flex items-end gap-2 h-40">
          {data.recentKp.map((item, i) => {
            const dateStr = item.time ? new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            return (
              <div 
                key={i} 
                className="flex-1 flex flex-col items-center gap-2" 
                title={`Horário: ${dateStr}
Kp: ${item.kp}`}
              >
                <div 
                  className="w-full bg-primary/40 rounded-t-sm transition-all hover:bg-primary/60" 
                  style={{ height: `${(item.kp / 9) * 100}%` }}
                />
                <span className="text-xs text-text-muted">{item.kp}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
