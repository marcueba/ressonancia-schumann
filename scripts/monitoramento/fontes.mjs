import { DAY, DEFAULT_POLICY } from './politica.mjs';
const SHA256 = /^[a-f0-9]{64}$/;
const TOMSK_MODES = ['fundamental', 'mode2', 'mode3', 'mode4', 'mode5'];

// Operational starting points, not the providers' SLA. Kp timestamps label 3-hour
// intervals. NOAA RTSW and X-ray products have minute-scale data but consultation
// is intentionally less frequent than delivery. Catalogue event age has no limit.
const SOLAR_PRODUCTS = [
  {key:'xray', id:'noaa-xray', ageMs:'noaaFastMaxAgeMs', value:(data) => data.currentXRay?.flux},
  {key:'windSpeed', id:'noaa-wind-speed', group:'wind', ageMs:'noaaFastMaxAgeMs', value:(data) => data.solarWindSpeed},
  {key:'density', id:'noaa-density', group:'wind', ageMs:'noaaFastMaxAgeMs', value:(data) => data.protonDensity},
  {key:'bz', id:'noaa-bz', group:'imf', ageMs:'noaaFastMaxAgeMs', value:(data) => data.bz},
  {key:'bt', id:'noaa-bt', group:'imf', ageMs:'noaaFastMaxAgeMs', value:(data) => data.bt},
  {key:'f107', id:'noaa-f107', ageMs:'noaaF107MaxAgeMs', ageDays:'noaaF107MaxAgeDays', value:(data) => data.solarFlux},
  {key:'regions', id:'noaa-regions', ageDays:'noaaRegionsMaxAgeDays', value:(data) => data.sunspots},
  {key:'flares', id:'noaa-flares', value:(data) => data.flares, event:true},
];
const NOAA_ERRORS = /^(?:timeout|transport_error|http_error:[1-5]\d\d|invalid_json|invalid_schema|no_valid_data|incomplete_data|ambiguous_event)$/;
const TOMSK_NUMERIC_ERRORS = /^(?:upstream_timeout|upstream_http_error|upstream_transport_error|invalid_json|invalid_schema)$/;
const TOMSK_JPEG_ERRORS = /^(?:upstream_unavailable|upstream_http_error|upstream_timeout|invalid_image|image_too_large)$/;
const sourceCode = (value) => typeof value === 'string' && value.length <= 64 && /^[a-z0-9_]+(?::[1-5]\d\d)?$/.test(value) ? value : null;
const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

function dateOf(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === value ? value : null;
}
function instantOf(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2})T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9](?:\.\d+)?(Z|[+-](?:0[0-9]|1[0-3]):[0-5][0-9]|[+-]14:00)$/.exec(value);
  if (!match || !dateOf(match[1]) || match[2] === '-00:00') return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}
const knownInstant = (value, now) => {
  const time = instantOf(value);
  return time !== null && time <= now ? new Date(time).toISOString() : null;
};
const calendarAge = (date, now) => (Date.parse(new Date(now).toISOString().slice(0, 10)) - Date.parse(date)) / DAY;

// Distinct fields retain their scientific precision. Date parsing above computes
// differences between civil dates only; no midnight timestamp is exposed.
function describeObservation(meta, now) {
  const result = {observedAt:null, observedDate:null, observationAgeMs:null, observationAgeDays:null};
  if (meta.timePrecision === 'date') {
    const date = dateOf(meta.observedDate);
    const days = date === null ? null : calendarAge(date, now);
    return days !== null && days >= 0
      ? { ...result, observedDate:date, observationAgeDays:days }
      : {...result, timeReason:days !== null ? 'future_observation_date' : 'observation_date_unknown'};
  }
  const instant = instantOf(meta.observedAt);
  if (meta.timePrecision === 'timestamp' && instant !== null && instant <= now) {
    const iso = new Date(instant).toISOString();
    return {...result, observedAt:iso, observedDate:iso.slice(0, 10), observationAgeMs:now-instant};
  }
  return {...result, timeReason:instant !== null && instant > now ? 'future_observation_time' : 'observation_time_unknown'};
}

// These errors affect this route or its dependency. The site availability check is
// independent, including when a probing transport times out without an HTTP status.
function routeFailure(probe, classify) {
  if (probe.status == null) return {condition:'probe_error', reason:'probe_transport', alertable:false};
  if (probe.status === 429) return {condition:'probe_error', reason:'probe_rate_limited', alertable:false};
  if (probe.status >= 200 && probe.status < 300) {
    if (['unexpected_content_type','invalid_json','invalid_jpeg'].includes(probe.error)) {
      return {condition:'backend_error', reason:probe.error, alertable:true};
    }
    return probe.error ? {condition:'probe_error', reason:'probe_payload_unavailable', alertable:false} : null;
  }
  const reason = sourceCode(probe.data?.error) ?? sourceCode(probe.error) ?? 'http_'+probe.status;
  if (probe.status >= 500 && classify(reason, probe.status)) return {condition:'source_unavailable', reason, alertable:true};
  return {condition:'backend_error', reason, alertable:true};
}

