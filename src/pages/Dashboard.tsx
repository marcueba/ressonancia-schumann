import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, Compass, Share2, Sun, Waves } from 'lucide-react';
import { useSEO } from '../hooks/useSEO';
import { dataProvider } from '../data/dataProvider';
import { loadDashboardSources } from '../data/dashboardSources';
import type { CurrentResonanceData, GeomagneticData, SolarData, HistoricalDataPoint } from '../types';
import { Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SchumannTimelineChart, type Range } from '../components/SchumannTimelineChart';
import { SchumannSpectrogramPanel } from '../components/SchumannSpectrogramPanel';
import { SchumannTimes } from '../components/SchumannTimes';
import { SocialShare } from '../components/SocialShare';
import { ShareCardModal } from '../components/ShareCardModal';
import { LastHistoryPeriodAction } from '../components/LastHistoryPeriodAction';
import { formatNoaaObservationTime } from '../utils/observationTime';
import { displayFrequency, schumannAvailability, schumannStatus } from '../utils/schumannState';
import { isSchumannFrequency } from '../../shared/schumann';

function Frequency({ value, decimals = 2 }: { value: number | null | undefined; decimals?: number }) {
  return <span className="whitespace-nowrap tabular-nums">
    {displayFrequency(value, decimals)}
    {isSchumannFrequency(value) && <span className="ml-1.5 text-base font-normal text-text-muted">Hz</span>}
  </span>;
}

function SectionHeading({ id, index, label, title, description, link, linkLabel }: {
  id: string;
  index: string;
  label: string;
  title: string;
  description: string;
  link?: string;
  linkLabel?: string;
}) {
  return <div className="flex flex-col gap-4 border-t border-border pt-7 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0 max-w-3xl">
      <div className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
        <span className="font-mono tabular-nums text-text-muted">{index}</span>
        <span className="h-px w-9 bg-primary/40" />
        <span>{label}</span>
      </div>
      <h2 id={id} className="text-2xl font-medium tracking-tight text-text-main sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{description}</p>
    </div>
    {link && <Link to={link} className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-lg px-1 text-sm font-medium text-primary hover:text-text-main focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary sm:self-end">
      {linkLabel} <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </Link>}
  </div>;
}

