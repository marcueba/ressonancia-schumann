import { useEffect, useRef, useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { createTomskSnapshotSession, initialTomskSnapshot, TOMSK_REFRESH_MS, type TomskSnapshotState } from '../data/tomskSnapshot';

const IMAGE_DESCRIPTION = 'Espectrograma ELF de referência da estação Tomsk / SOS-70';
const RETAINED_NOTICE = 'Última imagem disponível — atualização temporariamente indisponível.';
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

export function useTomskSpectrogram() {
  const [snapshot, setSnapshot] = useState(initialTomskSnapshot);
  const session = useRef<ReturnType<typeof createTomskSnapshotSession> | null>(null);

  useEffect(() => {
    const current = createTomskSnapshotSession(setSnapshot);
    session.current = current;
    // A disposed session ignores the first effect replay in React StrictMode.
    queueMicrotask(() => { void current.refresh(); });
    const interval = setInterval(() => { void current.refresh(); }, TOMSK_REFRESH_MS);
    return () => {
      clearInterval(interval);
      current.dispose();
      session.current = null;
    };
  }, []);

  useEffect(() => { session.current?.releaseUnused(snapshot.imgUrl); }, [snapshot.imgUrl]);

  return { ...snapshot, retry: () => { void session.current?.refresh(true); } };
}

export function TomskSpectrogramImage({ imgUrl, hasError, thumbnailFrameClassName }: Pick<TomskSnapshotState, 'imgUrl' | 'hasError'> & { thumbnailFrameClassName?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [expanded, setExpanded] = useState(false);
  const image = <img key={imgUrl} src={imgUrl} alt={IMAGE_DESCRIPTION} data-tomsk-image
    className={thumbnailFrameClassName ? 'block size-full object-contain' : 'block h-auto max-w-full rounded-md object-contain'} />;

  return <>
    <button type="button" aria-label="Ampliar esta imagem — Tomsk / SOS-70" aria-haspopup="dialog"
      className={`cursor-zoom-in rounded-md ${FOCUS} ${thumbnailFrameClassName ? 'block w-full min-w-0 text-left text-text-main' : 'relative flex max-w-full items-center justify-center'}`}
      onClick={() => {
        dialog.current?.showModal();
        setExpanded(true);
      }}>
      {thumbnailFrameClassName ? <>
        <span className="mb-1.5 flex items-center justify-between gap-2 text-sm font-medium">
          Tomsk · SOS-70<Maximize2 className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden="true" />
        </span>
        <span data-overview-frame className={thumbnailFrameClassName}>{image}</span>
      </> : <>
        {image}
        <Maximize2 className="absolute right-1.5 top-1.5 h-3.5 w-3.5 text-white" aria-hidden="true" />
      </>}
    </button>
    <dialog ref={dialog} onClose={() => setExpanded(false)} aria-label="Ampliação do espectrograma Tomsk / SOS-70"
      className="m-auto max-h-[90dvh] w-[92vw] max-w-6xl rounded-lg border border-border bg-surface p-3 text-text-main backdrop:bg-black/80">
      <form method="dialog" className="mb-2 flex justify-end">
        <button className={`rounded px-2 py-1 text-sm text-primary ${FOCUS}`}>Fechar ampliação</button>
      </form>
      {expanded && <img key={imgUrl} src={imgUrl} alt={IMAGE_DESCRIPTION} className="mx-auto block max-h-[75dvh] max-w-full object-contain" />}
      {expanded && hasError && <p role="status" className="mt-2 text-xs text-amber-300">{RETAINED_NOTICE}</p>}
    </dialog>
  </>;
}

export function TomskUpdateNotice({ imgUrl, hasError, loading, retry }: TomskSnapshotState & { retry: () => void }) {
  if (!hasError) return null;
  return <div className="space-y-1 text-xs leading-snug">
    {imgUrl && <p role="status" className="text-amber-300">{RETAINED_NOTICE}</p>}
    <button type="button" disabled={loading} onClick={retry}
      className={`rounded text-primary underline decoration-primary/40 underline-offset-2 disabled:opacity-60 ${FOCUS}`}>
      Tentar novamente
    </button>
  </div>;
}