function availableProduct(product, data) {
  const value = product.value(data);
  return product.event ? typeof value === 'string' && value.trim().length > 0 : isFiniteNumber(value);
}

export function assessSources(probes, checkedAt, policy = DEFAULT_POLICY) {
  const now = instantOf(checkedAt);
  if (now === null || !checkedAt.endsWith('Z')) throw new TypeError('checkedAt must be an ISO UTC instant');
  const checks = [];
  function emit(id, condition, extra = {}) {
    checks.push({id, condition, checkedAt, alertable:false, ...extra});
  }
  function route(id, key, classify = () => false, extra = {}) {
    const probe = probes[key];
    if (!probe) return null;
    const failure = routeFailure(probe, classify);
    if (failure) {
      emit(id, failure.condition, {...failure, ...extra});
      return null;
    }
    return probe;
  }
  function invalid(id, reason) { emit(id, 'backend_error', {alertable:true, reason}); }
  const valid = probe => ({lastValidReceivedAt: knownInstant(probe.completedAt, now) ?? checkedAt});

  const solar = route('noaa-solar', 'solar', (error) => error === 'noaa_products_unavailable' || NOAA_ERRORS.test(error));
  if (solar) {
    const data = solar.data;
    if (data?.success !== true || data.available !== true || !data.productMetadata || typeof data.productMetadata !== 'object') {
      invalid('noaa-solar', 'invalid_noaa_solar_payload');
    } else {
      // A valid aggregate may include a lagging product. Its max timestamp is never
      // used for per-product freshness.
      const received = valid(solar);
      emit('noaa-solar', 'ok', received);
      for (const product of SOLAR_PRODUCTS) {
        const meta = data.productMetadata[product.key];
        const cause = sourceCode(meta?.error) ?? sourceCode(data.productErrors?.[product.group ?? product.key]);
        if (product.event && meta?.state === 'absent') {
          emit(product.id, 'ok', {...received, observedAt:null, reason:'valid_empty_event_catalogue'});
          continue;
        }
        if (meta?.state === 'unavailable') {
          emit(product.id, cause === 'parser_error' ? 'backend_error' : 'source_unavailable',
            {alertable:true, reason:cause ?? 'no_valid_source_value'});
          continue;
        }
        if ((meta?.state !== 'available' && meta?.state !== 'partial') || !availableProduct(product, data)) {
          invalid(product.id, 'invalid_noaa_product_payload');
          continue;
        }
        const observation = describeObservation(meta, now);
        const staleInstant = observation.observationAgeMs !== null && product.ageMs && observation.observationAgeMs >= policy[product.ageMs];
        const staleDate = observation.observationAgeDays !== null && product.ageDays && observation.observationAgeDays >= policy[product.ageDays];
        if (staleInstant || staleDate) {
          emit(product.id, 'stale', {...received, ...observation, alertable:true, reason:'observation_age_limit'});
        } else if (observation.timeReason) {
          emit(product.id, 'observation_unknown', {...received, ...observation, reason:observation.timeReason});
        } else {
          emit(product.id, meta.state === 'partial' ? 'partial' : 'ok', {...received, ...observation, ...(cause ? {reason:cause} : {})});
        }
      }
    }
  }

  const kp = route('noaa-kp', 'geomagnetic', (error) => NOAA_ERRORS.test(error));
  if (kp) {
    if (kp.data?.success !== true || kp.data.available !== true || !isFiniteNumber(kp.data.currentKp) || kp.data.currentKp < 0 || kp.data.currentKp > 9) {
      invalid('noaa-kp', 'invalid_noaa_kp_payload');
    } else {
      const observation = describeObservation({timePrecision:'timestamp',observedAt:kp.data.timestamp}, now);
      const received = valid(kp);
      if (observation.timeReason) emit('noaa-kp', 'observation_unknown', {...received, ...observation, reason:observation.timeReason});
      else if (observation.observationAgeMs >= policy.noaaKpMaxAgeMs) emit('noaa-kp', 'stale', {...received, ...observation, alertable:true, reason:'observation_age_limit'});
      else emit('noaa-kp', 'ok', {...received, ...observation});
    }
  }

  const current = route('tomsk-numeric', 'current', (error) => TOMSK_NUMERIC_ERRORS.test(error));
  if (current) {
    const data = current.data;
    if (data?.is_demo !== false || data.source_type !== 'derived_spectrogram' || data.derived_from_image !== true ||
        data.is_primary_measurement !== false || data.timestamp !== null) {
      invalid('tomsk-numeric', 'invalid_tomsk_numeric_provenance');
    } else {
      const sourceQueriedAt = knownInstant(data.collected_at, now);
      const sourceUpdatedAt = knownInstant(data.source_updated_at, now);
      const estimatedObservationAt = knownInstant(data.estimated_observation_at, now);
      const details = {sourceQueriedAt, sourceUpdatedAt, estimatedObservationAt, observedAt:null,
        sourcePublicationAgeMs:sourceUpdatedAt === null ? null : now-Date.parse(sourceUpdatedAt),
        estimatedAgeMs:estimatedObservationAt === null ? null : now-Date.parse(estimatedObservationAt)};
      const modeCount = TOMSK_MODES.map(key => data[key]?.frequency).filter(value => isFiniteNumber(value) && value > 0 && value <= 40).length;
      const availability = modeCount === 0 ? 'unavailable' : modeCount === TOMSK_MODES.length ? 'available' : 'partial';
      if (data.availability !== availability || data.available !== (availability !== 'unavailable')) {
        invalid('tomsk-numeric', 'invalid_tomsk_numeric_payload');
      } else if (availability === 'unavailable' && data.availability_reason === 'source_unavailable') {
        emit('tomsk-numeric','source_unavailable',{...details, alertable:true, reason:'source_unavailable'});
      } else if (availability === 'unavailable') {
        // The provider understood a valid source document without eligible
        // measurements. Keep that distinct from explicit source failures.
        emit('tomsk-numeric','observation_unknown',{...details, routeHealthy:true, reason:'no_valid_frequencies'});
      } else if ((details.sourcePublicationAgeMs !== null && details.sourcePublicationAgeMs >= policy.tomskPublicationMaxAgeMs) || data.is_historical === true) {
        // No documented hard SLA. An old estimate or publication is informative.
        emit('tomsk-numeric','stale',{...valid(current),...details,reason:data.is_historical === true ? 'source_marks_historical' : 'source_publication_age'});
      } else if (availability === 'partial') {
        emit('tomsk-numeric','partial',{...valid(current),...details,reason:'estimated_or_missing_modes'});
      } else {
        emit('tomsk-numeric','observation_unknown',{...valid(current),...details,reason:'estimated_observation_only'});
      }
    }
  }

  const image = route('tomsk-jpeg', 'tomskImage', (error) => TOMSK_JPEG_ERRORS.test(error));
  if (image) {
    const mime = typeof image.contentType === 'string' ? image.contentType.split(';')[0].trim().toLowerCase() : '';
    if (mime !== 'image/jpeg') invalid('tomsk-jpeg', 'invalid_jpeg_mime');
    else if (typeof image.digest !== 'string' || !SHA256.test(image.digest)) emit('tomsk-jpeg', 'probe_error', {reason:'jpeg_digest_unavailable'});
    // A fingerprint identifies bytes and supports detection of an image change.
    // The backend provides no scientifically qualified observation clock for JPEGs.
    else emit('tomsk-jpeg','observation_unknown',{...valid(image),digest:image.digest,observedAt:null,reason:'jpeg_observation_time_unknown'});
  }

  // This deployment purposely serves BGS archive only. Do not age-alert a
  // verified immutable archive or mistake archive corruption for a BGS outage.
  if (probes.bgs) for (const channel of ['north','east']) {
    const id = 'bgs-' + channel;
    const bgs = route(id, 'bgs');
    if (!bgs) continue;
    const data = bgs.data?.channels?.[channel], period = data?.observedPeriod;
    const date = dateOf(period?.date);
    if (data?.imageOrigin === 'remote') {
      invalid(id, 'unexpected_bgs_remote_origin');
      continue;
    }
    if (data?.imageOrigin !== 'archive' || data.available !== true || data.channel !== channel || typeof data.sha256 !== 'string' ||
        !SHA256.test(data.sha256) || data.imageUrl !== '/api/bgs/spectrograms/'+channel+'/'+data.sha256+'.jpg' ||
        period?.basis !== 'image_verified_by_sha256' || date === null || calendarAge(date, now) < 0 ||
        data.credit !== 'British Geological Survey © UKRI '+date.slice(0,4) || (data.error && data.error !== 'material_unverified')) {
      invalid(id, sourceCode(data?.error) ?? 'bgs_archive_unavailable');
    } else {
      emit(id, 'archived', {...valid(bgs), digest:data.sha256, observedAt:null, observedDate:date, observationAgeDays:calendarAge(date,now),
        sourceQueriedAt:null, reason:data.error === 'material_unverified' ? 'material_unverified_retained_archive' : 'verified_archive_no_update_sla'});
    }
  }

  const history = route('elf-history', 'history', () => false, {dependency:'history_storage'});
  if (history) {
    if (!Array.isArray(history.data) || history.data.some(row => !row || typeof row !== 'object' || Array.isArray(row))) {
      invalid('elf-history', 'invalid_history_payload');
    } else {
      const times = history.data.flatMap(row => {
        const time = instantOf(row.timestamp);
        return time !== null && time <= now ? [time] : [];
      });
      const latest = times.reduce((max, time) => Math.max(max, time), -Infinity);
      emit('elf-history','blocked',{...valid(history), observedAt:null, recordCount:history.data.length,
        latestRecordAt:Number.isFinite(latest) ? new Date(latest).toISOString() : null,
        recordAgeMs:Number.isFinite(latest) ? now-latest : null,
        derivedFromImageCount:history.data.filter(row => row.derivedFromImage === true).length,
        invalidRecordedTimeCount:history.data.length-times.length,
        reason:'new_records_blocked_without_verified_observation_time'});
    }
  }
  return checks;
}
