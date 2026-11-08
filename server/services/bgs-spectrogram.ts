import { createHash } from 'node:crypto';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { BGS_SOURCE_PAGE_URL, BGS_ORIGINAL_URLS, BGS_STATION_ID, isBgsChannel } from '../../shared/bgs';
import type { BgsChannel, BgsObservedPeriod, BgsSpectrogramsMetadata } from '../../shared/bgs';
import { decodeJpegWhenAvailable, SpectrogramError } from './spectrogram';

const CHANNELS: BgsChannel[] = ['north', 'east'];
const DAY_MS = 24 * 60 * 60 * 1000;
const ARCHIVE_FILES = { north: 'north-channel1.jpg', east: 'east-channel2.jpg' } as const;
type VerifiedImages = Partial<Record<BgsChannel, Record<string, BgsObservedPeriod>>>;

// Periods were read from these exact official JPEGs, not inferred from the URL,
// page caption, HTTP Last-Modified, browser clock or pixel processing.
const VERIFIED_IMAGES: VerifiedImages = {
  north: { '5e3b5ed3462fecc29100622726e999047257bc9b64ba91cb56896c9dd503de47': {
    label: '05/11/2026 (data inscrita na imagem)', date: '2026-11-05', year: 2026, basis: 'image_verified_by_sha256',
  } },
  east: { '03616f6cbb55eddc21a640534aab5c0e1485f5cdc9a3755c8e1ece83dd4607aa': {
    label: '05/11/2026 (data inscrita na imagem)', date: '2026-11-05', year: 2026, basis: 'image_verified_by_sha256',
  } },
};

class BgsError extends Error { constructor(public code: string) { super(code); } }
const errorCode = (error: unknown) => error instanceof BgsError || error instanceof SpectrogramError ? error.code : 'bgs_unavailable';

function isValidPeriod(value: unknown): value is BgsObservedPeriod {
  if (!value || typeof value !== 'object') return false;
  const period = value as BgsObservedPeriod;
  const time = typeof period.date === 'string' ? Date.parse(period.date + 'T00:00:00Z') : NaN;
  return typeof period.date === 'string' && period.basis === 'image_verified_by_sha256' && typeof period.label === 'string' && Boolean(period.label.trim()) &&
    /^\d{4}-\d{2}-\d{2}$/.test(period.date) && period.year === Number(period.date.slice(0, 4)) &&
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === period.date &&
    (period.note === undefined || typeof period.note === 'string');
}

async function readBoundedArchive(file: string, maxBytes: number): Promise<Buffer> {
  const handle = await open(file, 'r');
  try {
    const { size } = await handle.stat();
    if (size <= 0 || size > maxBytes) throw new BgsError('archive_invalid');
    const bytes = Buffer.alloc(size);
    let offset = 0;
    while (offset < size) {
      const read = await handle.read(bytes, offset, size - offset, offset);
      if (!read.bytesRead) throw new BgsError('archive_invalid');
      offset += read.bytesRead;
    }
    return bytes;
  } finally { await handle.close(); }
}

/** Discover only the two fixed official links with their matching channel labels. */
export function discoverBgsChannels(html: string): Set<BgsChannel> {
  const found = new Set<BgsChannel>();
  const lower = html.toLowerCase();
  let cursor = 0;
  while (cursor < html.length) {
    const start = lower.indexOf('<a', cursor);
    if (start < 0) break;
    if (!/[\s>]/.test(lower[start + 2] ?? '')) { cursor = start + 2; continue; }
    const tagEnd = lower.indexOf('>', start + 2);
    const closeStart = lower.indexOf('</a', tagEnd + 1);
    const closeEnd = lower.indexOf('>', closeStart + 3);
    if (tagEnd < 0 || closeStart < 0 || closeEnd < 0) break;
    const attributes = html.slice(start + 2, tagEnd);
    const contents = html.slice(tagEnd + 1, closeStart);
    cursor = closeEnd + 1;
    const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attributes);
    if (!href) continue;
    let url: string;
    try { url = new URL(href[1] ?? href[2], BGS_SOURCE_PAGE_URL).href; } catch { continue; }
    const description = (attributes + ' ' + contents).replace(/&nbsp;|&#160;/gi, ' ');
    for (const channel of CHANNELS) {
      const label = channel === 'north' ? /Channel\s*1\b[\s\S]*North/i : /Channel\s*2\b[\s\S]*East/i;
      if (url === BGS_ORIGINAL_URLS[channel] && label.test(description)) found.add(channel);
    }
  }
  return found;
}

