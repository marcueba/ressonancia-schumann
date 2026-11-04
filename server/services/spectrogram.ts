import type { RequestHandler } from 'express';

const TOMSK_URL = 'https://sos70.ru/provider.php?file=shm.jpg';
const TIMEOUT_MS = 8000;
const MAX_BYTES = 5 * 1024 * 1024;

class SpectrogramError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

/** Fixed upstream only. Optional arguments are for isolated tests, never request parameters. */
export async function fetchTomskSpectrogram(
  fetchSource: typeof fetch = fetch,
  limits = { timeoutMs: TIMEOUT_MS, maxBytes: MAX_BYTES },
): Promise<Buffer> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new SpectrogramError(504, 'upstream_timeout', 'A fonte do espectrograma excedeu o tempo limite.'));
      controller.abort();
    }, limits.timeoutMs);
  });
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let complete = false;
  try {
    let response: Response;
    try {
      response = await Promise.race([fetchSource(TOMSK_URL, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SchumannObservatory/1.1; +https://ressonanciaschumann.com)',
          Accept: 'image/jpeg',
        },
      }), deadline]);
    } catch (error) {
      if (error instanceof SpectrogramError) throw error;
      throw new SpectrogramError(502, 'upstream_unavailable', 'A fonte do espectrograma está indisponível.');
    }
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw new SpectrogramError(502, 'upstream_http_error', 'A fonte do espectrograma retornou uma resposta de erro.');
    }
    if (response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'image/jpeg') {
      void response.body?.cancel().catch(() => {});
      throw new SpectrogramError(502, 'invalid_image', 'A fonte não retornou uma imagem JPEG.');
    }
    const length = Number(response.headers.get('content-length'));
    if (length > limits.maxBytes) {
      void response.body?.cancel().catch(() => {});
      throw new SpectrogramError(502, 'image_too_large', 'A imagem da fonte excedeu o tamanho permitido.');
    }
    if (!response.body) throw new SpectrogramError(502, 'invalid_image', 'A fonte não retornou uma imagem JPEG.');
    reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let size = 0;
    while (true) {
      const chunk = await Promise.race([reader.read(), deadline]);
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > limits.maxBytes) {
        throw new SpectrogramError(502, 'image_too_large', 'A imagem da fonte excedeu o tamanho permitido.');
      }
      chunks.push(Buffer.from(chunk.value));
    }
    complete = true;
    const image = Buffer.concat(chunks, size);
    if (image.length < 5 || image[0] !== 0xff || image[1] !== 0xd8 || image[2] !== 0xff ||
        image[image.length - 2] !== 0xff || image[image.length - 1] !== 0xd9) {
      throw new SpectrogramError(502, 'invalid_image', 'A fonte não retornou uma imagem JPEG válida.');
    }
    return image;
  } catch (error) {
    if (error instanceof SpectrogramError) throw error;
    throw new SpectrogramError(502, 'upstream_unavailable', 'A transferência do espectrograma falhou.');
  } finally {
    clearTimeout(timer!);
    if (!complete) {
      controller.abort();
      void reader?.cancel().catch(() => {});
    }
  }
}

export const serveTomskSpectrogram: RequestHandler = async (_req, res) => {
  try {
    const image = await fetchTomskSpectrogram();
    res.type('image/jpeg').set('Cache-Control', 'public, max-age=300').send(image);
  } catch (error) {
    const known = error instanceof SpectrogramError;
    const status = known ? error.status : 500;
    const code = known ? error.code : 'proxy_error';
    console.warn(`[Spectrogram Proxy] ${code}`);
    res.status(status).set('Cache-Control', 'no-store').json({
      available: false,
      error: code,
      message: known ? error.message : 'Falha local ao servir o espectrograma.',
    });
  }
};
