import { DEFAULT_POLICY } from './politica.mjs';
export { MINUTE } from './politica.mjs';
const supportedRecovery = new Set(['ok', 'archived', 'partial', 'observation_unknown']);
const runStatuses = new Set(['requested', 'queued', 'pending', 'waiting', 'in_progress', 'completed']);

function time(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value)) return null;
  const ms = Date.parse(value);
  const iso = Number.isFinite(ms) ? new Date(ms).toISOString() : '';
  return iso.slice(0, 19) === value.slice(0, 19) ? ms : null;
}

function operational(id, checkedAt, condition, reason, alertable = false, probe = null) {
  return { id, checkedAt, condition, reason, alertable,
    httpStatus: probe?.status ?? null, elapsedMs: probe?.elapsedMs ?? null };
}

function success(probe) {
  return probe?.status === 200 && !probe.error;
}

/** The browser-facing page, the app, the checker, and latency are separate signals. */
export function assessSite({ home, config, health }, checkedAt, { requireHealth = false, policy = DEFAULT_POLICY } = {}) {
  if (time(checkedAt) === null) throw new TypeError('Invalid UTC sample timestamp');
  const check = (id, condition, reason, shouldAlert, result) => operational(id, checkedAt, condition, reason, shouldAlert, result);
  const isSiteUp = success(home) && home.data?.expectedPage === true && home.data?.coldStart === false;
  const hasHttpFailure = home?.status !== null && home?.status !== undefined &&
    ((home.status >= 500 && home.status < 600) || home.status === 404);
  const responseMismatch = home?.status !== null && home?.status !== undefined &&
    home.status !== 429 && (home.error === 'redirect' || (home.status === 200 &&
      (!home.error || ['unexpected_content_type', 'invalid_html'].includes(home.error)) && !isSiteUp));
  const site = isSiteUp ? check('site.http', 'ok', null, false, home) :
    hasHttpFailure || responseMismatch ? check('site.http', 'site_unavailable',
      hasHttpFailure ? 'http_failure' : 'wrong_public_page', true, home) :
      check('site.http', 'inconclusive', 'monitor_could_not_confirm_page', false, home);

  const transportFailure = !hasHttpFailure && !responseMismatch && !isSiteUp;
  const runner = transportFailure ? check('site.probe', 'probe_error', home?.error ?? 'unconfirmed', true, home) :
    check('site.probe', 'ok', null, false, home);

  const backend = !isSiteUp ? check('site.backend', 'inconclusive', 'site_not_confirmed', false, config) :
    success(config) && config.data?.mode === 'live' ? check('site.backend', 'ok', null, false, config) :
      config?.status === null || config?.status === undefined || config?.status === 429 ||
      ['timeout', 'body_read_error'].includes(config.error) ? check('site.backend', 'inconclusive', 'api_check_unconfirmed', false, config) :
        check('site.backend', 'backend_error', 'api_config_not_live', true, config);

  const endpoint = !requireHealth ? check('site.healthz', 'inactive', 'http_health_not_configured', false, health) :
      success(health) && health.data?.status === 'ok' ? check('site.healthz', 'ok', null, false, health) :
        health?.status !== null && health?.status !== undefined && health.status !== 429 && health.error !== 'timeout' ?
          check('site.healthz', 'backend_error', 'health_contract_failed', true, health) :
          check('site.healthz', 'inconclusive', 'health_check_unconfirmed', false, health);

  const latency = !isSiteUp || !Number.isFinite(home.elapsedMs) ?
    check('site.latency', 'inconclusive', 'no_successful_latency_sample', false, home) :
    home.elapsedMs >= policy.siteLatencyMs ?
      check('site.latency', 'slow', 'public_response_latency_limit', true, home) :
      check('site.latency', 'ok', null, false, home);

  return [site, runner, backend, endpoint, latency];
}

/** This tracks the existing schedule, independently of its ability to create observations. */
export function assessSchedule(runs, checkedAt, { delayMs = DEFAULT_POLICY.collectorDelayMs } = {}) {
  const now = time(checkedAt);
  if (now === null) throw new TypeError('Invalid UTC sample timestamp');
  const inconclusive = () => operational('elf.schedule', checkedAt, 'probe_error', 'run_list_unavailable');
  if (!Array.isArray(runs) || runs.some(run => !['schedule','workflow_dispatch'].includes(run?.event))) {
    return inconclusive();
  }
  const scheduled = runs.filter(run => run.event === 'schedule');
  if (scheduled.some(run => !runStatuses.has(run.status) || time(run.createdAt) === null ||
      time(run.updatedAt) === null || time(run.createdAt) > time(run.updatedAt) || time(run.updatedAt) > now)) {
    return inconclusive();
  }
  scheduled.sort((a, b) => time(b.createdAt) - time(a.createdAt));
  const dispatch = scheduled[0];
  const previousDispatch = scheduled.find(run => time(run.createdAt) < time(dispatch.createdAt));
  // A retry of an old dispatch must not hide a more recent failed dispatch.
  const last = scheduled.find(run => run.status === 'completed');
  if (!last) return operational('elf.schedule', checkedAt, 'scheduler_error', 'no_completed_scheduled_run', true);
  const ageMs = now - time(last.updatedAt);
  const dispatchAgeMs = now - time(dispatch.createdAt);
  const completedDispatchAgeMs = now - time(last.createdAt);
  const conclusion = typeof last.conclusion === 'string' && /^[a-z][a-z_]{0,31}$/.test(last.conclusion) ? last.conclusion : null;
  const reason = ageMs > delayMs ? 'no_recent_completion' : dispatchAgeMs > delayMs ?
    'no_recent_scheduled_dispatch' : completedDispatchAgeMs > delayMs ?
      'no_recent_completed_dispatch' : conclusion !== 'success' ? 'scheduled_run_failed' : null;
  return { ...operational('elf.schedule', checkedAt, reason ? 'scheduler_error' : 'ok', reason, !!reason),
    lastRunId: Number.isSafeInteger(last.databaseId) && last.databaseId > 0 ? last.databaseId : null,
    lastRunAt: last.updatedAt, ageMs, conclusion, completedDispatchAgeMs,
    lastScheduledAt: dispatch.createdAt, lastScheduledStatus: dispatch.status, dispatchAgeMs,
    dispatchGapMs: previousDispatch ? time(dispatch.createdAt) - time(previousDispatch.createdAt) : null };
}