function Datum({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return <div className="min-w-0">
    <p className="text-[11px] font-medium uppercase tracking-[0.13em] text-text-muted">{label}</p>
    <p className="mt-3 break-words text-3xl font-light tracking-tight text-text-main tabular-nums sm:text-4xl">{value}</p>
    {detail && <p className="mt-2 text-xs leading-relaxed text-text-muted">{detail}</p>}
  </div>;
}

export function Dashboard() {
  useSEO({
    title: 'Ressonância Schumann Hoje | Dados, Gráficos e Monitoramento',
    description: 'Acompanhe frequências derivadas de Schumann, espectrogramas, histórico e indicadores solares e geomagnéticos, com fontes e limitações identificadas.',
    path: '/',
  });

  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [current, setCurrent] = useState<CurrentResonanceData | null>(null);
  const [geo, setGeo] = useState<GeomagneticData | null>(null);
  const [solar, setSolar] = useState<SolarData | null>(null);
  const [historyData, setHistoryData] = useState<HistoricalDataPoint[]>([]);
  const [historyRange, setHistoryRange] = useState<Range>('7d');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const sources = await loadDashboardSources();
        if (!active) return;
        setCurrent(sources.current);
        setGeo(sources.geo);
        setSolar(sources.solar);
      } catch (error) {
        console.error(error);
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load();
    const interval = setInterval(load, 300_000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    let active = true;
    setHistoryLoading(true);
    setHistoryError(false);
    dataProvider.getHistoricalData(historyRange)
      .then(result => {
        if (!active) return;
        setHistoryData(result);
        setHistoryLoading(false);
      })
      .catch(error => {
        if (!active) return;
        console.error(error);
        setHistoryError(true);
        setHistoryLoading(false);
      });
    return () => { active = false; };
  }, [historyRange]);

  const availability = schumannAvailability(current);
  const hasNumeric = availability !== 'unavailable';
  const f1 = hasNumeric ? current?.fundamental?.frequency : null;
  const f2 = hasNumeric ? current?.mode2?.frequency : null;
  const f3 = hasNumeric ? current?.mode3?.frequency : null;

  return <div className="space-y-11 pb-5 [overflow-wrap:anywhere] sm:space-y-14">
    <header className="observatory-hero relative overflow-hidden rounded-2xl border border-border px-5 py-8 sm:rounded-3xl sm:px-10 sm:py-12 lg:px-12">
      <div className="relative z-10 max-w-4xl">
        <p className="mb-5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
          Observatório geofísico independente
        </p>
        <h1 className="max-w-3xl text-4xl font-light leading-[1.06] tracking-[-0.035em] text-text-main sm:text-5xl lg:text-6xl">
          Ressonância <span className="font-medium text-primary">Schumann.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-text-muted sm:text-base">
          Um olhar sobre o campo eletromagnético da Terra — frequências ELF, atividade solar e condições geomagnéticas, com dados identificados e sem interpretações não comprovadas.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/atual" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-text-main focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            Explorar dados ELF <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button type="button" onClick={() => setIsShareModalOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-medium text-text-main hover:border-primary/60 hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            <Share2 className="h-4 w-4" aria-hidden="true" /> Compartilhar leitura
          </button>
        </div>
      </div>
      <div className="relative z-10 mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-white/10 pt-5 text-xs text-text-muted">
        <span><strong className="font-medium text-text-main">ELF</strong> · leitura derivada e referência instrumental</span>
        <span><strong className="font-medium text-text-main">NOAA</strong> · indicadores independentes</span>
        <span><strong className="font-medium text-text-main">BGS</strong> · espectrogramas verificados</span>
      </div>
    </header>

    <section id="campo-elf" className="space-y-5" aria-labelledby="elf-heading">
      <SectionHeading id="elf-heading" index="01" label="Campo ELF" title="A ressonância em observação" description="Frequências derivadas de uma fonte externa. Uma referência física de amplitude só será apresentada com medições instrumentais calibradas." link="/atual" linkLabel="Painel completo" />
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <Card className="flex min-w-0 flex-col overflow-hidden border-primary/30 bg-surface p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-5 py-4 sm:px-6">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">F1 · Frequência fundamental</span>
            <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-primary">Dado derivado</span>
          </div>
          <div className="flex-1 px-5 py-6 sm:px-6">
            <div className="text-5xl font-light tracking-tight text-text-main sm:text-6xl"><Frequency value={f1} /></div>
            <p role="status" aria-live="polite" className="mt-3 text-sm leading-relaxed text-text-muted">
              {isLoading ? 'Consultando Schumann...' : schumannStatus(current)}
            </p>
            {current?.is_historical && hasNumeric && <p className="mt-1 text-xs text-amber-400">Registro histórico fornecido pela fonte.</p>}
            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5">
              <div><p className="text-xs text-text-muted">F2 · Segunda frequência</p><p className="mt-2 text-2xl font-light text-text-main"><Frequency value={f2} decimals={1} /></p></div>
              <div><p className="text-xs text-text-muted">F3 · Terceira frequência</p><p className="mt-2 text-2xl font-light text-text-main"><Frequency value={f3} decimals={1} /></p></div>
            </div>
          </div>
          <div className="space-y-3 border-t border-border bg-background/30 px-5 py-5 text-xs text-text-muted sm:px-6">
            {current ? <SchumannTimes data={current} zone="America/Sao_Paulo" /> : <span>{isLoading ? 'Consultando o horário da fonte...' : 'Horário de observação indisponível.'}</span>}
            <p>Fonte: {current?.source || 'Não identificada nesta consulta'}{current?.source_type === 'derived_spectrogram' ? ' · Derivado de espectrograma' : ''}</p>
            <LastHistoryPeriodAction data={historyData} range={historyRange} loading={historyLoading} error={historyError} />
          </div>
        </Card>

        <Card className="relative flex min-w-0 flex-col overflow-hidden bg-surface p-0">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">Amplitude física</span>
            <Waves className="h-4 w-4 text-text-muted" aria-hidden="true" />
          </div>
          <div className="flex-1 px-5 py-6 sm:px-6">
            <div className="text-5xl font-light tracking-tight text-text-main sm:text-6xl">--</div>
            <p className="mt-3 text-sm font-medium text-amber-300">Amplitude física indisponível</p>
            <p className="mt-5 max-w-lg text-sm leading-7 text-text-muted">
              Não temos uma leitura de amplitude calibrada em unidades físicas. A intensidade visual das cores do espectrograma não pode ser convertida diretamente em pT.
            </p>
          </div>
          <div className="border-t border-border bg-background/30 px-5 py-5 sm:px-6">
            <p className="text-xs leading-relaxed text-text-muted">A ausência de um valor é parte do resultado: não usamos estimativas visuais como se fossem medições instrumentais.</p>
            <Link to="/metodologia" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded text-sm text-primary hover:text-text-main focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
              <BookOpen className="h-4 w-4" aria-hidden="true" /> Entender a metodologia
            </Link>
          </div>
        </Card>
      </div>

      <div className="pt-3"><SchumannTimelineChart data={historyData} loading={historyLoading} error={historyError} range={historyRange} onRangeChange={setHistoryRange} showCoverageStats={false} /></div>

      <div className="pt-3"><SchumannSpectrogramPanel currentF1={f1} currentF2={f2} currentF3={f3} timestamp={current?.estimated_observation_at ?? current?.timestamp} sourceUpdatedAt={current?.source_updated_at} historical={current?.is_historical} /></div>

      <div className="flex flex-col gap-5 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Fonte independente · Eskdalemuir</p>
          <h3 className="mt-2 text-xl font-medium text-text-main">Espectrogramas oficiais do BGS</h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">Consulte os canais Norte e Leste em seu formato original. As imagens são observações de outra estação e não geram automaticamente os valores F1–F3 acima.</p>
        </div>
        <Link to="/atual" className="inline-flex min-h-11 shrink-0 items-center gap-2 self-start rounded-lg border border-primary/40 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
          Ver canais BGS <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>

    <section id="atividade-solar" className="space-y-5" aria-labelledby="solar-heading">
      <SectionHeading id="solar-heading" index="02" label="Contexto solar" title="Atividade solar" description="Medições de instrumentos e produtos da NOAA. São indicadores contextuais, não valores de Ressonância Schumann." link="/solar" linkLabel="Análise solar completa" />
      <Card className="overflow-hidden p-0">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Monitoramento NOAA</span>
          <Sun className="h-5 w-5 text-amber-300" aria-hidden="true" />
        </div>
        <div className="grid gap-6 px-5 py-7 sm:grid-cols-3 sm:gap-0 sm:px-6">
          <div className="sm:border-r sm:border-border sm:pr-6"><Datum label="Raios X · GOES" value={solar?.currentXRay?.flareClass || '--'} detail={formatNoaaObservationTime(solar?.currentXRay?.timestamp, 'America/Sao_Paulo')} /></div>
          <div className="border-t border-border pt-6 sm:border-t-0 sm:border-r sm:pl-6 sm:pr-6 sm:pt-0"><Datum label="Vento solar" value={solar?.solarWindSpeed != null ? `${solar.solarWindSpeed} km/s` : '--'} detail={formatNoaaObservationTime(solar?.solarWindSpeedTimestamp ?? solar?.solarWindTimestamp, 'America/Sao_Paulo')} /></div>
          <div className="border-t border-border pt-6 sm:border-t-0 sm:pl-6 sm:pt-0"><Datum label="Campo interplanetário · Bz" value={solar?.bz != null ? `${solar.bz} nT` : '--'} detail={formatNoaaObservationTime(solar?.bzTimestamp ?? solar?.imfTimestamp, 'America/Sao_Paulo')} /></div>
        </div>
        <p className="border-t border-border bg-background/30 px-5 py-4 text-xs text-text-muted sm:px-6">{isLoading ? 'Consultando dados solares...' : solar ? `Fonte: ${solar.dataSource}` : 'Não foi possível consultar os dados solares nesta tentativa.'}</p>
      </Card>
    </section>

    <section id="atividade-geomagnetica" className="space-y-5" aria-labelledby="geo-heading">
      <SectionHeading id="geo-heading" index="03" label="Contexto geomagnético" title="Atividade geomagnética" description="O índice planetário Kp contextualiza as condições geomagnéticas. Sua escala e sua origem são distintas das frequências ELF." link="/geomagnetica" linkLabel="Análise geomagnética completa" />
      <Card className="grid gap-6 p-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] sm:gap-8 sm:p-7">
        <div className="min-w-0 sm:border-r sm:border-border sm:pr-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary"><Compass className="h-4 w-4" aria-hidden="true" /> Índice Kp</div>
          <p className="mt-4 text-5xl font-light tracking-tight text-text-main tabular-nums sm:text-6xl">{geo?.currentKp ?? '--'}</p>
          {geo && <div className="mt-4"><StatusBadge status={geo.status} /></div>}
        </div>
        <div className="flex min-w-0 flex-col justify-center gap-4 text-sm">
          <div><p className="text-xs uppercase tracking-wider text-text-muted">Última observação disponível</p><p className="mt-2 text-text-main">{formatNoaaObservationTime(geo?.recentKp?.[geo.recentKp.length - 1]?.time, 'America/Sao_Paulo')}</p></div>
          <div className="border-t border-border pt-4"><p className="text-xs uppercase tracking-wider text-text-muted">Proveniência</p><p className="mt-2 text-text-main">{geo?.dataSource || (isLoading ? 'Consultando NOAA...' : 'Consulta indisponível')}</p></div>
        </div>
      </Card>
    </section>

    <section className="grid gap-6 border-t border-border pt-7 text-sm md:grid-cols-[1fr_auto] md:items-end">
      <div className="max-w-3xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">Método e transparência</p>
        <h2 className="mt-2 text-xl font-medium text-text-main">Os dados precisam contar sua própria história.</h2>
        <p className="mt-2 leading-relaxed text-text-muted">Uma falha de consulta não é ausência de fenômeno. Um gráfico de outra estação não equivale a uma medição local. Exibimos as fontes e as lacunas para que cada leitura tenha seu contexto.</p>
        <Link to="/metodologia" className="mt-4 inline-flex min-h-10 items-center gap-2 text-primary hover:text-text-main focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">Fontes e metodologia <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      <div className="min-w-0"><SocialShare title="Ressonância Schumann Hoje | Observatório da Terra" url="https://ressonanciaschumann.com/" /></div>
    </section>

    <ShareCardModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} data={{
      f1: current?.fundamental?.frequency ?? null,
      f2: current?.mode2?.frequency ?? null,
      f3: current?.mode3?.frequency ?? null,
      intensity: current?.relativeIntensity?.value ?? null,
      timestamp: current?.estimated_observation_at ?? current?.timestamp ?? null,
      sourceUpdatedAt: current?.source_updated_at ?? null,
      historical: current?.is_historical,
      availability,
    }} />
  </div>;
}
