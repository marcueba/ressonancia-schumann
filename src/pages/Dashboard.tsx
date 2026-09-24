import { useSEO } from '../hooks/useSEO';
import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { CurrentResonanceData, EarthResonanceIndex, GeomagneticData, SolarData } from '../types';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Activity, Radio, Sun, Compass, Globe2 } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function Dashboard() {
  useSEO({ title: "Ressonância Schumann | Observatório da Terra", description: "Observatório da Terra dedicado ao monitoramento da Ressonância de Schumann, atividade geomagnética e atividade solar, com transparência sobre fontes e metodologia.", path: "/" });

  const [isLoading, setIsLoading] = useState(true);
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
      } finally {
        setIsLoading(false);
      }
    }
    load();
    const interval = setInterval(load, 300000); // 5 mins
    return () => clearInterval(interval);
  }, []);

  const spectrumData = current ? [
    { freq: current.fundamental.frequency, amp: current.fundamental.amplitude, name: 'Modo 1', quality: current.fundamental.quality },
    { freq: current.mode2.frequency, amp: current.mode2.amplitude, name: 'Modo 2', quality: current.mode2.quality },
    { freq: current.mode3.frequency, amp: current.mode3.amplitude, name: 'Modo 3', quality: current.mode3.quality },
    { freq: current.mode4.frequency, amp: current.mode4.amplitude, name: 'Modo 4', quality: current.mode4.quality },
    { freq: current.mode5.frequency, amp: current.mode5.amplitude, name: 'Modo 5', quality: current.mode5.quality }
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
            --
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
          <CardTitle as="h2">Modos Observados</CardTitle>
          <CardDescription>Frequência e amplitude dos modos observados.</CardDescription>
        </div>
        {!current ? (
          <div className="h-[400px] w-full p-6 flex flex-col items-center justify-center text-center">
            <Activity className="w-12 h-12 text-text-muted mb-4 opacity-50" />
            <h2 className="text-xl font-medium text-text-main mb-2">Dados ELF primários indisponíveis</h2>
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
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis 
                  type="number" 
                  dataKey="freq" 
                  name="Frequência" 
                  unit=" Hz" 
                  stroke="var(--color-text-muted)" 
                  tick={{fill: 'var(--color-text-muted)'}} 
                  domain={[0, 40]} 
                />
                <YAxis 
                  type="number" 
                  dataKey="amp" 
                  name="Amplitude" 
                  stroke="var(--color-text-muted)" 
                  tick={{fill: 'var(--color-text-muted)'}} 
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-surface border border-border p-3 rounded-lg shadow-lg">
                          <p className="font-medium text-text-main mb-1">{data.name}</p>
                          <p className="text-sm text-text-muted">Frequência: <span className="text-primary">{data.freq.toFixed(2)} Hz</span></p>
                          <p className="text-sm text-text-muted">Amplitude: <span className="text-text-main">{data.amp.toFixed(2)}</span></p>
                          <p className="text-sm text-text-muted">Qualidade: <span className="text-text-main">{data.quality}</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter name="Modos" data={spectrumData} fill="var(--color-primary)" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-text-muted" />
              <CardTitle as="h2">Atividade Geomagnética</CardTitle>
            </div>
          </CardHeader>
          <div className="flex items-center justify-between mb-4">
            {isLoading && !geo ? (
               <div className="text-sm text-text-muted">Buscando...</div>
            ) : !geo ? (
               <div className="text-sm text-rose-400">Dados geomagnéticos temporariamente indisponíveis.</div>
            ) : (
              <>
                <div>
                  <div className="text-3xl font-light text-text-main mb-1">Kp {geo.currentKp ?? '--'}</div>
                  <StatusBadge status={geo.status} />
                </div>
                <div className="text-right">
                  <div className="text-sm text-text-muted">Fonte</div>
                  <div className="text-sm font-medium">{geo.dataSource || '--'}</div>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-text-muted" />
              <CardTitle as="h2">Atividade Solar</CardTitle>
            </div>
          </CardHeader>
          <div className="flex items-center justify-between mb-4">
            {isLoading && !solar ? (
               <div className="text-sm text-text-muted">Buscando...</div>
            ) : !solar ? (
               <div className="text-sm text-rose-400">Dados solares temporariamente indisponíveis.</div>
            ) : (
              <>
                <div>
                  <div className="text-3xl font-light text-text-main mb-1">Fluxo {solar.solarFlux ?? '--'}</div>
                  <StatusBadge status={solar.status} />
                </div>
                <div className="text-right">
                  <div className="text-sm text-text-muted">Fonte</div>
                  <div className="text-sm font-medium">{solar.dataSource || '--'}</div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Proveniência dos Dados</CardTitle>
          <CardDescription>Auditoria de fontes e tipos de dados da plataforma.</CardDescription>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm mt-4">
          <div className="space-y-6">
            <div>
              <div className="font-bold text-text-main mb-2 tracking-wider">SCHUMANN</div>
              {isLoading ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-text-muted">Fonte atual:</span>
                  <span className="font-medium text-text-main">Carregando...</span>
                  <span className="text-text-muted">Tipo:</span>
                  <span className="font-medium text-text-main">Carregando...</span>
                  <span className="text-text-muted">Medição primária:</span>
                  <span className="font-medium text-text-main">Carregando...</span>
                </div>
              ) : !current ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-text-muted">Fonte atual:</span>
                  <span className="font-medium text-rose-400">Nenhuma — fonte ELF primária não conectada</span>
                  <span className="text-text-muted">Tipo:</span>
                  <span className="font-medium text-text-muted">Sem dados de medição</span>
                  <span className="text-text-muted">Medição primária:</span>
                  <span className="font-medium text-text-muted">Não disponível</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-text-muted">Fonte atual:</span>
                  <span className="font-medium text-text-main">{current.source_type || 'Fonte desconhecida'}</span>
                  <span className="text-text-muted">Tipo:</span>
                  <span className={`font-medium ${current.is_demo ? 'text-amber-400' : 'text-text-main'}`}>
                    {current.is_demo ? 'Dados demonstrativos' : 'Medição real'}
                  </span>
                  <span className="text-text-muted">Medição primária:</span>
                  <span className="font-medium text-text-main">
                    {current.is_demo ? 'Não' : 'Sim'}
                  </span>
                </div>
              )}
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