async function boundedResource(url: string, kind: 'html' | 'jpeg', fetchSource: typeof fetch, timeoutMs: number, maxBytes: number): Promise<Buffer> {
  const controller = new AbortController();
  let decoding = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let complete = false;
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { reject(new BgsError(decoding ? 'image_validation_timeout' : 'upstream_timeout')); controller.abort(); }, timeoutMs);
  });
  try {
    const response = await Promise.race([fetchSource(url, {
      redirect: 'manual', signal: controller.signal,
      headers: { Accept: kind === 'html' ? 'text/html' : 'image/jpeg', 'User-Agent': 'SchumannObservatory/1.0 (+https://ressonanciaschumann.com)' },
    }), deadline]);
    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw new BgsError(response.status >= 300 && response.status < 400 ? 'upstream_redirect' : 'upstream_http_error');
    }
    const mime = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (kind === 'html' ? mime !== 'text/html' && mime !== 'application/xhtml+xml' : mime !== 'image/jpeg') {
      void response.body?.cancel().catch(() => {});
      throw new BgsError(kind === 'html' ? 'invalid_source_page' : 'invalid_image');
    }
    if (Number(response.headers.get('content-length')) > maxBytes) {
      void response.body?.cancel().catch(() => {});
      throw new BgsError(kind === 'html' ? 'source_page_too_large' : 'image_too_large');
    }
    if (!response.body) throw new BgsError(kind === 'html' ? 'invalid_source_page' : 'invalid_image');
    reader = response.body.getReader();
    const chunks: Buffer[] = [];
    let bytes = 0;
    while (true) {
      const chunk = await Promise.race([reader.read(), deadline]);
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > maxBytes) throw new BgsError(kind === 'html' ? 'source_page_too_large' : 'image_too_large');
      chunks.push(Buffer.from(chunk.value));
    }
    complete = true;
    const buffer = Buffer.concat(chunks, bytes);
    if (kind === 'jpeg') {
      decoding = true;
      await Promise.race([decodeJpegWhenAvailable(buffer, controller.signal), deadline]);
    }
    return buffer;
  } catch (error) {
    if (error instanceof BgsError || error instanceof SpectrogramError) throw error;
    throw new BgsError('upstream_transport_error');
  } finally {
    clearTimeout(timer!);
    controller.abort();
    if (!complete) void reader?.cancel().catch(() => {});
  }
}

interface CachedImage { bytes: Buffer; sha256: string; fetchedAt: string | null; period: BgsObservedPeriod; origin: 'archive' | 'remote' }
export interface BgsSpectrogramServiceOptions {
  fetchSource?: typeof fetch;
  now?: () => number;
  verifiedImages?: VerifiedImages;
  archiveDir?: string | null; // Internal test dependency, never a request parameter.
  limits?: { timeoutMs: number; htmlMaxBytes: number; imageMaxBytes: number };
}

