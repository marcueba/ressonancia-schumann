import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { BGS_ORIGINAL_URLS, BGS_SOURCE_PAGE_URL, type BgsChannel, type BgsChannelMetadata } from '../../shared/bgs';
import { isVerifiedBgsImage, useBgsSpectrograms, type BgsImageState, type BgsPanelState } from './BgsSpectrogramPanel';
import { TomskSpectrogramImage, TomskUpdateNotice, useTomskSpectrogram } from './TomskSpectrogram';

const CHANNELS: BgsChannel[] = ['north', 'east'];
const LABELS = { north: 'BGS · Norte', east: 'BGS · Leste' };
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const FRAME_GEOMETRY = 'w-full overflow-hidden rounded-md border border-border bg-background/60';
const FRAME = `block ${FRAME_GEOMETRY}`;
const FRAME_STATUS = `flex items-center p-3 text-xs leading-relaxed ${FRAME_GEOMETRY}`;

function shortPeriod(period: NonNullable<BgsChannelMetadata['observedPeriod']>) {
  return period.date && /^\d{4}-\d{2}-\d{2}$/.test(period.date)
    ? period.date.split('-').reverse().join('/') : period.label;
}

interface OverviewSpectrogramsViewProps {
  state: BgsPanelState;
  imageStates?: Partial<Record<BgsChannel, BgsImageState>>;
  onImageLoad?: (channel: BgsChannel) => void;
  onImageError?: (channel: BgsChannel) => void;
  tomsk: ReturnType<typeof useTomskSpectrogram>;
}