/** Enabled only after establishing a permitted, verified observing contract. */
export function assessObservationProgress({ authorized = false, expectedSince, lastVerifiedAt } = {}, checkedAt, policy = DEFAULT_POLICY) {
  const now = time(checkedAt);
  if (now === null) throw new TypeError('Invalid UTC sample timestamp');
  if (!authorized) return operational('elf.observations', checkedAt, 'blocked', 'no_approved_observation_clock');
  const start = time(expectedSince);
  const observed = time(lastVerifiedAt);
  if (start === null || start > now || (lastVerifiedAt != null && (observed === null || observed > now))) {
    return operational('elf.observations', checkedAt, 'observation_unknown', 'unverified_observation_clock');
  }
  const ageMs = now - Math.max(start, observed ?? start);
  const stale = ageMs > policy.elfSilenceMs;
  return { ...operational('elf.observations', checkedAt, stale ? 'stale' : 'ok',
    stale ? 'no_verified_observation_within_limit' : null, stale),
  observedAt: observed === null ? null : lastVerifiedAt, observationAgeMs: observed === null ? null : now - observed, silenceAgeMs: ageMs };
}

const advanceCount = (count, continuous) =>
  Math.min(Number.MAX_SAFE_INTEGER, (continuous ? count ?? 0 : 0) + 1);

/** Emit transitions locally. Scope and cadence are part of the sample, never external notifications. */
export function updateState(previous, checks, checkedAt, policy = DEFAULT_POLICY) {
  const now = time(checkedAt);
  if (now === null) throw new TypeError('Invalid UTC sample timestamp');
  if (previous != null && (previous.version !== 1 || !previous.signals || typeof previous.signals !== 'object' || Array.isArray(previous.signals))) {
    throw new TypeError('Unsupported previous monitor state');
  }
  const signals = Object.assign(Object.create(null), previous?.signals);
  const events = [];
  for (const check of checks) {
    if (!/^[a-z][a-z0-9.-]{1,80}$/.test(check.id) || check.checkedAt !== checkedAt) {
      throw new TypeError('Invalid monitor sample');
    }
    const existing = signals[check.id] ?? {};
    const cadence = check.id.startsWith('site.') ? policy.siteCadenceMs : policy.sourceCadenceMs;
    const lastAt = time(existing.lastCountedAt);
    if (lastAt !== null && now - lastAt < cadence / 2) continue;
    const continuous = lastAt !== null && now - lastAt <= policy.maxGapPeriods * cadence;
    const validTime = time(check.lastValidReceivedAt);
    const observedTime = time(check.observedAt);
    const previousObserved = time(existing.lastObservedAt);
    const healthyRead = supportedRecovery.has(check.condition) ||
      (['blocked','stale'].includes(check.condition) && validTime !== null && validTime <= now);
    const freshClock = observedTime !== null && observedTime <= now || check.observationAgeDays != null;
    const freshnessRecovered = ['ok','partial'].includes(check.condition) && freshClock;
    const recovering = healthyRead && !check.alertable &&
      (existing.incidentCondition !== 'stale' || freshnessRecovered);
    const next = {
      condition: check.condition,
      reason: check.reason ?? null,
      lastCountedAt: checkedAt,
      lastValidAt: validTime !== null && validTime <= now ? check.lastValidReceivedAt : existing.lastValidAt ?? null,
      lastObservedAt: observedTime !== null && observedTime <= now &&
        (previousObserved === null || observedTime >= previousObserved) ? check.observedAt : existing.lastObservedAt ?? null,
      lastObservedDate: [check.observedDate, existing.lastObservedDate].filter(Boolean).sort().at(-1) ?? null,
      lastDigest: check.digest ?? existing.lastDigest ?? null,
      lastDigestChangeAt: check.digest && check.digest !== existing.lastDigest ?
        check.lastValidReceivedAt ?? checkedAt : existing.lastDigestChangeAt ?? null,
      consecutiveFailures: check.alertable ? advanceCount(existing.consecutiveFailures, continuous) : 0,
      consecutiveRecoveries: existing.incidentSince && recovering ? advanceCount(existing.consecutiveRecoveries, continuous) : 0,
      incidentSince: existing.incidentSince ?? null,
      incidentCondition: existing.incidentCondition ?? null,
    };
    const limit = check.id === 'site.latency' ? policy.slowSamples : policy.failureSamples;
    if (!next.incidentSince && next.consecutiveFailures >= limit) {
      next.incidentSince = checkedAt;
      next.incidentCondition = check.condition;
      events.push({ type: 'opened', id: check.id, at: checkedAt, condition: check.condition, reason: check.reason });
    } else if (next.incidentSince && next.consecutiveRecoveries >= policy.recoverySamples) {
      events.push({ type: 'recovered', id: check.id, at: checkedAt, incidentSince: next.incidentSince });
      next.incidentSince = null;
      next.incidentCondition = null;
      next.consecutiveRecoveries = 0;
    }
    signals[check.id] = next;
  }
  return { state: { version: 1, signals }, events };
}
