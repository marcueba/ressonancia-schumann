import type { RequestHandler } from 'express';
import { Worker } from 'node:worker_threads';
import { createRequire } from 'node:module';
import path from 'node:path';

const TOMSK_URL = 'https://sos70.ru/provider.php?file=shm.jpg';
const TIMEOUT_MS = 8000;
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 8192;
const MAX_PIXELS = 8_000_000;
let decoderBusy = false;
const decoderIdleWaiters = new Set<() => void>();
const MAX_DECODER_WAITERS = 8;

export class SpectrogramError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

function jpegDimensions(image: Buffer): { width: number; height: number } {
  const invalid = () => new SpectrogramError(502, 'invalid_image', 'A fonte não retornou uma imagem JPEG válida.');
  if (image.length < 5 || image[0] !== 0xff || image[1] !== 0xd8 ||
      image[image.length - 2] !== 0xff || image[image.length - 1] !== 0xd9) throw invalid();
  // Inspect bounded header segments before allocating decoder pixels. The decoder
  // subsequently verifies the complete image, including the entropy-coded scan.
  let offset = 2;
  while (offset < image.length - 2) {
    if (image[offset++] !== 0xff) throw invalid();
    while (image[offset] === 0xff) offset++;
    const marker = image[offset++];
    if (marker === 0xda || marker === 0xd9 || marker === 0 || offset + 2 > image.length) throw invalid();
    const length = image.readUInt16BE(offset);
    if (length < 2 || offset + length > image.length) throw invalid();
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      if (length < 8) throw invalid();
      const height = image.readUInt16BE(offset + 3);
      const width = image.readUInt16BE(offset + 5);
      const components = image[offset + 7];
      if (!width || !height || !components || length !== 8 + 3 * components) throw invalid();
      if (width > MAX_DIMENSION || height > MAX_DIMENSION || width * height > MAX_PIXELS) {
        throw new SpectrogramError(502, 'image_dimensions_exceeded', 'As dimensões da imagem excederam o limite permitido.');
      }
      return { width, height };
    }
    offset += length;
  }
  throw invalid();
}

// Only this internal, constant program runs in the worker. No request URL or
// upstream bytes are ever evaluated as code. Decoding stays off the event loop
// so a corrupt/expensive image cannot prevent the total deadline from firing.
const DECODER_PROGRAM = `
  const { parentPort, workerData } = require('node:worker_threads');
  try {
    const jpeg = require(workerData.decoderPath);
    const decoded = jpeg.decode(Buffer.from(workerData.image), {
      useTArray: true,
      formatAsRGBA: false,
      tolerantDecoding: false,
      maxResolutionInMP: 8,
      maxMemoryUsageInMB: 128,
    });
    parentPort.postMessage({ width: decoded.width, height: decoded.height, bytes: decoded.data.length });
  } catch (_) {
    parentPort.postMessage({ invalid: true });
  }
`;

export async function decodeJpeg(image: Buffer, signal: AbortSignal): Promise<void> {
  const expected = jpegDimensions(image);
  if (decoderBusy) throw new SpectrogramError(503, 'decoder_busy', 'A validação de imagem está ocupada. Tente novamente em instantes.');
  let worker: Worker;
  try {
    // Resolve the external runtime package from the application root, in both
    // tsx development and the esbuild dist/server.cjs artifact.
    const decoderPath = createRequire(path.join(process.cwd(), 'package.json')).resolve('jpeg-js');
    worker = new Worker(DECODER_PROGRAM, {
      eval: true,
      workerData: { image, decoderPath },
      resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16, stackSizeMb: 4 },
    });
  } catch (_) {
    throw new SpectrogramError(500, 'decoder_unavailable', 'Não foi possível validar a imagem localmente.');
  }
  decoderBusy = true;
  try {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        signal.removeEventListener('abort', aborted);
        // Terminate after every outcome, including a deadline while decoding.
        const done = () => error ? reject(error) : resolve();
        void worker.terminate().then(done, done);
      };
      const aborted = () => finish(new SpectrogramError(504, 'image_validation_timeout', 'A validação do espectrograma excedeu o tempo limite.'));
      worker.once('message', (result) => {
        const valid = !result.invalid && result.width === expected.width && result.height === expected.height &&
          result.bytes === expected.width * expected.height * 3;
        finish(valid ? undefined : new SpectrogramError(502, 'invalid_image', 'A imagem JPEG recebida não pôde ser decodificada.'));
      });
      worker.once('error', () => finish(new SpectrogramError(500, 'decoder_unavailable', 'Não foi possível validar a imagem localmente.')));
      worker.once('exit', () => { if (!settled) finish(new SpectrogramError(502, 'invalid_image', 'A validação da imagem não foi concluída.')); });
      signal.addEventListener('abort', aborted, { once: true });
      if (signal.aborted) aborted();
    });
  } finally {
    decoderBusy = false;
    for (const notify of [...decoderIdleWaiters]) notify();
  }
}

/** BGS waits for the shared worker under its existing abort deadline; no refetch or polling. */
export async function decodeJpegWhenAvailable(image: Buffer, signal: AbortSignal): Promise<void> {
  const timeout = () => new SpectrogramError(504, 'image_validation_timeout', 'A validação do espectrograma excedeu o tempo limite.');
  while (decoderBusy) {
    if (signal.aborted) throw timeout();
    if (decoderIdleWaiters.size >= MAX_DECODER_WAITERS) {
      throw new SpectrogramError(503, 'decoder_busy', 'A fila de validação de imagem está ocupada.');
    }
    await new Promise<void>((resolve, reject) => {
      const cleanup = () => { decoderIdleWaiters.delete(ready); signal.removeEventListener('abort', aborted); };
      const ready = () => { cleanup(); resolve(); };
      const aborted = () => { cleanup(); reject(timeout()); };
      decoderIdleWaiters.add(ready);
      signal.addEventListener('abort', aborted, { once: true });
      if (signal.aborted) aborted();
    });
  }
  if (signal.aborted) throw timeout();
  await decodeJpeg(image, signal);
}

/** Fixed upstream only. Optional arguments are for isolated tests, never request parameters. */
export async function fetchTomskSpectrogram(
  fetchSource: typeof fetch = fetch,
  limits = { timeoutMs: TIMEOUT_MS, maxBytes: MAX_BYTES },
): Promise<Buffer> {
  const controller = new AbortController();
  let decoding = false;
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new SpectrogramError(504, decoding ? 'image_validation_timeout' : 'upstream_timeout',
        decoding ? 'A validação do espectrograma excedeu o tempo limite.' : 'A fonte do espectrograma excedeu o tempo limite.'));
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
    decoding = true;
    await Promise.race([decodeJpeg(image, controller.signal), deadline]);
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
