import { useEffect, useState } from 'react';
import { useSEO } from '../hooks/useSEO';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { MapPin } from 'lucide-react';
import { dataProvider } from '../data/dataProvider';
import { STATION_CATALOG, STATION_STATUS_LABELS, NUMERIC_AVAILABILITY_LABELS } from '../../shared/stations';
import type { Station } from '../../shared/stations';
import { formatObservationTime } from '../utils/observationTime';

export function StationsView({ stations, loading = false, error = false }: { stations: Station[] | null; loading?: boolean; error?: boolean }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-light tracking-wide text-text-main mb-2 break-words">Estações e fontes de observação ELF</h1>
          <p className="text-text-muted max-w-2xl">Fontes de dados, referências científicas e estações de monitoramento eletromagnético.</p>
          <p className="text-sm text-text-muted mt-2 max-w-2xl">Os estados indicam a integração e os produtos disponíveis neste site. Não indicam se uma estação física está ligada ou desligada.</p>
        </div>
      </div>
      {loading && <p role="status" className="text-sm text-text-muted">Consultando os produtos conectados ao site…</p>}
      {error && <p role="alert" className="text-sm text-amber-400">Não foi possível consultar os estados. O catálogo informativo foi preservado; a disponibilidade dos produtos não está confirmada.</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {STATION_CATALOG.map(definition => {
          const station = stations?.find(item => item.id === definition.id);
          return (
          <div key={definition.id} className="h-full min-w-0" data-station-id={definition.id}>
          <Card className="relative overflow-hidden group hover:border-border/80 transition-colors h-full min-w-0 break-words">
            <CardHeader>
              <div className="flex items-center gap-2 text-text-muted mb-2"><MapPin className="w-4 h-4 shrink-0" /><span className="text-sm uppercase tracking-wider">{definition.country}</span></div>
              <CardTitle as="h2" className="text-xl">{definition.name}</CardTitle>
            </CardHeader>
            <div className="space-y-4 mt-6">
              {definition.latitude !== null && definition.longitude !== null && <div className="grid grid-cols-2 gap-4">
                <div><div className="text-xs text-text-muted uppercase tracking-wider mb-1">Latitude</div><div className="text-sm font-medium">{definition.latitude.toFixed(4)}°</div></div>
                <div><div className="text-xs text-text-muted uppercase tracking-wider mb-1">Longitude</div><div className="text-sm font-medium">{definition.longitude.toFixed(4)}°</div></div>
              </div>}
              <div className="pt-4 border-t border-border"><div className="text-xs text-text-muted uppercase tracking-wider mb-1">Tipo de observação</div><div className="text-sm font-medium text-text-main">{definition.type}</div></div>
              <div className="pt-2"><div className="text-xs text-text-muted uppercase tracking-wider mb-1">Papel no sistema</div><div className="text-sm font-medium text-primary">{definition.role}</div></div>
              <div className="pt-4 border-t border-border" data-station-status>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-1">Disponibilidade no site</div>
                <div className="text-sm font-medium">{station ? STATION_STATUS_LABELS[station.status] : 'Estado não confirmado'}</div>
                {station && <><p className="text-sm text-text-muted mt-2">{station.statusDetail}</p><p className="text-sm mt-2">Dados numéricos: {NUMERIC_AVAILABILITY_LABELS[station.numericAvailability]}.</p></>}
              </div>
              {station?.visual && <div className="space-y-3 text-sm" data-station-visual>
                {(['north', 'east'] as const).map(channel => {
                  const image = station.visual!.channels[channel];
                  return <div key={channel}>
                    <p className="font-medium">Canal {channel === 'north' ? 'Norte' : 'Leste'}: {image.available ? 'imagem verificada disponível' : 'sem imagem verificada disponível'}</p>
                    {image.available && image.observedPeriod && <p>{image.imageOrigin === 'archive' ? 'Cópia arquivada verificada' : 'Imagem verificada'} — {image.observedPeriod.label}</p>}
                    {image.available && image.credit && <p className="text-text-muted">{image.credit}</p>}
                    {image.error && <p className="text-amber-400">{image.error === 'material_unverified' ? 'Novo material aguarda verificação do período e do ano; não substitui a cópia verificada.' : 'A consulta remota não forneceu uma atualização válida.'}</p>}
                  </div>;
                })}
                <p className="text-text-muted">Observações diárias, não em tempo real. O período inscrito na imagem não é o horário da consulta.</p>
                <a className="text-primary underline focus-visible:outline-2 focus-visible:outline-primary" href="/atual">Ver painel BGS e ampliar a imagem verificada</a>
              </div>}
              {station?.integration === 'numeric_connected' && <dl className="text-xs text-text-muted space-y-2">
                <div><dt>Horário observacional informado pela fonte</dt><dd>{station.lastUpdate ? formatObservationTime(station.lastUpdate, 'UTC') : 'Não informado pela fonte.'}</dd></div>
                {station.estimatedObservationAt && <div><dt>Horário estimado externamente (não instrumental)</dt><dd>{formatObservationTime(station.estimatedObservationAt, 'UTC')}</dd></div>}
                {station.sourceUpdatedAt && <div><dt>Atualização do documento da fonte</dt><dd>{formatObservationTime(station.sourceUpdatedAt, 'UTC')}</dd></div>}
                {station.checkedAt && <div><dt>Consulta ao documento (não observação)</dt><dd>{formatObservationTime(station.checkedAt, 'UTC')}</dd></div>}
              </dl>}
              <p className="text-xs text-text-muted">{definition.metadataNote}</p>
              <div className="pt-3 border-t border-border text-xs text-text-muted space-y-2">
                <p>Fonte: {definition.dataSource}</p>
                {definition.rights.images && <p>JPEGs: {definition.rights.images}</p>}
                {definition.rights.rawData && <p>Dados brutos: {definition.rights.rawData}</p>}
                {!definition.rights.images && !definition.rights.rawData && <p>Termos: {definition.license}</p>}
                {definition.referenceUrl && <a href={definition.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline inline-block focus-visible:outline-2 focus-visible:outline-primary">Referência da fonte</a>}
              </div>
            </div>
          </Card>
          </div>
          );
        })}
      </div>
    </div>
  );
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
