import { useSEO } from '../hooks/useSEO';
import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { CurrentResonanceData, EarthResonanceIndex, GeomagneticData, SolarData, HistoricalDataPoint } from '../types';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Activity, Radio, Sun, Compass, Globe2 } from 'lucide-react';
import { SchumannTimelineChart, Range } from '../components/SchumannTimelineChart';


export function Dashboard() {
  useSEO({ title: "Ressonância Schumann | Observatório da Terra", description: "Observatório da Terra dedicado ao monitoramento da Ressonância de Schumann, atividade geomagnética e atividade solar, com transparência sobre fontes e metodologia.", path: "/" });

  const [isLoading, setIsLoading] = useState(true);
  const [current, setCurrent] = useState<CurrentResonanceData | null>(null);
  const [eri, setEri] = useState<EarthResonanceIndex | null>(null);
  const [geo, setGeo] = useState<GeomagneticData | null>(null);
  const [solar, setSolar] = useState<SolarData | null>(null);
  
  const [historyData, setHistoryData] = useState<HistoricalDataPoint[]>([]);
  const [historyRange, setHistoryRange] = useState<Range>('7d');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);

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

  useEffect(() => {
    setHistoryLoading(true);
    setHistoryError(false);
    dataProvider.getHistoricalData(historyRange)
      .then(res => {
        setHistoryData(res);
        setHistoryLoading(false);
      })
      .catch(err => {
        console.error(err);
        setHistoryError(true);
        setHistoryLoading(false);
      });
  }, [historyRange]);

  

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="text-center py-12 relative">
        <div className="absolute inset-0 bg-primary-glow blur-[120px] rounded-full opacity-20 pointer-events-none" />
        <h1 className="text-4xl md:text-5xl font-light tracking-[0.2em] text-text-main mb-4">MONITORAMENTO DA RESSONÂNCIA DE SCHUMANN</h1>
        <p className="text-lg text-text-muted font-light tracking-wide max-w-4xl mx-auto">
          O sistema está operacional, mas as observações eletromagnéticas ELF primárias ainda não estão conectadas. Os dados geomagnéticos, solares e contextuais apresentados possuem suas respectivas fontes identificadas.
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
            {eri ? eri.score : <span className="text-xl text-text-muted">Não calculado</span>} {eri && <span className="text-xl text-text-muted">/100</span>}
          </div>
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Earth Resonance Index</div>
          {eri && <StatusBadge status={eri.status} />}
        </Card>
      </div>

      

      
      
      <div className="mt-8 mb-8">
        <SchumannTimelineChart 
          data={historyData}
          loading={historyLoading}
          error={historyError}
          range={historyRange}
          onRangeChange={setHistoryRange}
          showCoverageStats={false}
        />
      </div>
      
      <div className="space-y-4 mt-8 mb-8">
        <div className="flex flex-col gap-1 mb-4">
          <h2 className="text-xl font-medium text-text-main">Contexto Geofísico Integrado</h2>
          <p className="text-sm text-text-muted">
            Os indicadores são apresentados em conjunto para contextualização geofísica. A proximidade temporal entre variações não implica, isoladamente, relação causal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Schumann Card */}
          <Card className="flex flex-col h-full p-0 overflow-hidden">
            <div className="p-4 border-b border-border bg-surface-hover/30">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Ionosfera (Terra)</h3>
                <Radio className="w-4 h-4 text-primary" />
              </div>
              <h4 className="text-sm text-text-main">Ressonância Schumann</h4>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              {isLoading && !current ? (
                <div className="text-sm text-text-muted flex-1 flex items-center justify-center">Buscando...</div>
              ) : !current ? (
                <div className="text-sm text-rose-400 flex-1 flex items-center justify-center">Dados indisponíveis no momento.</div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="bg-surface rounded p-2">
                      <div className="text-[10px] text-text-muted uppercase mb-1">F1</div>
                      <div className="text-lg font-light text-text-main">{current.fundamental?.frequency?.toFixed(1) || '--'}</div>
                    </div>
                    <div className="bg-surface rounded p-2">
                      <div className="text-[10px] text-text-muted uppercase mb-1">F2</div>
                      <div className="text-lg font-light text-text-main">{current.mode2?.frequency?.toFixed(1) || '--'}</div>
                    </div>
                    <div className="bg-surface rounded p-2">
                      <div className="text-[10px] text-text-muted uppercase mb-1">F3</div>
                      <div className="text-lg font-light text-text-main">{current.mode3?.frequency?.toFixed(1) || '--'}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted">Última observação disponível</span>
                      <span className="text-text-main font-medium">{current.timestamp ? new Date(current.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted">Proveniência</span>
                      <span className="text-text-main">{current.source_type === 'derived_spectrogram' ? 'Derivado (Espectrograma)' : current.source || '--'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Geomagnetism Card */}
          <Card className="flex flex-col h-full p-0 overflow-hidden">
            <div className="p-4 border-b border-border bg-surface-hover/30">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Magnetosfera</h3>
                <Compass className="w-4 h-4 text-cyan-400" />
              </div>
              <h4 className="text-sm text-text-main">Atividade Geomagnética</h4>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              {isLoading && !geo ? (
                <div className="text-sm text-text-muted flex-1 flex items-center justify-center">Buscando...</div>
              ) : !geo ? (
                <div className="text-sm text-rose-400 flex-1 flex items-center justify-center">Dados indisponíveis no momento.</div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4 mt-2">
                    <div>
                      <div className="text-[10px] text-text-muted uppercase mb-1">Índice Kp Atual</div>
                      <div className="text-3xl font-light text-text-main">{geo.currentKp}</div>
                    </div>
                    <StatusBadge status={geo.status} />
                  </div>
                  
                  <div className="space-y-1 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted">Última observação disponível</span>
                      <span className="text-text-main font-medium">{geo.recentKp?.[geo.recentKp.length - 1]?.time ? new Date(geo.recentKp[geo.recentKp.length - 1].time).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted">Fonte</span>
                      <span className="text-text-main">{geo.dataSource}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Solar Card */}
          <Card className="flex flex-col h-full p-0 overflow-hidden">
            <div className="p-4 border-b border-border bg-surface-hover/30">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold tracking-wider text-text-muted uppercase">Sol</h3>
                <Sun className="w-4 h-4 text-amber-400" />
              </div>
              <h4 className="text-sm text-text-main">Atividade Solar</h4>
            </div>
            <div className="p-4 flex-1 flex flex-col justify-between">
              {isLoading && !solar ? (
                <div className="text-sm text-text-muted flex-1 flex items-center justify-center">Buscando...</div>
              ) : !solar ? (
                <div className="text-sm text-rose-400 flex-1 flex items-center justify-center">Dados indisponíveis no momento.</div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 mb-4 mt-2">
                    <div>
                      <div className="text-[10px] text-text-muted uppercase mb-1">Fluxo (F10.7)</div>
                      <div className="text-3xl font-light text-text-main">{solar.solarFlux}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase mb-1">Manchas</div>
                      <div className="text-3xl font-light text-text-main">{solar.sunspots != null ? solar.sunspots : '--'}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted">Última observação disponível</span>
                      <span className="text-text-main font-medium">{solar.timestamp ? new Date(solar.timestamp).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '--'}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted">Fonte</span>
                      <span className="text-text-main">{solar.dataSource}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
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
                </div>
              ) : !current ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-text-muted">Fonte atual:</span>
                  <span className="font-medium text-rose-400">Dados ausentes no momento</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-text-muted">Estação:</span>
                  <span className="font-medium text-text-main">{current.source || 'Tomsk / SOS-70'}</span>
                  <span className="text-text-muted">Tipo:</span>
                  <span className="font-medium text-text-main">Espectrograma ELF</span>
                  <span className="text-text-muted">Valor numérico:</span>
                  <span className="font-medium text-text-main">Derivado computacionalmente da imagem</span>
                  <span className="text-text-muted">Classificação:</span>
                  <span className="font-medium text-amber-400">Observação derivada</span>
                </div>
              )}
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
