import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { CurrentResonanceData, EarthResonanceIndex, GeomagneticData, SolarData } from '../types';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Activity, Radio, Sun, Compass, Globe2 } from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

export function Dashboard() {
  const [current, setCurrent] = useState<CurrentResonanceData | null>(null);
  const [eri, setEri] = useState<EarthResonanceIndex | null>(null);
  const [geo, setGeo] = useState<GeomagneticData | null>(null);
  const [solar, setSolar] = useState<SolarData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [c, e, g, s] = await Promise.all([
          dataProvider.getCurrentData(),
          dataProvider.getERI(),
          dataProvider.getGeomagneticData(),
          dataProvider.getSolarData()
        ]);
        setCurrent(c);
        setEri(e);
        setGeo(g);
        setSolar(s);
      } catch (err) {
        console.error(err);
      }
    }
    load();
    const interval = setInterval(load, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  const spectrumData = current ? [
    { freq: 0, amp: 0.1 },
    { freq: 4, amp: 0.2 },
    { freq: 7.83, amp: current.fundamental.amplitude },
    { freq: 10, amp: 0.8 },
    { freq: 14.2, amp: current.mode2.amplitude },
    { freq: 17, amp: 0.5 },
    { freq: 20.5, amp: current.mode3.amplitude },
    { freq: 24, amp: 0.4 },
    { freq: 26.0, amp: current.mode4.amplitude },
    { freq: 30, amp: 0.2 },
    { freq: 33.0, amp: current.mode5.amplitude },
    { freq: 40, amp: 0.1 },
  ] : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="text-center py-12 relative">
        <div className="absolute inset-0 bg-primary-glow blur-[120px] rounded-full opacity-20 pointer-events-none" />
        <h1 className="text-4xl md:text-5xl font-light tracking-[0.2em] text-text-main mb-4">MONITORAMENTO DA RESSONÂNCIA DE SCHUMANN</h1>
        <p className="text-lg text-text-muted font-light tracking-wide max-w-4xl mx-auto">
          O sistema está operacional, mas as medições eletromagnéticas ELF primárias ainda não estão conectadas. Os dados geomagnéticos, solares e contextuais apresentados possuem suas respectivas fontes identificadas.
        </p>
        <div className="mt-6 flex justify-center">
          <div className="px-4 py-2 bg-rose-900/30 border border-rose-700/50 rounded-full text-rose-300 text-sm font-medium">
            Status: Fonte ELF primária não conectada
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center justify-center py-8 text-center bg-surface-hover/50 border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/40" />
          <Radio className="w-8 h-8 text-primary mb-4 opacity-50" />
          <div className="text-4xl font-light text-text-main mb-1 tracking-tight">
            -- <span className="text-xl text-text-muted">Hz</span>
          </div>
          <div className="text-sm tracking-widest text-text-muted uppercase">Frequência Fundamental</div>
        </Card>

        <Card className="flex flex-col items-center justify-center py-8 text-center bg-surface-hover/20">
          <Activity className="w-8 h-8 text-violet mb-4 opacity-50" />
          <div className="text-4xl font-light text-text-main mb-1 tracking-tight">
            -- <span className="text-xl text-text-muted">pT</span>
          </div>
          <div className="text-sm tracking-widest text-text-muted uppercase">Amplitude</div>
        </Card>

        <Card className="flex flex-col items-center justify-center py-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gold/40" />
          <Globe2 className="w-8 h-8 text-gold mb-4" />
          <div className="text-4xl font-light text-text-main mb-1 tracking-tight flex items-baseline gap-1">
            {eri ? eri.score : '--'} <span className="text-xl text-text-muted">/100</span>
          </div>
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Earth Resonance Index</div>
          {eri && <StatusBadge status={eri.status} />}
        </Card>
      </div>

      <Card className="p-0 overflow-hidden bg-surface-hover/20">
        <div className="p-6 border-b border-border">
          <CardTitle>Espectro da Ressonância de Schumann</CardTitle>
          <CardDescription>Visualização da amplitude por frequência.</CardDescription>
        </div>
        {!current ? (
          <div className="h-[400px] w-full p-6 flex flex-col items-center justify-center text-center">
            <Activity className="w-12 h-12 text-text-muted mb-4 opacity-50" />
            <h3 className="text-xl font-medium text-text-main mb-2">Dados ELF primários indisponíveis</h3>
            <p className="text-text-muted max-w-lg">
              A arquitetura do observatório está preparada para gerar os espectrogramas, mas nenhuma fonte ELF de alta frequência está conectada neste momento.
            </p>
          </div>
        ) : (
          <div className="h-[400px] w-full p-6 pt-8 relative">
            {current.is_demo && (
               <div className="absolute top-2 right-4 z-10 px-3 py-1 bg-amber-900/30 text-amber-500 rounded text-xs border border-amber-800/50">
                 MOCK_GENERATOR VISIBLE (DEV MODE)
               </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={spectrumData}>
                <defs>
                  <linearGradient id="colorAmp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="freq" stroke="var(--color-text-muted)" tick={{fill: 'var(--color-text-muted)'}} tickFormatter={(val) => `${val}Hz`} />
                <YAxis stroke="var(--color-text-muted)" tick={{fill: 'var(--color-text-muted)'}} tickFormatter={(val) => `${val}pT`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '8px' }}
                  itemStyle={{ color: 'var(--color-text-main)' }}
                  labelStyle={{ color: 'var(--color-text-muted)' }}
                  formatter={(value: number) => [`${value.toFixed(2)} pT`, 'Amplitude']}
                  labelFormatter={(label) => `Frequência: ${label} Hz`}
                />
                <Area type="monotone" dataKey="amp" stroke="var(--color-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorAmp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-text-muted" />
              <CardTitle>Atividade Geomagnética</CardTitle>
            </div>
          </CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-light text-text-main mb-1">Kp {geo?.currentKp || '--'}</div>
              <StatusBadge status={geo?.status || 'Buscando...'} />
            </div>
            <div className="text-right">
              <div className="text-sm text-text-muted">Fonte</div>
              <div className="text-sm font-medium">{geo?.dataSource || '--'}</div>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-text-muted" />
              <CardTitle>Atividade Solar</CardTitle>
            </div>
          </CardHeader>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-3xl font-light text-text-main mb-1">Fluxo {solar?.solarFlux || '--'}</div>
              <StatusBadge status={solar?.status || 'Buscando...'} />
            </div>
            <div className="text-right">
              <div className="text-sm text-text-muted">Fonte</div>
              <div className="text-sm font-medium">{solar?.dataSource || '--'}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Proveniência dos Dados</CardTitle>
          <CardDescription>Auditoria de fontes e tipos de dados da plataforma.</CardDescription>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm mt-4">
          <div className="space-y-6">
            <div>
              <div className="font-bold text-text-main mb-2 tracking-wider">SCHUMANN</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-text-muted">Fonte atual:</span>
                <span className="font-medium text-text-main">{current?.source_type || 'MOCK_GENERATOR'}</span>
                <span className="text-text-muted">Tipo:</span>
                <span className="font-medium text-amber-400">Dados demonstrativos</span>
                <span className="text-text-muted">Medição primária:</span>
                <span className="font-medium text-text-main">Não</span>
              </div>
            </div>

            <div>
              <div className="font-bold text-text-main mb-2 tracking-wider">GEOMAGNETISMO</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-text-muted">Fonte:</span>
                <span className="font-medium text-text-main">{geo?.dataSource || 'NOAA'}</span>
                <span className="text-text-muted">Tipo:</span>
                <span className="font-medium text-text-main">Fonte secundária/contextual</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="font-bold text-text-main mb-2 tracking-wider">SOLAR</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-text-muted">Fonte:</span>
                <span className="font-medium text-text-main">{solar?.dataSource || 'NOAA'}</span>
                <span className="text-text-muted">Tipo:</span>
                <span className="font-medium text-text-main">Fonte secundária/contextual</span>
              </div>
            </div>

            <div>
              <div className="font-bold text-text-main mb-2 tracking-wider">SUNGeo</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-text-muted">Tipo:</span>
                <span className="font-medium text-text-main">Índice agregado/contextual</span>
              </div>
            </div>

            <div>
              <div className="font-bold text-text-main mb-2 tracking-wider">ERI</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-text-muted">Status:</span>
                <span className="font-medium text-amber-400">Experimental</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
