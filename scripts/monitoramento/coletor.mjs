const listRunsUrl = 'https://api.github.com/repos/marcueba/ressonancia-schumann/actions/workflows/schumann-cron.yml/runs?branch=main&event=schedule&per_page=12';
const maxBytes = 512 * 1024;
const maxRuns = 12;
const statuses = new Set(['requested', 'queued', 'pending', 'waiting', 'in_progress', 'completed']);

function utcTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 19) === value.slice(0, 19);
}

function positiveInteger(value) {
  return Number.isSafeInteger(value) && value > 0;
}

function normalizeRun(run) {
  if (run?.event !== 'schedule' || run.head_branch !== 'main' || !positiveInteger(run.id) ||
      !statuses.has(run.status) || !utcTime(run.created_at) || !utcTime(run.updated_at) ||
      (run.run_started_at != null && !utcTime(run.run_started_at)) ||
      (run.run_attempt != null && !positiveInteger(run.run_attempt))) return null;

  const conclusion = run.conclusion ?? null;
  if (run.status === 'completed'
    ? typeof conclusion !== 'string' || !/^[a-z][a-z_]{0,31}$/.test(conclusion)
    : conclusion !== null) return null;

  return {
    databaseId: run.id,
    event: run.event,
    status: run.status,
    conclusion,
    createdAt: run.created_at,
    updatedAt: run.updated_at,
    startedAt: run.run_started_at ?? null,
    attempt: run.run_attempt ?? null,
  };
}

function cancel(stream) {
  if (stream) void stream.cancel().catch(() => {});
}

async function readRuns(response, signal) {
  const type = response.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  const isJson = type === 'application/json' || type === 'application/vnd.github+json';
  if (signal.aborted || response.status !== 200 || !isJson || Number(response.headers.get('content-length')) > maxBytes) {
    cancel(response.body);
    return null;
  }
  if (!response.body) return null;

  const reader = response.body.getReader();
  const abort = () => cancel(reader);
  signal.addEventListener('abort', abort, { once: true });
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  let json = '';
  try {
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) return null;
      json += decoder.decode(value, { stream: true });
    }
    if (signal.aborted) return null;
    const page = JSON.parse(json + decoder.decode());
    const runs = page?.workflow_runs;
    if (!Array.isArray(runs) || runs.length > maxRuns || !Number.isSafeInteger(page.total_count) ||
        page.total_count < runs.length || (!runs.length && page.total_count !== 0)) return null;

    const normalized = runs.map(normalizeRun);
    if (normalized.includes(null)) return null;
    return normalized;
  } finally {
    signal.removeEventListener('abort', abort);
    cancel(reader);
    reader.releaseLock();
  }
}

/** Read one page of public scheduler metadata. Null means unknown; [] confirms no runs. */
export async function fetchCollectorRuns({ fetcher = fetch, timeoutMs = 8_000 } = {}) {
  if (typeof fetcher !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) return null;

  const controller = new AbortController();
  let timer;
  const deadline = new Promise(resolve => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });
  const request = async () => {
    const response = await fetcher(listRunsUrl, {
      method: 'GET',
      credentials: 'omit',
      redirect: 'error',
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'schumann-monitor' },
    });
    return readRuns(response, controller.signal);
  };
  try {
    return await Promise.race([request(), deadline]);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
