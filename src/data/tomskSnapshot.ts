export interface TomskSnapshotState {
  imgUrl: string;
  loading: boolean;
  hasError: boolean;
}

export const TOMSK_REFRESH_MS = 300_000;
export const initialTomskSnapshot: TomskSnapshotState = { imgUrl: '', loading: true, hasError: false };

/** The proxy performs bounded, full JPEG validation before returning the bytes. */
export async function fetchTomskSnapshot(url: string, signal: AbortSignal, fetcher: typeof fetch = fetch, cache?: RequestCache): Promise<Blob> {
  const response = await fetcher(url, { signal, cache });
  if (!response.ok || response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'image/jpeg') {
    await response.body?.cancel();
    throw new Error('Tomsk image unavailable');
  }
  const blob = await response.blob();
  if (!blob.size || blob.size > 5 * 1024 * 1024) throw new Error('Invalid Tomsk image size');
  return blob;
}

async function decodeSnapshot(url: string, signal: AbortSignal) {
  signal.throwIfAborted();
  const image = new Image();
  const clear = () => image.removeAttribute('src');
  signal.addEventListener('abort', clear, { once: true });
  try {
    image.src = url;
    await image.decode();
    signal.throwIfAborted();
  } finally {
    signal.removeEventListener('abort', clear);
    clear();
  }
}

/** Owns the object URLs and single pending refresh of one mounted panel. */
export function createTomskSnapshotSession(onChange: (state: TomskSnapshotState) => void, {
  fetcher = fetch,
  decode = decodeSnapshot,
}: { fetcher?: typeof fetch; decode?: typeof decodeSnapshot } = {}) {
  let state = initialTomskSnapshot;
  let disposed = false;
  let pending: { controller: AbortController; timer: ReturnType<typeof setTimeout>; candidate?: string } | undefined;
  const urls = new Set<string>();

  function publish(next: TomskSnapshotState) {
    state = next;
    onChange(next);
  }

  function revoke(url: string) {
    if (urls.delete(url)) URL.revokeObjectURL(url);
  }

  return {
    async refresh(retry = false) {
      if (disposed || pending) return;
      const controller = new AbortController();
      const attempt: NonNullable<typeof pending> = {
        controller,
        timer: setTimeout(() => controller.abort(), 30_000),
      };
      pending = attempt;
      publish({ ...state, loading: true });
      let next: TomskSnapshotState;
      try {
        const bucket = Math.floor(Date.now() / TOMSK_REFRESH_MS);
        // An explicit retry can replace a response cached in this same bucket.
        const blob = await fetchTomskSnapshot(`/api/spectrogram/tomsk?t=${bucket}`, controller.signal, fetcher, retry ? 'reload' : undefined);
        controller.signal.throwIfAborted();
        attempt.candidate = URL.createObjectURL(blob);
        urls.add(attempt.candidate);
        await decode(attempt.candidate, controller.signal);
        controller.signal.throwIfAborted();
        next = { imgUrl: attempt.candidate, loading: false, hasError: false };
      } catch {
        if (attempt.candidate) revoke(attempt.candidate);
        next = { ...state, loading: false, hasError: true };
      } finally {
        clearTimeout(attempt.timer);
        pending = undefined;
      }
      if (!disposed) publish(next);
    },

    // Run after the DOM commit. Also keep any newer image that React has not yet rendered.
    releaseUnused(renderedUrl: string) {
      for (const url of urls) {
        if (url !== renderedUrl && url !== state.imgUrl && url !== pending?.candidate) revoke(url);
      }
    },

    dispose() {
      disposed = true;
      if (pending) {
        clearTimeout(pending.timer);
        pending.controller.abort();
        pending = undefined;
      }
      for (const url of urls) revoke(url);
      state = initialTomskSnapshot;
    },
  };
}
