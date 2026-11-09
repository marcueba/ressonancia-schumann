import type { ProviderResponse, SolarData, XRayDataPoint, CurrentXRay, KpDataPoint } from '../types';
import { apiCache } from '../services/cache';
import { parseObservationTime } from '../../src/utils/observationTime';
import { flareClass, isPositiveFlux, prepareXRayHistory, XRAY_BAND } from '../../src/utils/xrayData';

const urls = {
  f107: 'https://services.swpc.noaa.gov/json/f107_cm_flux.json',
  regions: 'https://services.swpc.noaa.gov/json/solar_regions.json',
  flares: 'https://services.swpc.noaa.gov/json/edited_events.json',
  wind: 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json',
  imf: 'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json',
  xray: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json',
};
const KP_URL = 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json';
type Row = Record<string, any>;
export interface GeoData {
  currentKp: number | null;
  recentKp: { time: string; kp: number }[];
  history: KpDataPoint[];
  status: string;
}

class NoaaError extends Error { constructor(public code: string) { super(code); } }

/** Known NOAA time_tag convention: no suffix means UTC, not the server's timezone. */
export function noaaTime(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(value)
    ? value.replace(' ', 'T') + 'Z' : value;
  return parseObservationTime(normalized)?.toISOString() ?? null;
}
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

export async function fetchNoaaRows(url: string, source: typeof fetch = fetch, timeoutMs = 10000): Promise<Row[]> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => { reject(new NoaaError('timeout')); controller.abort(); }, timeoutMs);
  });
  try {
    let response: Response;
    try { response = await Promise.race([source(url, { signal: controller.signal }), deadline]); }
    catch (error) { if (error instanceof NoaaError) throw error; throw new NoaaError('transport_error'); }
    if (!response.ok) { void response.body?.cancel().catch(() => {}); throw new NoaaError(`http_error:${response.status}`); }
    let raw: unknown;
    try { raw = await Promise.race([response.json(), deadline]); }
    catch (error) { if (error instanceof NoaaError) throw error; throw new NoaaError(error instanceof SyntaxError ? 'invalid_json' : 'transport_error'); }
    if (!Array.isArray(raw) || raw.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new NoaaError('invalid_schema');
    return raw;
  } finally { clearTimeout(timer!); controller.abort(); }
}

export function normalizeXrays(raw: Row[]): { history: XRayDataPoint[]; current: CurrentXRay | null } {
  if (raw.length && !raw.some(row => typeof row.energy === 'string' && 'flux' in row && 'time_tag' in row)) throw new NoaaError('invalid_schema');
  const records = raw.filter(row => row.energy === XRAY_BAND && noaaTime(row.time_tag) && finite(row.satellite))
    .map(row => ({ time_tag: noaaTime(row.time_tag)!, flux: isPositiveFlux(row.flux) ? row.flux : null,
      energy: row.energy, satellite: row.satellite,
      // NOAA reports corrected flux; this flag is context, not a generic bad-data flag.
      electronContaminated: row.electron_contaminaton === true || row.electron_contamination === true,
    }));
  const history = prepareXRayHistory(records);
  const latest = [...history].reverse().find(point => isPositiveFlux(point.flux));
  return { history, current: latest ? { flux: latest.flux!, energy: latest.energy, satellite: latest.satellite,
    flareClass: flareClass(latest.flux!), timestamp: latest.time_tag } : null };
}

export function normalizeKp(raw: Row[]): KpDataPoint[] {
  if (raw.length && !raw.some(row => 'Kp' in row && 'time_tag' in row)) throw new NoaaError('invalid_schema');
  return raw.flatMap(row => {
    const value = typeof row.Kp === 'string' && row.Kp.trim() !== '' ? Number(row.Kp) : row.Kp;
    const timestamp = noaaTime(row.time_tag);
    return timestamp && finite(value) && value >= 0 && value <= 9 ? [{ time_tag: timestamp, kp: value }] : [];
  }).sort((a, b) => Date.parse(a.time_tag) - Date.parse(b.time_tag));
}


