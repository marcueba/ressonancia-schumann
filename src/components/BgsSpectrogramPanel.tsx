import { useEffect, useRef, useState } from 'react';
import { BGS_ORIGINAL_URLS, BGS_SOURCE_PAGE_URL, BGS_STATION_ID } from '../../shared/bgs';
import type { BgsChannel, BgsChannelMetadata, BgsSpectrogramsMetadata } from '../../shared/bgs';
import { Card } from './ui/Card';
import { formatObservationTime } from '../utils/observationTime';

const CHANNELS: BgsChannel[] = ['north', 'east'];
const CHANNEL_LABELS: Record<BgsChannel, string> = { north: 'Canal Norte', east: 'Canal Leste' };

export type BgsPanelState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; metadata: BgsSpectrogramsMetadata };
export type BgsImageState = 'loading' | 'loaded' | 'error';

/** One bounded request per mounted panel, including StrictMode effect replay. */
export async function fetchBgsSpectrograms(fetcher: typeof fetch = fetch): Promise<BgsSpectrogramsMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetcher('/api/bgs/spectrograms', { signal: controller.signal });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error('BGS metadata unavailable');
    }
    const metadata = await response.json() as BgsSpectrogramsMetadata;
    if (metadata?.stationId !== BGS_STATION_ID || !metadata.channels ||
      CHANNELS.some(channel => metadata.channels[channel]?.channel !== channel)) {
      throw new Error('Invalid BGS metadata');
    }
    return metadata;
  } finally {
    clearTimeout(timeout);
  }
}

/** Only the verified local, content-addressed image can be embedded. */
function verifiedImage(channel: BgsChannel, metadata: BgsChannelMetadata): boolean {
  return metadata.available && (metadata.imageOrigin === 'archive' || metadata.imageOrigin === 'remote') &&
    /^[a-f0-9]{64}$/.test(metadata.sha256 ?? '') &&
    metadata.imageUrl === `/api/bgs/spectrograms/${channel}/${metadata.sha256}.jpg` &&
    metadata.originalUrl === BGS_ORIGINAL_URLS[channel] &&
    metadata.observedPeriod?.basis === 'image_verified_by_sha256' &&
    typeof metadata.observedPeriod.label === 'string' && metadata.observedPeriod.label.trim().length > 0 &&
    Number.isInteger(metadata.observedPeriod.year) &&
    metadata.credit === `British Geological Survey © UKRI ${metadata.observedPeriod.year}`;
}

interface BgsSpectrogramViewProps {
  state: BgsPanelState;
  selectedChannel: BgsChannel;
  onSelectChannel: (channel: BgsChannel) => void;
  imageState?: BgsImageState;
  onImageLoad?: () => void;
  onImageError?: () => void;
}