/** No fetches at this boundary: the exact same validation gates apply to both layouts. */
export function OverviewSpectrogramsView({ state, imageStates = {}, onImageLoad, onImageError, tomsk }: OverviewSpectrogramsViewProps) {
  const credits = state.status === 'ready'
    ? [...new Set(CHANNELS.flatMap(id => isVerifiedBgsImage(id, state.metadata.channels[id]) ? [state.metadata.channels[id].credit!] : []))]
    : [];

  return <div data-overview-spectrograms className="min-w-0 space-y-2">
    <div data-overview-tiles className="grid min-w-0">
      <figure className="min-w-0 space-y-1.5" data-overview-channel="tomsk">
        {tomsk.imgUrl
          ? <TomskSpectrogramImage imgUrl={tomsk.imgUrl} hasError={tomsk.hasError} thumbnailFrameClassName={FRAME} />
          : <>
            <p className="text-sm font-medium text-text-main">Tomsk · SOS-70</p>
            <div data-overview-frame className={`${FRAME_STATUS} ${tomsk.hasError ? 'text-amber-300' : 'text-text-muted'}`} role={tomsk.hasError ? 'alert' : 'status'}>
              {tomsk.hasError ? 'Espectrograma Tomsk temporariamente indisponível.' : 'Carregando Tomsk…'}
            </div>
          </>}
        <TomskUpdateNotice {...tomsk} />
        <figcaption className="space-y-1 text-xs leading-snug text-text-muted">
          <p>Imagem de referência · Horário da imagem não informado.</p>
          <a href="https://sos70.ru/provider.php?file=shm.jpg" target="_blank" rel="noopener noreferrer" className={`inline-block text-primary underline decoration-primary/40 underline-offset-2 ${FOCUS}`}>Fonte Tomsk / SOS-70</a>
        </figcaption>
      </figure>

      {CHANNELS.map(id => {
        const channel = state.status === 'ready' ? state.metadata.channels[id] : null;
        const verified = channel && isVerifiedBgsImage(id, channel);
        const imageState = imageStates[id] ?? 'loading';
        return <figure key={id} className="min-w-0 space-y-1.5" data-overview-channel={id}>
          {verified && imageState !== 'error' ? <a href={channel.imageUrl!} target="_blank" rel="noopener noreferrer"
            aria-label={`Ampliar esta imagem — ${LABELS[id]}, ${channel.observedPeriod!.label}`}
            className={`block min-w-0 rounded text-text-main ${FOCUS}`}>
            <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium">{LABELS[id]}<Maximize2 className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" /></span>
            <span data-overview-frame className={FRAME}>
              <img key={channel.imageUrl} src={channel.imageUrl!} alt={`Espectrograma de Eskdalemuir / ${LABELS[id]} — ${channel.observedPeriod!.label}`}
                width={700} height={600} className="block size-full object-contain"
                onLoad={() => onImageLoad?.(id)} onError={() => onImageError?.(id)} />
            </span>
          </a> : <>
            <p className="text-sm font-medium text-text-main">{LABELS[id]}</p>
            <div data-overview-frame className={`${FRAME_STATUS} text-text-muted`} role={state.status === 'error' || imageState === 'error' ? 'alert' : 'status'}>
              {state.status === 'loading' ? 'Consultando imagem BGS…' : state.status === 'error' ? 'Falha ao consultar BGS.' : imageState === 'error' ? 'Falha ao carregar esta imagem.' : channel?.error === 'material_unverified' ? 'Novo material BGS aguardando verificação.' : 'Imagem verificada indisponível.'}
            </div>
          </>}
          <figcaption className="space-y-1 text-xs leading-snug text-text-muted">
            {verified && <p data-bgs-image-origin={channel.imageOrigin}>
              {channel.imageOrigin === 'archive' ? `Cópia arquivada verificada — ${shortPeriod(channel.observedPeriod!)}` : `${shortPeriod(channel.observedPeriod!)} · Verificada`}
            </p>}
            {verified && imageState === 'loading' && <p role="status">Carregando imagem…</p>}
            {verified && channel.error && <p role="status" className="text-amber-300">{channel.error === 'material_unverified' ? 'Material novo aguarda verificação.' : 'Falha na consulta à origem.'} Cópia verificada disponível.</p>}
            {verified && channel.observedPeriod!.note && <p className="text-amber-300">{channel.observedPeriod!.note}</p>}
            <a href={BGS_ORIGINAL_URLS[id]} target="_blank" rel="noopener noreferrer" aria-label={`Ver imagem na fonte BGS — ${id === 'north' ? 'Norte' : 'Leste'}`}
              className={`inline-block text-primary underline decoration-primary/40 underline-offset-2 ${FOCUS}`}>Ver imagem na fonte BGS</a>
          </figcaption>
        </figure>;
      })}
    </div>

    <div className="space-y-1 border-t border-border pt-2 text-xs leading-snug text-text-muted">
      <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
        <span>Eskdalemuir / BGS · Observações diárias · Estações independentes</span>
        {credits.map(credit => <span key={credit}>{credit}</span>)}
      </div>
      <details>
        <summary className={`w-fit cursor-pointer rounded text-primary ${FOCUS}`}>Fontes e condições de uso</summary>
        <p className="mt-1">BGS: uso não comercial autorizado. <a href={BGS_SOURCE_PAGE_URL} target="_blank" rel="noopener noreferrer" className={`underline ${FOCUS}`}>Fonte instrumental oficial</a>. Os links da fonte BGS podem mostrar outro período. Novas imagens dependem de verificação humana. As imagens BGS não alimentam as frequências derivadas.</p>
      </details>
    </div>
  </div>;
}

export function OverviewSpectrograms() {
  const state = useBgsSpectrograms();
  const tomsk = useTomskSpectrogram();
  const [images, setImages] = useState<Partial<Record<BgsChannel, { url: string; status: BgsImageState }>>>({});
  const imageStates: Partial<Record<BgsChannel, BgsImageState>> = {};
  const markImage = (id: BgsChannel, status: BgsImageState) => {
    const url = state.status === 'ready' ? state.metadata.channels[id].imageUrl : null;
    if (url) setImages(previous => ({ ...previous, [id]: { url, status } }));
  };
  if (state.status === 'ready') {
    for (const id of CHANNELS) {
      const image = images[id];
      if (image && image.url === state.metadata.channels[id].imageUrl) imageStates[id] = image.status;
    }
  }
  return <OverviewSpectrogramsView state={state} tomsk={tomsk} imageStates={imageStates}
    onImageLoad={id => markImage(id, 'loaded')}
    onImageError={id => markImage(id, 'error')} />;
}
