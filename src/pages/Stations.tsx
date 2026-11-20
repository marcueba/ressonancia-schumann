import { useEffect, useState } from 'react';
import { useSEO } from '../hooks/useSEO';
import { Card, CardTitle } from '../components/ui/Card';
import { MapPin } from 'lucide-react';
import { dataProvider } from '../data/dataProvider';
import { STATION_CATALOG, STATION_STATUS_LABELS } from '../../shared/stations';
import type { Station, StationDefinition } from '../../shared/stations';
import { formatObservationTime } from '../utils/observationTime';
import { isVerifiedBgsImage } from '../components/BgsSpectrogramPanel';

const SOURCE_LINK = 'inline-block rounded text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function SourceNotes({ definition, station }: { definition: StationDefinition; station?: Station }) {
  return <details className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-text-muted">
    <summary className="w-fit cursor-pointer rounded text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Créditos e notas</summary>
    <div className="mt-3 space-y-2">
      <p>Fonte: {definition.dataSource}</p>
      {definition.rights.images && <p>JPEGs: {definition.rights.images}</p>}
      {definition.rights.rawData && <p>Dados brutos: {definition.rights.rawData}</p>}
      {!definition.rights.images && !definition.rights.rawData && <p>Termos: {definition.license}</p>}
      <p>{definition.metadataNote}</p>
      {definition.latitude !== null && definition.longitude !== null && <p>Coordenadas: {definition.latitude.toFixed(4)}°, {definition.longitude.toFixed(4)}°.</p>}
      {station?.checkedAt && <p>Consulta ao produto, não observação: {formatObservationTime(station.checkedAt, 'UTC')}</p>}
      {station?.visual && <div className="space-y-2">
        {(['north', 'east'] as const).map(channel => {
          const checkedAt = station.visual!.channels[channel].checkedAt;
          return checkedAt && <p key={channel}>Consulta à fonte BGS — Canal {channel === 'north' ? 'Norte' : 'Leste'}: {formatObservationTime(checkedAt, 'UTC')}</p>;
        })}
        <p>O período da imagem é independente do horário da consulta. Novos materiais dependem de verificação humana.</p>
      </div>}
    </div>
  </details>;
}

function SourceHeading({ definition }: { definition: StationDefinition }) {
  return <div className="min-w-0">
    <div className="mb-1.5 flex items-center gap-1.5 text-xs text-text-muted"><MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span>{definition.country}</span></div>
    <CardTitle as="h3" className="text-xl">{definition.name}</CardTitle>
  </div>;
}

function UsedSourceCard({ definition, station }: { definition: StationDefinition; station?: Station }) {
  const bgs = definition.id === 'bgs';
  return <Card className="h-full min-w-0 break-words" data-station-id={definition.id}>
    <SourceHeading definition={definition} />
    <p className="mt-3 text-sm leading-relaxed text-text-muted">{bgs
      ? 'Espectrogramas diários dos canais Norte e Leste de Eskdalemuir. Observações independentes, não em tempo real.'
      : 'Espectrograma ELF e parâmetros numéricos derivados por processamento externo. Os números não são medições instrumentais diretas realizadas por este projeto.'}</p>

    <div className="mt-4 border-t border-border pt-3 text-sm" data-station-status aria-label={bgs ? 'Disponibilidade dos espectrogramas BGS' : 'Disponibilidade dos parâmetros numéricos'}>
      <p className={station?.status === 'query_failed' ? 'font-medium text-amber-300' : 'font-medium text-text-main'} role={station?.status === 'query_failed' ? 'alert' : undefined}>
        {station ? STATION_STATUS_LABELS[station.status] : 'Estado não confirmado'}
      </p>
      {!bgs && station && <div className="mt-2 space-y-1.5 text-xs leading-relaxed text-text-muted">
        <p>Imagem e valores consultados separadamente.</p>
        {station.numericAvailability === 'partial' && <p className="text-amber-300">Parâmetros numéricos parciais.</p>}
        {station.isHistorical && <p>Registros históricos / últimos conhecidos informados pela fonte.</p>}
        {station.lastUpdate && <p>Observação informada pela fonte: {formatObservationTime(station.lastUpdate, 'UTC')}</p>}
        {station.estimatedObservationAt && <p>Leitura derivada estimada externamente: {formatObservationTime(station.estimatedObservationAt, 'UTC')}</p>}
        {!station.lastUpdate && !station.estimatedObservationAt && <p>Horário da leitura não informado pela fonte.</p>}
        {station.sourceUpdatedAt && <p>Documento da fonte atualizado em {formatObservationTime(station.sourceUpdatedAt, 'UTC')}</p>}
      </div>}
    </div>

    {bgs && station?.visual && <div className="mt-3 grid gap-3 text-xs sm:grid-cols-2" data-station-visual>
      {(['north', 'east'] as const).map(channel => {
        const image = station.visual!.channels[channel];
        const verified = isVerifiedBgsImage(channel, image);
        const label = channel === 'north' ? 'Norte' : 'Leste';
        return <div key={channel} className="min-w-0 space-y-1.5 rounded-lg border border-border p-3" data-station-channel={channel}>
          <p className="text-sm font-medium">Canal {label}</p>
          <p>{verified ? 'Imagem verificada disponível' : 'Sem imagem verificada disponível'}</p>
          {verified && <>
            <p>{image.imageOrigin === 'archive' ? 'Cópia arquivada verificada' : 'Imagem verificada'} — {image.observedPeriod!.label}</p>
            <p className="text-text-muted">{image.credit}</p>
            <a className={SOURCE_LINK} href={image.imageUrl!} target="_blank" rel="noopener noreferrer" aria-label={`Ampliar imagem verificada BGS — Canal ${label}`}>Ampliar {label}</a>
          </>}
          {image.error && <p className="text-amber-300">{image.error === 'material_unverified'
            ? 'Novo material aguarda verificação.'
            : 'A consulta remota não forneceu uma atualização válida.'}{verified ? ' A cópia verificada permanece disponível.' : ''}</p>}
        </div>;
      })}
    </div>}

    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
      <a className={SOURCE_LINK} href="/atual">{bgs ? 'Ver painel BGS' : 'Ver dados ELF'}</a>
      {definition.referenceUrl && <a href={definition.referenceUrl} target="_blank" rel="noopener noreferrer" className={SOURCE_LINK}>Fonte {bgs ? 'BGS' : 'Tomsk / SOS-70'}</a>}
    </div>
    <SourceNotes definition={definition} station={station} />
  </Card>;
}

