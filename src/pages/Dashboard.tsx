import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { dataProvider } from '../data/dataProvider';
import { loadDashboardSources, type DashboardSources } from '../data/dashboardSources';
import type { HistoricalDataPoint } from '../types';
import { SchumannTimelineChart, type Range } from '../components/SchumannTimelineChart';
import { OverviewSpectrograms } from '../components/OverviewSpectrograms';
import { XRayChart } from '../components/XRayChart';
import { KpChart, prepareKpChart } from '../components/KpChart';
import { LinearTrendChart } from '../components/LinearTrendChart';
import { formatNoaaObservationTime, formatObservationTime } from '../utils/observationTime';
import { displayFrequency, schumannAvailability, schumannStatus } from '../utils/schumannState';
import { isPositiveFlux } from '../utils/xrayData';
import { isSchumannFrequency } from '../../shared/schumann';

type LoadingSources = Record<keyof DashboardSources, boolean>;

function OverviewCard({ id, title, href, source, children }: {
  id: string; title: string; href: string; source?: string; children: ReactNode;
}) {
  return <section id={id} aria-labelledby={`${id}-heading`} className="overview-card">
    <header className="overview-card-heading">
      <div className="flex min-w-0 flex-wrap items-center gap-2.5">
        <h2 id={`${id}-heading`} className="text-xl font-medium tracking-tight text-text-main 2xl:text-2xl">{title}</h2>
        {source && <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-text-muted">{source}</span>}
      </div>
      <Link to={href} aria-label={`Ver detalhes de ${title}`} className="overview-detail-link">
        <span>Ver detalhes</span><ArrowUpRight size={16} aria-hidden="true" />
      </Link>
    </header>
    {children}
  </section>;
}

function ObservationTime({ value }: { value?: string | null }) {
  return <p className="mt-1 text-[11px] leading-4 text-text-muted">{formatNoaaObservationTime(value, 'UTC')}</p>;
}

function decimal(value: number | null | undefined, digits = 1) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('pt-BR', { maximumFractionDigits: digits }) : '—';
}

export interface OverviewViewProps extends DashboardSources {
  loading: LoadingSources;
  historyData: HistoricalDataPoint[];
  historyRange: Range;
  historyLoading: boolean;
  historyError: boolean;
  onRangeChange: (range: Range) => void;
  demo?: boolean;
}

