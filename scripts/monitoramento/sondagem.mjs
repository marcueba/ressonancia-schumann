import { createHash } from 'node:crypto';

const officialOrigin = 'https://ressonanciaschumann.com';
const loopbackHosts = new Set(['127.0.0.1', '[::1]', 'localhost']);
const endpoints = new Map([
  ['home', '/'],
  ['config', '/api/config'],
  ['health', '/healthz'],
  ['solar', '/api/solar'],
  ['geomagnetic', '/api/geomagnetic'],
  ['current', '/api/current'],
  ['history', '/api/history?range=90d'],
  ['bgs', '/api/bgs/spectrograms'],
  ['tomskImage', '/api/spectrogram/tomsk'],
]);
const maxHtmlBytes = 256 * 1024;
const maxJsonBytes = 512 * 1024;
const maxErrorBytes = 64 * 1024;
const maxJpegBytes = 5 * 1024 * 1024;
const utf8 = new TextDecoder('utf-8', { fatal: true });

function safeUrl(origin, key) {
  const url = new URL(origin);
  const path = endpoints.get(key);
  const atRoot = url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password;
  const permitted = url.origin === officialOrigin || (url.protocol === 'http:' && loopbackHosts.has(url.hostname));
  if (!path || !atRoot || !permitted) throw new TypeError('Invalid monitoring origin or endpoint');
  return new URL(path, url).href;
}

function cancelStream(stream) {
  if (stream) void stream.cancel().catch(() => {});
}

async function readBounded(response, byteLimit, signal) {
  const length = response.headers.get('content-length');
  if (/^\d+$/.test(length ?? '') && Number(length) > byteLimit) {
    cancelStream(response.body);
    return { error: 'body_too_large' };
  }
  if (!response.body) return { bytes: Buffer.alloc(0) };

  const reader = response.body.getReader();
  const abort = () => cancelStream(reader);
  signal.addEventListener('abort', abort, { once: true });
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return { bytes: Buffer.concat(chunks, size) };
      size += value.byteLength;
      if (size > byteLimit) {
        cancelStream(reader);
        return { error: 'body_too_large' };
      }
      chunks.push(value);
    }
  } finally {
    signal.removeEventListener('abort', abort);
    reader.releaseLock();
  }
}

function mediaType(value) {
  const essence = value?.split(';', 1)[0].trim().toLowerCase();
  return essence && /^[a-z0-9.+_-]{1,50}\/[a-z0-9.+_-]{1,50}$/.test(essence) ? essence : undefined;
}

const isJson = type => type === 'application/json' || Boolean(type?.endsWith('+json'));

function plainText(markup) {
  return markup
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:#(x[0-9a-f]+|\d+)|(atilde|nbsp|amp));/gi, (match, numeric, named) => {
      if (named) return { atilde: 'ã', nbsp: ' ', amp: '&' }[named.toLowerCase()];
      const point = numeric[0].toLowerCase() === 'x' ? parseInt(numeric.slice(1), 16) : Number(numeric);
      return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : match;
    })
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function inspectHome(bytes) {
  let html;
  try {
    html = utf8.decode(bytes).replace(/<!--[\s\S]*?-->/g, '');
  } catch {
    return { error: 'invalid_html' };
  }
  if (!/^\s*(?:<!doctype[ \t\r\n]+html(?:[ \t\r\n][^>]*)?>|<html(?=[\s>]))/i.test(html)) {
    return { error: 'invalid_html' };
  }
  const visible = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '');
  const coldStart = /\b(?:free instance will spin down|waiting for (?:this|your) (?:service|instance) to start|application loading|(?:service|instance) is waking up)\b/i.test(plainText(visible));
  const expectedPage = !coldStart && Array.from(visible.matchAll(/<(title|h1)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi))
    .some(match => /\bvisao geral\b/.test(plainText(match[2])));
  return { error: null, data: { expectedPage, coldStart } };
}

function inspectJson(bytes, isHttpError) {
  let data;
  try {
    data = JSON.parse(utf8.decode(bytes));
  } catch {
    return { error: isHttpError ? 'http_error' : 'invalid_json' };
  }
  if (!isHttpError) return { error: null, data };

  // Error descriptions may contain arbitrary content. Retain only short machine codes.
  const code = data?.error;
  return typeof code === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(code)
    ? { error: 'http_error', data: { error: code } }
    : { error: 'http_error' };
}

function inspectJpeg(bytes) {
  // These markers establish a JPEG envelope only. They do not decode the image.
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9) {
    return { error: 'invalid_jpeg' };
  }
  return { error: null, digest: createHash('sha256').update(bytes).digest('hex') };
}

export async function probe(origin, key, { fetcher = fetch, timeoutMs = 12_000 } = {}) {
  const url = safeUrl(origin, key);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000 || typeof fetcher !== 'function') {
    throw new RangeError('Invalid monitoring deadline or fetch implementation');
  }

  const started = performance.now();
  const controller = new AbortController();
  const { signal } = controller;
  let status = null;
  let contentType;
  let timer;

  const timeout = new Promise(resolve => {
    timer = setTimeout(() => {
      resolve({ error: 'timeout' });
      controller.abort();
    }, timeoutMs);
  });

  const read = async () => {
    const accept = key === 'home' ? 'text/html' : key === 'tomskImage' ? 'image/jpeg, application/json' : 'application/json';
    const response = await fetcher(url, {
      method: 'GET',
      headers: { accept },
      redirect: 'manual',
      credentials: 'omit',
      cache: 'no-store',
      signal,
    });
    if (signal.aborted) {
      cancelStream(response.body);
      return { error: 'timeout' };
    }
    status = response.status;
    contentType = mediaType(response.headers.get('content-type'));
    if (response.redirected || (status >= 300 && status < 400 && status !== 304)) {
      cancelStream(response.body);
      return { error: 'redirect' };
    }

    const httpError = status < 200 || status >= 300;
    const expectedType = key === 'home' ? contentType === 'text/html'
      : key === 'tomskImage' ? contentType === 'image/jpeg' : isJson(contentType);
    if ((httpError && !isJson(contentType)) || (!httpError && !expectedType)) {
      cancelStream(response.body);
      return { error: httpError ? 'http_error' : 'unexpected_content_type' };
    }
    const limit = httpError ? maxErrorBytes : key === 'home' ? maxHtmlBytes : key === 'tomskImage' ? maxJpegBytes : maxJsonBytes;
    const { bytes, error } = await readBounded(response, limit, signal);
    if (error) return { error };
    if (httpError || key !== 'home' && key !== 'tomskImage') return inspectJson(bytes, httpError);
    return key === 'home' ? inspectHome(bytes) : inspectJpeg(bytes);
  };

  let outcome;
  try {
    outcome = await Promise.race([read(), timeout]);
  } catch {
    outcome = { error: signal.aborted ? 'timeout' : status === null ? 'network_error' : 'body_read_error' };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
  return {
    status,
    elapsedMs: Math.round(performance.now() - started),
    ...(contentType ? { contentType } : {}),
    ...outcome,
  };
}