/** Presentation boundary used by SSR checks; it performs no network requests. */
export function BgsSpectrogramView({ state, selectedChannel, onSelectChannel, imageState = 'loading', onImageLoad, onImageError }: BgsSpectrogramViewProps) {
  const channel = state.status === 'ready' ? state.metadata.channels[selectedChannel] : null;
  const hasImage = !!channel && verifiedImage(selectedChannel, channel);
  const unverified = channel?.error === 'material_unverified';
  const archived = channel?.imageOrigin === 'archive';

  return (
    <Card className="min-w-0 max-w-full space-y-4 [overflow-wrap:anywhere]" data-bgs-panel>
      <div className="min-w-0 space-y-2">
        <h2 className="text-xl font-medium text-text-main">Espectrogramas ELF — Eskdalemuir / BGS</h2>
        <p className="text-sm text-text-muted">Estação independente: Eskdalemuir, Reino Unido. Estas imagens não correspondem à estação Tomsk nem alimentam os valores numéricos Schumann deste site.</p>
        <p className="text-sm text-text-muted">Observações diárias, não em tempo real. Os eixos, a escala, as datas e as cores originais são preservados.</p>
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-relaxed text-text-muted">
        <p className="font-medium text-text-main">Calendário de publicação informado pelo BGS</p>
        <p className="mt-1">Em condições normais, os dados de um dia são recolhidos às 10h UTC do dia seguinte e os espectrogramas são publicados por volta de 10h15 UTC (7h15 de Brasília). O serviço é mantido conforme a disponibilidade da equipe; a data efetiva da imagem deve ser conferida abaixo.</p>
        <p className="mt-2">Histórico de 2025: houve interrupção do equipamento entre 15/05 e 02/10, devido a um problema elétrico. Não há medições instrumentais desse período no depósito informado pelo BGS.</p>
      </div>

      <div role="group" aria-label="Canais do espectrograma BGS" className="flex min-w-0 flex-wrap gap-2">
        {CHANNELS.map(id => (
          <button key={id} type="button" aria-pressed={selectedChannel === id} aria-controls="bgs-channel-content"
            onClick={() => onSelectChannel(id)}
            className={`min-h-11 max-w-full rounded-lg border px-4 py-2 text-sm whitespace-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${selectedChannel === id ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-surface text-text-main hover:border-primary/50'}`}>
            {CHANNEL_LABELS[id]}
          </button>
        ))}
      </div>

      <div id="bgs-channel-content" role="region" aria-label={CHANNEL_LABELS[selectedChannel]} className="min-w-0 max-w-full space-y-3" aria-busy={state.status === 'loading' || (hasImage && imageState === 'loading')}>
        {state.status === 'loading' && <p role="status" className="text-sm text-text-muted">Consultando os espectrogramas diários do BGS…</p>}
        {state.status === 'error' && <p role="alert" className="text-sm text-amber-400">Não foi possível consultar os espectrogramas BGS. Os dados da estação Tomsk são independentes desta consulta.</p>}
        {channel && <>
          {!hasImage && <p role="status" className="text-sm text-amber-400">{unverified
            ? 'Imagem indisponível: a atualização aguarda verificação do período e do ano do material.'
            : 'Não foi possível obter uma imagem verificada deste canal.'} Consulte a página oficial do BGS.</p>}
          {hasImage && <>
            {archived
              ? <p className="text-sm font-medium text-text-main" data-bgs-image-origin="archive">Cópia arquivada verificada — {channel.observedPeriod!.label}</p>
              : <p className="text-xs text-text-muted" data-bgs-image-origin="remote">Imagem verificada em cache. A consulta segue a política diária do projeto.</p>}
            {channel.error && <p role="status" className="text-sm text-amber-400">{unverified
              ? 'Novo material da fonte BGS aguarda verificação do período e do ano.'
              : 'A consulta à fonte BGS não forneceu uma atualização válida.'} {archived
                ? 'A cópia arquivada permanece disponível.'
                : 'A imagem verificada permanece em cache.'} O período abaixo permanece o da imagem.</p>}
            {imageState === 'loading' && <p role="status" className="text-sm text-text-muted">Carregando a imagem do {CHANNEL_LABELS[selectedChannel]}…</p>}
            {imageState === 'error' ? <p role="alert" className="text-sm text-amber-400">Não foi possível carregar a imagem deste canal.</p> :
              <div className="min-w-0 max-w-full rounded border border-border bg-white">
                <img key={channel.imageUrl} src={channel.imageUrl!} alt={`Espectrograma ELF de Eskdalemuir / BGS — ${CHANNEL_LABELS[selectedChannel]}; ${channel.observedPeriod!.label}`}
                  className="block h-auto w-full max-w-full" onLoad={onImageLoad} onError={onImageError} />
              </div>}
            <p className="text-sm text-text-main"><strong>Período identificado na imagem:</strong> {channel.observedPeriod!.label}</p>
            <p className="text-sm text-text-muted">{channel.credit}</p>
            {channel.observedPeriod!.note && <p className="text-xs text-amber-400">{channel.observedPeriod!.note}</p>}
          </>}
          <dl className="min-w-0 space-y-2 text-xs text-text-muted">
            <div><dt className="font-medium">Última consulta à fonte</dt><dd>{formatObservationTime(channel.checkedAt, 'UTC')}</dd></div>
            {!archived && channel.fetchedAt && <div><dt className="font-medium">Última imagem válida obtida em</dt><dd>{formatObservationTime(channel.fetchedAt, 'UTC')}</dd></div>}
          </dl>
          <p className="text-xs text-text-muted">O horário da consulta ou do download não é o horário da observação.</p>
          <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-sm">
            {hasImage && <a href={channel.imageUrl!} target="_blank" rel="noopener noreferrer" className="inline-block max-w-full text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Ampliar esta imagem</a>}
            <a href={BGS_ORIGINAL_URLS[selectedChannel]} target="_blank" rel="noopener noreferrer" className="inline-block max-w-full text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Ver imagem na fonte BGS</a>
          </div>
          <p className="text-xs text-text-muted">O link da fonte BGS pode apresentar uma imagem de outro período.</p>
        </>}
      </div>

      <div className="min-w-0 border-t border-border pt-3 text-xs text-text-muted space-y-2">
        <p>Fonte: <a href={BGS_SOURCE_PAGE_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">British Geological Survey — instrumentos de indução em Eskdalemuir</a>.</p>
        <p>Imagens reproduzidas com autorização para uso não comercial e atribuição ao BGS. Uso comercial exige autorização separada.</p>
      </div>
    </Card>
  );
}

export function BgsSpectrogramPanel() {
  const [state, setState] = useState<BgsPanelState>({ status: 'loading' });
  const [selectedChannel, setSelectedChannel] = useState<BgsChannel>('north');
  const [imageStates, setImageStates] = useState<Partial<Record<BgsChannel, BgsImageState>>>({});
  const request = useRef<Promise<BgsSpectrogramsMetadata> | null>(null);

  useEffect(() => {
    let active = true;
    request.current ??= fetchBgsSpectrograms();
    request.current.then(metadata => {
      if (active) setState({ status: 'ready', metadata });
    }, () => {
      if (active) setState({ status: 'error' });
    });
    return () => { active = false; };
  }, []);

  return <BgsSpectrogramView state={state} selectedChannel={selectedChannel} onSelectChannel={setSelectedChannel}
    imageState={imageStates[selectedChannel] ?? 'loading'}
    onImageLoad={() => setImageStates(previous => ({ ...previous, [selectedChannel]: 'loaded' }))}
    onImageError={() => setImageStates(previous => ({ ...previous, [selectedChannel]: 'error' }))} />;
}