/** Only supplied observations are displayed; loading, absence and failure remain distinct. */
export function OverviewView({ current, solar, geo, loading, historyData, historyRange, historyLoading, historyError, onRangeChange, demo = false }: OverviewViewProps) {
  const hasNumeric = schumannAvailability(current) !== 'unavailable';
  const modes = [current?.fundamental?.frequency, current?.mode2?.frequency, current?.mode3?.frequency];
  const xray = solar?.currentXRay;
  const kpHistory = geo?.history?.length ? geo.history : (geo?.recentKp ?? []).map(point => ({ time_tag: point.time, kp: point.kp }));
  const lastKp = prepareKpChart(kpHistory).at(-1);
  const readingTime = current?.estimated_observation_at ?? current?.timestamp;

  return <div className="overview-root [overflow-wrap:anywhere]">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-3xl font-medium tracking-tight sm:text-4xl">Visão geral</h1>
        <p className="mt-1.5 text-sm text-text-muted sm:text-base">Espectrogramas, frequências e clima espacial.</p>
      </div>
      {(demo || current?.is_demo) && <span className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-200">Demonstração · dados simulados</span>}
    </header>

    <div className="overview-grid">
      <OverviewCard id="campo-elf" title="Dados ELF" href="/atual">
        <div className="overview-frequencies" aria-label="Frequências derivadas da fonte secundária">
          {modes.map((value, index) => <div key={index} className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-text-muted">F{index + 1}</span>
            <span className="whitespace-nowrap text-xl font-semibold tabular-nums text-primary 2xl:text-2xl">
              {hasNumeric ? displayFrequency(value, 2).replace('.', ',') : '—'}
              {hasNumeric && isSchumannFrequency(value) && <span className="ml-1 text-sm font-normal">Hz</span>}
            </span>
          </div>)}
        </div>
        <div className="mb-3 space-y-1 text-xs leading-4 text-text-muted" role="status">
          <p>{loading.current ? 'Consultando frequências derivadas…' : schumannStatus(current)}{hasNumeric && ` · ${current?.source || 'Fonte não identificada'} · independente do BGS.`}</p>
          {hasNumeric && <>
            <p>Leitura derivada estimada: {formatObservationTime(readingTime, 'UTC')}</p>
          </>}
        </div>
        <OverviewSpectrograms />
      </OverviewCard>

      <OverviewCard id="historico-elf" title="Histórico ELF" href={`/historico?range=${historyRange}`}>
        <SchumannTimelineChart data={historyData} loading={historyLoading} error={historyError} range={historyRange} onRangeChange={onRangeChange} showCoverageStats={false} compact />
      </OverviewCard>

      <OverviewCard id="atividade-solar" title="Atividade solar" href="/solar" source="NOAA">
        {loading.solar ? <div className="overview-source-state" role="status">Consultando os produtos solares…</div>
          : !solar ? <div className="overview-source-state text-rose-300" role="alert">Não foi possível consultar os dados solares.</div>
            : <>
              <div className="overview-solar-grid">
                <div className="min-w-0">
                  <h3 className="text-sm text-text-muted">Raios X · GOES</h3>
                  <p className="overview-indicator text-primary">{isPositiveFlux(xray?.flux) ? xray?.flareClass : '—'}</p>
                  <ObservationTime value={xray?.timestamp} />
                  <XRayChart data={solar.xrayHistory ?? []} unavailableReason="Histórico indisponível" compact />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm text-text-muted">Vento solar</h3>
                  <p className="overview-indicator text-gold">{decimal(solar.solarWindSpeed, 0)} <span className="text-sm font-normal">km/s</span></p>
                  <ObservationTime value={solar.solarWindSpeedTimestamp ?? solar.solarWindTimestamp} />
                  <LinearTrendChart data={solar.solarWindHistory ?? []} unit="km/s" label="Vento solar" color="var(--color-gold)" compact />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm text-text-muted">Bz</h3>
                  <p className="overview-indicator text-sky-300">{decimal(solar.bz)} <span className="text-sm font-normal">nT</span></p>
                  <ObservationTime value={solar.bzTimestamp ?? solar.imfTimestamp} />
                  <LinearTrendChart data={solar.bzHistory ?? []} unit="nT" label="Bz" color="#7dd3fc" compact />
                </div>
              </div>
              <p className="overview-card-note">NOAA SWPC · Produtos e unidades independentes; horários em UTC.</p>
            </>}
      </OverviewCard>

      <OverviewCard id="atividade-geomagnetica" title="Atividade geomagnética" href="/geomagnetica" source="NOAA">
        {loading.geo ? <div className="overview-source-state" role="status">Consultando o índice Kp…</div>
          : !geo ? <div className="overview-source-state text-rose-300" role="alert">Não foi possível consultar os dados geomagnéticos.</div>
            : <>
              <div className="overview-kp-grid">
                <div className="min-w-0">
                  <h3 className="text-sm text-text-muted">Índice Kp</h3>
                  <p className="mt-2 text-5xl font-light tabular-nums text-primary">{decimal(geo.currentKp)}</p>
                  <p className="mt-2 text-xs text-text-muted">{geo.status}</p>
                  <ObservationTime value={geo.timestamp ?? lastKp?.time_tag} />
                </div>
                <div className="min-w-0"><KpChart data={kpHistory} compact /></div>
              </div>
              <p className="overview-card-note">NOAA SWPC · Kp de 0 a 9 · Período da série indicado no gráfico.</p>
            </>}
      </OverviewCard>
    </div>
  </div>;
}

export function Dashboard() {
  useSEO({ title: 'Visão geral | Observatório da Ressonância Schumann', description: 'Espectrogramas, frequências derivadas, histórico ELF e contexto solar e geomagnético, com fontes e períodos identificados.', path: '/' });
  const [sources, setSources] = useState<DashboardSources>({ current: null, solar: null, geo: null });
  const [loading, setLoading] = useState<LoadingSources>({ current: true, solar: true, geo: true });
  const [demo, setDemo] = useState(false);
  const [historyData, setHistoryData] = useState<HistoricalDataPoint[]>([]);
  const [historyRange, setHistoryRange] = useState<Range>('90d');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    let active = true;
    void dataProvider.getConfig().then(config => { if (active) setDemo(config.mode === 'demo'); }).catch(() => {});
    const load = () => loadDashboardSources(dataProvider, settled => {
      if (!active) return;
      setSources(previous => ({ ...previous, ...settled }));
      setLoading(previous => ({ ...previous, ...Object.fromEntries(Object.keys(settled).map(key => [key, false])) }));
    });
    void load();
    const interval = setInterval(load, 300_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    let active = true;
    setHistoryLoading(true);
    setHistoryError(false);
    dataProvider.getHistoricalData(historyRange).then(result => {
      if (!active) return;
      setHistoryData(result);
      setHistoryLoading(false);
    }).catch(() => {
      if (!active) return;
      setHistoryError(true);
      setHistoryLoading(false);
    });
    return () => { active = false; };
  }, [historyRange]);

  function selectHistoryRange(range: Range) {
    if (range === historyRange) return;
    setHistoryLoading(true);
    setHistoryError(false);
    setHistoryRange(range);
  }

  return <OverviewView {...sources} loading={loading} historyData={historyData} historyRange={historyRange} historyLoading={historyLoading} historyError={historyError} onRangeChange={selectHistoryRange} demo={demo} />;
}
