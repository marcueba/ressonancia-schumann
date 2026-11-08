import { Link } from 'react-router-dom';
import { useSEO } from '../hooks/useSEO';
import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { loadDashboardSources } from '../data/dashboardSources';
import { CurrentResonanceData, GeomagneticData, SolarData, HistoricalDataPoint } from '../types';
import { Card, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Activity, Sun, Compass, Globe2 } from 'lucide-react';
import { SchumannTimelineChart, Range } from '../components/SchumannTimelineChart';
import { SchumannSpectrogramPanel } from '../components/SchumannSpectrogramPanel';
import { SocialShare } from '../components/SocialShare';
import { ShareCardModal } from '../components/ShareCardModal';
import { Share2 } from 'lucide-react';
import { formatNoaaObservationTime } from '../utils/observationTime';
import { SchumannOverview } from '../components/SchumannOverview';
import { LastHistoryPeriodAction } from '../components/LastHistoryPeriodAction';
import { schumannAvailability } from '../utils/schumannState';
import { isRelativeIntensity } from '../../shared/schumann';

export function Dashboard() {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  useSEO({ title: "Ressonância Schumann Hoje | Dados, Gráficos e Monitoramento", description: "Acompanhe a Ressonância Schumann hoje com frequências F1, F2 e F3, espectrograma, histórico observacional e contexto geomagnético e solar.", path: "/" });

  const [isLoading, setIsLoading] = useState(true);
  const [current, setCurrent] = useState<CurrentResonanceData | null>(null);
  const [geo, setGeo] = useState<GeomagneticData | null>(null);
  const [solar, setSolar] = useState<SolarData | null>(null);

  const [historyData, setHistoryData] = useState<HistoricalDataPoint[]>([]);
  const [historyRange, setHistoryRange] = useState<Range>('7d');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const sources = await loadDashboardSources();
        setCurrent(sources.current);
        setGeo(sources.geo);
        setSolar(sources.solar);
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
    let active = true;
    setHistoryLoading(true);
    setHistoryError(false);
    dataProvider.getHistoricalData(historyRange)
      .then(res => {
        if (!active) return;
        setHistoryData(res);
        setHistoryLoading(false);
      })
      .catch(err => {
        if (!active) return;
        console.error(err);
        setHistoryError(true);
        setHistoryLoading(false);
      });
    return () => { active = false; };
  }, [historyRange]);

  const availability = schumannAvailability(current);
  return (
    <div className="space-y-8 animate-in fade-in duration-700 [overflow-wrap:anywhere]">
      <div className="text-center py-12 relative">
        <div className="absolute inset-0 bg-primary-glow blur-[120px] rounded-full opacity-20 pointer-events-none" />
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-light leading-tight tracking-[0.08em] md:tracking-[0.2em] text-text-main mb-4 break-words [overflow-wrap:anywhere]">MONITORAMENTO DA RESSONÂNCIA DE SCHUMANN</h1>
        <p className="text-lg text-text-muted font-light tracking-wide max-w-4xl mx-auto">
          Frequências derivadas, histórico e contexto geofísico, com fontes identificadas.
        </p>
      </div>

      <section aria-label="Dados Schumann" className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SchumannOverview data={current} loading={isLoading}>
          <LastHistoryPeriodAction data={historyData} range={historyRange} loading={historyLoading} error={historyError} className="mt-4" />
        </SchumannOverview>

        <Card className="flex flex-col items-center justify-center py-8 text-center bg-surface-hover/20 relative group">
          <Activity className="w-8 h-8 text-violet mb-4" />
          <div className="text-4xl font-light text-text-main mb-1 tracking-tight">
            {isRelativeIntensity(current?.relativeIntensity?.value) ? (
              <>{current.relativeIntensity.value.toFixed(1)} <span className="text-xl text-text-muted">/ 100</span></>
            ) : '--'}
          </div>
          <div className="text-sm tracking-widest text-text-muted uppercase">
            Intensidade Relativa
          </div>
          <div className="text-[10px] text-text-muted mt-2">
            Derivada da escala de cor &bull; Não calibrada em pT
          </div>
          <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-surface p-2 rounded text-xs border border-white/10 -bottom-8 w-64 max-w-full break-words z-10 pointer-events-none shadow-lg">
            Índice relativo extraído da escala visual do espectrograma. Não representa amplitude física calibrada.
          </div>
        </Card>

        <Link to="/indice" className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
        <Card className="flex flex-col items-center justify-center py-8 text-center relative overflow-hidden hover:bg-surface-hover/30 transition-colors h-full">
          <div className="absolute top-0 left-0 w-full h-1 bg-gold/40" />
          <Globe2 className="w-8 h-8 text-gold mb-4" />
          <div className="text-2xl font-light text-text-main mb-1 tracking-tight">
            Em desenvolvimento
          </div>
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Earth Resonance Index</div>
          <div className="px-3 py-1 rounded-full text-xs font-medium border bg-gold/10 text-gold border-gold/20">
            ÍNDICE EXPERIMENTAL
          </div>
        </Card>
        </Link>
      </div>

      </section>

      <div className="space-y-4 mt-8 mb-8">
        <div className="flex flex-col gap-1 mb-4">
          <h2 className="text-xl font-medium text-text-main">Contexto solar e geomagnético</h2>
          <p className="text-sm text-text-muted">
            Indicadores independentes; não são medições Schumann.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      <div className="text-3xl font-light text-text-main">{geo.currentKp ?? '--'}</div>
                    </div>
                    <StatusBadge status={geo.status} />
                  </div>

                  <div className="space-y-1 pt-3 border-t border-border">
                    <div className="flex flex-col gap-1 text-[11px]">
                      <span className="text-text-muted">Última observação disponível</span>
                      <span className="text-text-main font-medium">{formatNoaaObservationTime(geo.recentKp?.[geo.recentKp.length - 1]?.time, 'America/Sao_Paulo')}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted">Fonte</span>
                      <span className="text-text-main">{geo.dataSource}</span>
                    </div>
                  </div>
                </>
              )}
              <Link to="/geomagnetica" className="inline-block self-start text-sm text-primary mt-4 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Ver atividade geomagnética</Link>
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
                  <div className="grid grid-cols-1 gap-4 mb-4 mt-2">
                    <div>
                      <div className="text-[10px] text-text-muted uppercase mb-1">Vento Solar</div>
                      <div className="text-2xl font-light text-text-main">{solar.solarWindSpeed != null ? `${solar.solarWindSpeed}` : '--'} <span className="text-[10px] text-text-muted">km/s</span></div>
                      <p className="text-[11px] text-text-muted mt-1">{formatNoaaObservationTime(solar.solarWindTimestamp, 'America/Sao_Paulo')}</p>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase mb-1">IMF (Bz)</div>
                      <div className="text-2xl font-light text-text-main">{solar.bz != null ? `${solar.bz}` : '--'} <span className="text-[10px] text-text-muted">nT</span></div>
                      <p className="text-[11px] text-text-muted mt-1">{formatNoaaObservationTime(solar.imfTimestamp, 'America/Sao_Paulo')}</p>
                    </div>
                    <div>
                      <div className="text-[10px] text-text-muted uppercase mb-1">Raios X</div>
                      <div className="text-2xl font-light text-text-main">{solar.currentXRay?.flareClass || '--'}</div>
                      <p className="text-[11px] text-text-muted mt-1">{formatNoaaObservationTime(solar.currentXRay?.timestamp, 'America/Sao_Paulo')}</p>
                    </div>
                  </div>

                  <div className="space-y-1 pt-3 border-t border-border">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted">Fonte</span>
                      <span className="text-text-main">{solar.dataSource}</span>
                    </div>
                  </div>
                </>
              )}
              <Link to="/solar" className="inline-block self-start text-sm text-primary mt-4 rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Ver atividade solar</Link>
            </div>
          </Card>
        </div>
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

      <div className="mt-8 mb-8">
        <SchumannSpectrogramPanel
          currentF1={current?.fundamental?.frequency}
          currentF2={current?.mode2?.frequency}
          currentF3={current?.mode3?.frequency}
          timestamp={current?.estimated_observation_at ?? current?.timestamp}
          sourceUpdatedAt={current?.source_updated_at}
          historical={current?.is_historical}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle as="h2">Proveniência dos Dados</CardTitle>
          <CardDescription>Fontes e natureza dos indicadores apresentados.</CardDescription>
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
                  <span className="font-medium text-rose-400">Consulta indisponível</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-text-muted">Estação:</span>
                  <span className="font-medium text-text-main">{current?.source || 'Tomsk / SOS-70'}</span>
                  <span className="text-text-muted">Tipo:</span>
                  <span className="font-medium text-text-main">Espectrograma ELF</span>
                  <span className="text-text-muted">Natureza dos valores:</span>
                  <span className="font-medium text-text-main">Estimativas derivadas, quando fornecidas pela fonte</span>
                  <span className="text-text-muted">Processamento:</span>
                  <span className="font-medium text-text-main">{current.processing_method || 'Não informado'}</span>
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
      <nav aria-label="Artigos e metodologia" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
        <Link to="/artigos" className="text-primary rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Artigos sobre a ressonância</Link>
        <Link to="/metodologia" className="text-primary rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Metodologia e fontes</Link>
      </nav>
      <SocialShare
        title="Ressonância Schumann Hoje | Observatório da Terra"
        url="https://ressonanciaschumann.com/"
      />

      <ShareCardModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        data={{
          f1: current?.fundamental?.frequency ?? null,
          f2: current?.mode2?.frequency ?? null,
          f3: current?.mode3?.frequency ?? null,
          intensity: current?.relativeIntensity?.value ?? null,
          timestamp: current?.estimated_observation_at ?? current?.timestamp ?? null,
          sourceUpdatedAt: current?.source_updated_at ?? null,
          historical: current?.is_historical,
          availability
        }}
      />
    </div>
  );
}