type SolarMeta = NonNullable<NonNullable<SolarData['productMetadata']>[keyof NonNullable<SolarData['productMetadata']>]>;
const meta = (sourceUrl: string, state: SolarMeta['state'] = 'unavailable'): SolarMeta => ({
  sourceUrl, state, observedAt: null, observedDate: null, timePrecision: 'unknown', error: state === 'unavailable' ? 'no_valid_data' : null,
});
const strictNumber = (value: unknown): number | null => {
  if (finite(value)) return value;
  if (typeof value !== 'string' || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value.trim())) return null;
  const result = Number(value);
  return finite(result) ? result : null;
};
const calendarDate = (value: unknown): string | null => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  parseObservationTime(value + 'T00:00:00Z') ? value as string : null;

/** The functioning original product remains primary. Summary/noon is not silently substituted. */
export function normalizeF107(rows: Row[]) {
  const metadata = meta(urls.f107);
  metadata.note = 'Fluxo reportado NOAA em 2800 MHz, em sfu. O campo JSON não identifica aqui se o fluxo é observado ou ajustado.';
  if (rows.length && !rows.some(row => 'flux' in row && 'time_tag' in row)) metadata.error = 'invalid_schema';
  const valid = rows.flatMap(row => {
    const flux = strictNumber(row.flux), timestamp = noaaTime(row.time_tag);
    const frequency = row.frequency == null ? 2800 : strictNumber(row.frequency);
    return timestamp && flux !== null && flux > 0 && frequency === 2800
      ? [{ flux, timestamp, schedule: typeof row.reporting_schedule === 'string' ? row.reporting_schedule : undefined }] : [];
  }).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  const latest = valid.at(-1);
  if (!latest) return { value: null, timestamp: null, metadata };
  Object.assign(metadata, { state: 'available', observedAt: latest.timestamp, observedDate: latest.timestamp.slice(0, 10), timePrecision: 'timestamp', error: null,
    ...(latest.schedule ? { reportingSchedule: latest.schedule } : {}) });
  return { value: latest.flux, timestamp: latest.timestamp, metadata };
}

/** Count only uniquely identified regions with an explicitly positive spot count on the latest day. */
export function normalizeSolarRegions(rows: Row[]) {
  const metadata = meta(urls.regions);
  metadata.kind = 'spotted_regions';
  const dates = rows.map(row => calendarDate(row.observed_date)).filter((date): date is string => date !== null).sort();
  const date = dates.at(-1);
  if (!date) {
    if (rows.length && !rows.some(row => 'observed_date' in row)) metadata.error = 'invalid_schema';
    return { count: null, metadata, knownPositive: 0, unknown: 0 };
  }
  Object.assign(metadata, { observedDate: date, timePrecision: 'date' });
  const groups = new Map<string, Array<number | null>>();
  rows.filter(row => row.observed_date === date).forEach((row, index) => {
    const region = strictNumber(row.region), spots = strictNumber(row.number_spots);
    const id = region !== null && Number.isInteger(region) && region > 0 ? String(region) : `unknown:${index}`;
    const value = !id.startsWith('unknown:') && spots !== null && Number.isInteger(spots) && spots >= 0 ? spots : null;
    groups.set(id, [...(groups.get(id) ?? []), value]);
  });
  let knownPositive = 0, unknown = 0;
  for (const values of groups.values()) {
    // Without a revision timestamp there is no justified order for conflicting duplicates.
    if (values.some(value => value === null) || new Set(values).size !== 1) { unknown++; continue; }
    if (values[0]! > 0) knownPositive++;
  }
  const count = knownPositive > 0 || unknown === 0 ? knownPositive : null;
  Object.assign(metadata, { state: count === null ? 'unavailable' : unknown ? 'partial' : 'available', error: unknown ? 'incomplete_data' : null,
    note: unknown
      ? knownPositive > 0
        ? `Limite inferior confirmado: ${knownPositive} regiões com number_spots > 0; ${unknown} registros sem contagem válida ou com duplicatas conflitantes. Não equivale ao SRS completo nem ao índice de manchas.`
        : `${unknown} registros sem contagem válida ou com duplicatas conflitantes. Não é possível confirmar zero regiões. Não equivale ao SRS completo nem ao índice de manchas.`
      : 'Regiões únicas com number_spots > 0 no último dia informado pelo JSON. Não é contagem de manchas individuais, índice de manchas ou total do SRS.' });
  return { count, metadata, knownPositive, unknown };
}