export function StationsView({ stations, loading = false, error = false }: { stations: Station[] | null; loading?: boolean; error?: boolean }) {
  const used = STATION_CATALOG.filter(definition => definition.id === 'tomsk' || definition.id === 'bgs');
  const references = STATION_CATALOG.filter(definition => definition.id !== 'tomsk' && definition.id !== 'bgs');
  return <div className="space-y-8 animate-in fade-in duration-700 [overflow-wrap:anywhere]">
    <header>
      <h1 className="mb-2 text-3xl font-light tracking-wide text-text-main">Estações e fontes de observação ELF</h1>
      <p className="max-w-3xl text-sm leading-relaxed text-text-muted">Fontes dos produtos apresentados no site e referências para consulta.</p>
    </header>

    <section className="space-y-4" data-station-group="used" aria-labelledby="used-sources-heading">
      <div>
        <h2 id="used-sources-heading" className="text-xl font-medium text-text-main">Fontes utilizadas no site</h2>
        <p className="mt-1 text-sm leading-relaxed text-text-muted">Cada produto tem sua própria disponibilidade e atualização. Estes estados não indicam se a estação física está ligada ou desligada.</p>
      </div>
      {loading && <p role="status" className="text-sm text-text-muted">Consultando os produtos conectados ao site…</p>}
      {error && <p role="alert" className="text-sm text-amber-300">Não foi possível consultar os estados. O catálogo informativo foi preservado; a disponibilidade dos produtos não está confirmada.</p>}
      <div className="grid min-w-0 gap-4 lg:grid-cols-2">
        {used.map(definition => <div key={definition.id} className="min-w-0"><UsedSourceCard definition={definition} station={stations?.find(item => item.id === definition.id)} /></div>)}
      </div>
    </section>

    <section className="space-y-4 border-t border-border pt-6" data-station-group="references" aria-labelledby="other-sources-heading">
      <div>
        <h2 id="other-sources-heading" className="text-xl font-medium text-text-main">Outras fontes e referências</h2>
        <p className="mt-1 text-sm leading-relaxed text-text-muted">Estas fontes não alimentam os dados apresentados no site. A presença no catálogo não indica integração nem confirma o estado físico de uma estação.</p>
      </div>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {references.map(definition => <div key={definition.id} className="min-w-0"><Card data-station-id={definition.id} className="h-full min-w-0 break-words p-4">
          <SourceHeading definition={definition} />
          <p className="mt-2 text-xs font-medium text-primary">{definition.id === 'sierra' ? 'Referência bibliográfica' : 'Referência externa'}</p>
          <p className="mt-2 text-sm leading-relaxed text-text-muted">{definition.type.replace(/ — referência (externa|bibliográfica)$/, '')}</p>
          {definition.referenceUrl && <a href={definition.referenceUrl} target="_blank" rel="noopener noreferrer" className={`${SOURCE_LINK} mt-3 text-sm`}>Consultar fonte</a>}
          <SourceNotes definition={definition} />
        </Card></div>)}
      </div>
    </section>
  </div>;
}

export function Stations() {
  useSEO({ title: 'Estações de Monitoramento ELF | Ressonância Schumann', description: 'Estações e referências ELF: produtos disponíveis, integrações e limitações no site.', path: '/estacoes' });
  const [stations, setStations] = useState<Station[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    dataProvider.getStations().then(data => {
      if (!Array.isArray(data)) throw new Error('Invalid station catalog');
      if (active) setStations(data);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <StationsView stations={stations} loading={loading} error={error} />;
}