/** Per-instance memory cache, daily checks and failure cooldown; no timers or background polling. */
export function createBgsSpectrogramService(options: BgsSpectrogramServiceOptions = {}) {
  const fetchSource = options.fetchSource ?? fetch;
  const now = options.now ?? Date.now;
  const verifiedImages = options.verifiedImages ?? VERIFIED_IMAGES;
  const limits = options.limits ?? { timeoutMs: 8000, htmlMaxBytes: 1024 * 1024, imageMaxBytes: 5 * 1024 * 1024 };
  const archiveDir = options.archiveDir === undefined
    ? path.join(process.cwd(), process.env.NODE_ENV === 'production' ? 'dist/bgs-archive' : 'server/assets/bgs')
    : options.archiveDir;
  const archived: Partial<Record<BgsChannel, CachedImage>> = {};
  const images: Partial<Record<BgsChannel, CachedImage>> = {};
  const previous: Partial<Record<BgsChannel, CachedImage>> = {};
  const errors: Record<BgsChannel, string | null> = { north: null, east: null };
  let checkedAt = 0;
  let nextCheckAt = 0;
  let pending: Promise<void> | null = null;
  let archiveInit: Promise<void> | null = null;

  async function loadArchive() {
    if (!archiveDir) return;
    let entries: unknown[];
    try {
      const manifest = JSON.parse((await readBoundedArchive(path.join(archiveDir, 'manifest.json'), 64 * 1024)).toString('utf8'));
      if (manifest.version !== 1 || manifest.sourcePageUrl !== BGS_SOURCE_PAGE_URL || !Array.isArray(manifest.images) || manifest.images.length > CHANNELS.length) {
        throw new BgsError('archive_invalid');
      }
      entries = manifest.images;
    } catch { for (const channel of CHANNELS) errors[channel] = 'archive_invalid'; return; }
    for (const channel of CHANNELS) {
      try {
        const matches = entries.filter(entry => entry && typeof entry === 'object' && (entry as { channel?: unknown }).channel === channel);
        if (matches.length !== 1) throw new BgsError('archive_invalid');
        const entry = matches[0] as Record<string, unknown>;
        const period = entry.observedPeriod;
        const approved = typeof entry.sha256 === 'string' ? verifiedImages[channel]?.[entry.sha256] : undefined;
        if (entry.file !== ARCHIVE_FILES[channel] || entry.originalUrl !== BGS_ORIGINAL_URLS[channel] ||
            typeof entry.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256) || !isValidPeriod(period) || !isValidPeriod(approved) ||
            period.date !== approved.date || period.year !== approved.year || period.label !== approved.label || period.note !== approved.note ||
            entry.year !== period.year || entry.credit !== `British Geological Survey © UKRI ${period.year}`) {
          throw new BgsError('archive_invalid');
        }
        const bytes = await readBoundedArchive(path.join(archiveDir, ARCHIVE_FILES[channel]), limits.imageMaxBytes);
        if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new BgsError('archive_invalid');
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), limits.timeoutMs);
        try { await decodeJpegWhenAvailable(bytes, controller.signal); }
        finally { clearTimeout(timer); }
        const image: CachedImage = { bytes, sha256: entry.sha256, fetchedAt: null, period: { ...period }, origin: 'archive' };
        archived[channel] = image;
        images[channel] = image;
        errors[channel] = null;
      } catch { errors[channel] = 'archive_invalid'; }
    }
  }
  function initializeArchive() { return archiveInit ??= loadArchive(); }

  async function refresh() {
    checkedAt = now();
    try {
      const page = await boundedResource(BGS_SOURCE_PAGE_URL, 'html', fetchSource, limits.timeoutMs, limits.htmlMaxBytes);
      const discovered = discoverBgsChannels(page.toString('utf8'));
      // Two validations are deliberately sequential: reuse the existing bounded
      // decoder, without multiplying its memory budget for concurrent channels.
      for (const channel of CHANNELS) {
        try {
          if (!discovered.has(channel)) throw new BgsError('source_link_missing');
          const bytes = await boundedResource(BGS_ORIGINAL_URLS[channel], 'jpeg', fetchSource, limits.timeoutMs, limits.imageMaxBytes);
          const sha256 = createHash('sha256').update(bytes).digest('hex');
          const period = verifiedImages[channel]?.[sha256];
          if (!isValidPeriod(period)) throw new BgsError('material_unverified');
          if (images[channel] && images[channel]!.sha256 !== sha256) previous[channel] = images[channel];
          images[channel] = { bytes: archived[channel]?.sha256 === sha256 ? archived[channel]!.bytes : bytes, sha256, fetchedAt: new Date(now()).toISOString(), period: { ...period }, origin: 'remote' };
          errors[channel] = null;
        } catch (error) { errors[channel] = errorCode(error); }
      }
    } catch (error) { for (const channel of CHANNELS) errors[channel] = errorCode(error); }
    finally { nextCheckAt = now() + DAY_MS; }
  }

  return {
    async getMetadata(): Promise<BgsSpectrogramsMetadata> {
      await initializeArchive();
      let refreshed = false;
      if (now() >= nextCheckAt) {
        if (!pending) pending = refresh().finally(() => { pending = null; });
        await pending;
        refreshed = true;
      }
      const channelMetadata = (channel: BgsChannel) => {
        const image = images[channel];
        return {
          channel, available: Boolean(image),
          imageUrl: image ? `/api/bgs/spectrograms/${channel}/${image.sha256}.jpg` : null,
          originalUrl: BGS_ORIGINAL_URLS[channel], sha256: image?.sha256 ?? null,
          imageOrigin: image?.origin ?? null, fetchedAt: image?.fetchedAt ?? null, checkedAt: new Date(checkedAt).toISOString(), nextCheckAt: new Date(nextCheckAt).toISOString(),
          cacheState: !image ? 'unavailable' as const : errors[channel] ? 'stale' as const : refreshed ? 'fresh' as const : 'cached' as const,
          observedPeriod: image?.period ?? null, credit: image ? `British Geological Survey © UKRI ${image.period.year}` : null,
          error: errors[channel],
        };
      };
      return { stationId: BGS_STATION_ID, sourcePageUrl: BGS_SOURCE_PAGE_URL, channels: { north: channelMetadata('north'), east: channelMetadata('east') } };
    },
    async getImage(channel: unknown, sha256: unknown): Promise<Buffer | null> {
      if (!isBgsChannel(channel) || typeof sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(sha256)) return null;
      await initializeArchive();
      const image = [images[channel], previous[channel], archived[channel]].find(candidate => candidate?.sha256 === sha256);
      return image?.bytes ?? null;
    },
  };
}

export const bgsSpectrogramService = createBgsSpectrogramService();