/** Resolve each reported event first, then select and display its valid full BEGIN UTC. */
export function normalizeCataloguedFlares(rows: Row[]) {
  const metadata = meta(urls.flares);
  metadata.kind = 'catalogued_xra';
  if (rows.length && !rows.some(row => typeof row.type === 'string')) {
    metadata.error = 'invalid_schema';
    return { flareClass: null, metadata };
  }
  const events = rows.filter(row => row.type === 'XRA');
  if (!events.length) {
    Object.assign(metadata, { state: 'absent', error: null, note: 'Nenhum evento XRA foi retornado pelo produto consultado; isso não afirma ausência de atividade solar fora desse produto.' });
    return { flareClass: null, metadata };
  }
  const timed = events.flatMap(row => {
    const begin = noaaTime(row.begin_datetime);
    return begin ? [{ row, begin }] : [];
  });
  if (!timed.length || timed.length !== events.length) { metadata.error = 'incomplete_data'; metadata.note = 'Há XRA sem início UTC válido; não é possível afirmar qual é o último evento catalogado.'; return { flareClass: null, metadata }; }
  const groups = new Map<string, typeof timed>();
  for (const event of timed) {
    const id = strictNumber(event.row.bin);
    // JSON bin-to-text Event correspondence is inferred from the captured reports, not a documented revision rank.
    const key = id !== null && Number.isInteger(id) && id >= 0 ? `${event.begin.slice(0, 10)}:${id}` : event.begin;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  const resolved = [...groups.values()].map(group => {
    const preferred = group.filter(event => String(event.row.status_text ?? '').trim() === '+');
    const allBlank = group.every(event => String(event.row.status_text ?? '').trim() === '');
    const candidates = preferred.length ? preferred : allBlank ? group : [];
    const orderTime = (candidates.length ? candidates : group).map(event => event.begin).sort().at(-1)!;
    if (!candidates.length) return { orderTime, event: null, error: 'ambiguous_event', note: 'O grupo não possui relato + e contém alternativas sem precedência documentada.' };
    const qualified = candidates.some(event => String(event.row.begin_quality ?? '').trim() !== '');
    if (qualified) return { orderTime, event: null, error: 'incomplete_data', note: 'O início possui qualificador horário (por exemplo A/B/U); não é apresentado como um instante UTC exato nem substituído pelo máximo.' };
    const valid = candidates.flatMap(({ row, begin }) => {
      const klass = typeof row.particulars1 === 'string' ? row.particulars1.trim() : '';
      if (!/^[ABCMX](?:\d+(?:\.\d+)?)$/.test(klass) || !(Number(klass.slice(1)) > 0)) return [];
      const maxMissing = row.max_datetime == null || row.max_datetime === '';
      const maximum = maxMissing ? null : noaaTime(row.max_datetime);
      const endMissing = row.end_datetime == null || row.end_datetime === '';
      const end = endMissing ? null : noaaTime(row.end_datetime);
      // Structured JSON already includes the following date on midnight rollover. Never add another day.
      if ((!maxMissing && !maximum) || (!endMissing && !end) ||
        (maximum && Date.parse(maximum) < Date.parse(begin)) ||
        (end && Date.parse(end) < Date.parse(maximum ?? begin))) return [];
      return [{ klass, begin, maximum, end, observedAt: begin, timeKind: 'begin' as const }];
    });
    if (valid.length !== candidates.length) return { orderTime, event: null, error: 'incomplete_data', note: 'O relato selecionado não fornece classe e datas válidas; não é substituído por um evento mais antigo.' };
    const unique = new Map(valid.map(event => [JSON.stringify([event.klass, event.begin, event.maximum, event.end]), event]));
    if (unique.size !== 1) return { orderTime, event: null, error: 'ambiguous_event', note: 'Há relatos representantes conflitantes e nenhuma ordem de revisão documentada.' };
    const selected = [...unique.values()][0];
    return { orderTime: selected.begin, event: selected, error: null, note: null };
  });
  // Compare the representative BEGIN times, never a later alternative report's time.
  const latestBegin = resolved.map(item => item.orderTime).sort().at(-1)!;
  const latestGroups = resolved.filter(item => item.orderTime === latestBegin);
  if (latestGroups.length !== 1) { metadata.error = 'ambiguous_event'; return { flareClass: null, metadata }; }
  const selection = latestGroups[0];
  if (!selection.event) { metadata.error = selection.error; metadata.note = selection.note!; return { flareClass: null, metadata }; }
  const latest = selection.event;
  Object.assign(metadata, { state: 'available', observedAt: latest.observedAt, observedDate: latest.observedAt.slice(0, 10),
    timePrecision: 'timestamp', timeKind: latest.timeKind, error: null,
    note: 'Evento selecionado pelo início UTC válido; horário exibido corresponde ao início. A classe é a do pico XRA catalogado, não a última amostra GOES. Relato + é o representante quando presente. O agrupamento por dia/bin é inferido do produto; duplicatas conflitantes sem revisão documentada não são ordenadas pela posição.' });
  return { flareClass: latest.klass, metadata };
}

/** Preserve each usable field and its own source time; companion absence cannot discard it. */
export function latestSolarField(rows: Row[], field: 'proton_speed' | 'proton_density' | 'bz_gsm' | 'bt') {
  const records = rows.flatMap(row => {
    const value = row[field], timestamp = noaaTime(row.time_tag);
    const accepted = finite(value) && (field === 'proton_speed' ? value > 0 : field === 'bz_gsm' || value >= 0);
    return timestamp && accepted ? [{ value, timestamp }] : [];
  }).sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
  return records.at(-1) ?? null;
}

export class NoaaProvider {
  private getStatusFromKp(kp: number): string {
    if (kp <= 2.66) return 'Calma';
    if (kp <= 3.66) return 'Instável';
    if (kp <= 4.66) return 'Ativa';
    return 'Tempestade Geomagnética';
  }
  private getStatusFromFlux(flux: number): string {
    if (flux < 90) return 'Baixa';
    if (flux < 120) return 'Moderada';
    if (flux < 160) return 'Elevada';
    return 'Muito Elevada';
  }

  async getGeomagnetic(): Promise<ProviderResponse<GeoData>> {
    if (process.env.DATA_MODE !== 'live') return { success: true, data: { currentKp: 3, recentKp: [], history: [], status: 'Instável (DEMO)' }, timestamp: new Date().toISOString() };
    return apiCache.resolve('geomagnetic_noaa', async () => {
      try {
        const history = normalizeKp(await fetchNoaaRows(KP_URL)).slice(-24);
        if (!history.length) throw new NoaaError('no_valid_data');
        const latest = history[history.length - 1];
        const result = { success: true, data: { currentKp: latest.kp, recentKp: history.slice(-8).map(point => ({ time: point.time_tag, kp: point.kp })), history,
          status: this.getStatusFromKp(latest.kp) }, timestamp: latest.time_tag };
        apiCache.set('geomagnetic_noaa', result, 900);
        return result;
      } catch (error) {
        const code = error instanceof NoaaError ? error.code : 'parser_error';
        return { success: false, errorCode: code, error: `Falha na consulta geomagnética NOAA (${code}).`, timestamp: null };
      }
    });
  }

  async getSolar(): Promise<ProviderResponse<SolarData>> {
    if (process.env.DATA_MODE !== 'live') return { success: true, data: { solarFlux: 145, sunspots: 78, flares: 'M1.2 (DEMO)', status: 'Ativa (DEMO)', solarWindSpeed: 420.5, protonDensity: 5.2, bz: -2.3, bt: 6.1,
      currentXRay: { flux: 3.2e-6, energy: XRAY_BAND, satellite: 16, flareClass: 'C3.2', timestamp: new Date().toISOString() }, xrayHistory: [] }, timestamp: new Date().toISOString() };
    return apiCache.resolve('solar_noaa', async () => {
      const productErrors: Record<string, string> = {};
      const products = Object.fromEntries(await Promise.all(Object.entries(urls).map(async ([name, url]) => {
        try {
          const rows = await fetchNoaaRows(url);
          const fields: Record<string, string[]> = { f107: ['time_tag', 'flux'], regions: ['observed_date'], flares: ['type'], wind: ['time_tag', 'proton_speed', 'proton_density'], imf: ['time_tag', 'bz_gsm', 'bt'], xray: ['time_tag', 'energy', 'flux'] };
          if (rows.length && !rows.some(row => name === 'wind' ? 'time_tag' in row && ('proton_speed' in row || 'proton_density' in row)
            : name === 'imf' ? 'time_tag' in row && ('bz_gsm' in row || 'bt' in row)
            : fields[name].every(field => field in row))) throw new NoaaError('invalid_schema');
          return [name, rows];
        }
        catch (error) { productErrors[name] = error instanceof NoaaError ? error.code : 'parser_error'; return [name, []]; }
      }))) as Record<keyof typeof urls, Row[]>;
      const times: string[] = [];
      const f107 = normalizeF107(products.f107);
      const regions = normalizeSolarRegions(products.regions);
      const catalog = normalizeCataloguedFlares(products.flares);
      const productMetadata: NonNullable<SolarData['productMetadata']> = { f107: f107.metadata, regions: regions.metadata, flares: catalog.metadata };
      for (const name of ['f107', 'regions', 'flares'] as const) {
        const item = productMetadata[name]!;
        if (productErrors[name]) Object.assign(item, { state: 'unavailable', error: productErrors[name] });
        else if (item.error) productErrors[name] = item.error;
        if (item.observedAt) times.push(item.observedAt);
      }
      const speed = latestSolarField(products.wind, 'proton_speed');
      const density = latestSolarField(products.wind, 'proton_density');
      const bz = latestSolarField(products.imf, 'bz_gsm');
      const bt = latestSolarField(products.imf, 'bt');
      for (const [name, value, group] of [['windSpeed', speed, 'wind'], ['density', density, 'wind'], ['bz', bz, 'imf'], ['bt', bt, 'imf']] as const) {
        const item = meta(urls[group], value ? 'available' : 'unavailable');
        item.kind = 'measurement';
        if (value) { item.observedAt = value.timestamp; item.observedDate = value.timestamp.slice(0, 10); item.timePrecision = 'timestamp'; times.push(value.timestamp); }
        else if (productErrors[group]) item.error = productErrors[group];
        productMetadata[name] = item;
      }
      if (!speed && !density && !productErrors.wind) productErrors.wind = 'no_valid_data';
      if (!bz && !bt && !productErrors.imf) productErrors.imf = 'no_valid_data';
      let currentXRay: CurrentXRay | null = null, xrayHistory: XRayDataPoint[] = [];
      try {
        ({ current: currentXRay, history: xrayHistory } = normalizeXrays(products.xray));
        if (currentXRay) times.push(currentXRay.timestamp);
        else if (!productErrors.xray) productErrors.xray = 'no_valid_data';
      } catch (error) { productErrors.xray = error instanceof NoaaError ? error.code : 'parser_error'; }
      productMetadata.xray = meta(urls.xray, currentXRay ? 'available' : 'unavailable');
      if (currentXRay) Object.assign(productMetadata.xray, { observedAt: currentXRay.timestamp, observedDate: currentXRay.timestamp.slice(0, 10), timePrecision: 'timestamp', kind: 'measurement' });
      else productMetadata.xray.error = productErrors.xray;
      const solarFlux = f107.value, solarFluxTimestamp = f107.timestamp;
      const solarData: SolarData = { solarFlux, solarFluxTimestamp, sunspots: regions.count, flares: catalog.flareClass,
        status: solarFlux === null ? 'F10.7 indisponível' : this.getStatusFromFlux(solarFlux),
        solarWindSpeed: speed?.value ?? null, protonDensity: density?.value ?? null, bz: bz?.value ?? null, bt: bt?.value ?? null,
        solarWindTimestamp: speed?.timestamp ?? null, imfTimestamp: bz?.timestamp ?? null,
        solarWindSpeedTimestamp: speed?.timestamp ?? null, protonDensityTimestamp: density?.timestamp ?? null,
        bzTimestamp: bz?.timestamp ?? null, btTimestamp: bt?.timestamp ?? null,
        currentXRay, xrayHistory, productErrors, productMetadata };
      if (solarFlux === null && regions.count === null && catalog.flareClass === null && productMetadata.flares?.state !== 'absent' && !speed && !density && !bz && !bt && !currentXRay) {
        return { success: false, data: solarData, errorCode: 'noaa_products_unavailable', error: 'Não foi possível obter medições solares válidas da NOAA.', timestamp: null };
      }
      const result = { success: true, data: solarData, timestamp: times.sort().at(-1) ?? null,
        ...(Object.values(productMetadata).some(item => item.state === 'unavailable' || item.state === 'partial') ? { message: 'Disponibilidade parcial dos produtos NOAA.' } : {}) };
      apiCache.set('solar_noaa', result, 300);
      return result;
    });
  }
}
export const noaaProvider = new NoaaProvider();
