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
          if (rows.length && !rows.some(row => fields[name].every(field => field in row))) throw new NoaaError('invalid_schema');
          return [name, rows];
        }
        catch (error) { productErrors[name] = error instanceof NoaaError ? error.code : 'parser_error'; return [name, []]; }
      }))) as Record<keyof typeof urls, Row[]>;
      const times: string[] = [];
      const timed = (rows: Row[]): Row[] => rows.flatMap(row => {
        const timestamp = noaaTime(row.time_tag);
        return timestamp ? [{ ...row, time_tag: timestamp }] : [];
      }).sort((a, b) => Date.parse(a.time_tag) - Date.parse(b.time_tag));
      const latestFlux = timed(products.f107).filter(row => isPositiveFlux(row.flux)).at(-1);
      const solarFlux = latestFlux?.flux ?? null;
      const solarFluxTimestamp = latestFlux?.time_tag ?? null;
      if (solarFluxTimestamp) times.push(solarFluxTimestamp);
      else if (!productErrors.f107) productErrors.f107 = 'no_valid_data';
      let sunspots: number | null = null;
      const regionDates = products.regions.filter(row => /^\d{4}-\d{2}-\d{2}$/.test(row.observed_date)).map(row => row.observed_date).sort();
      if (regionDates.length) sunspots = products.regions.filter(row => row.observed_date === regionDates.at(-1)).length;
      else if (!productErrors.regions) productErrors.regions = 'no_valid_data';
      let flares: string | null = null;
      const events = products.flares.filter(row => row.type === 'XRA');
      if (events.length) flares = typeof events.at(-1)?.particulars1 === 'string' ? events.at(-1)!.particulars1 : null;
      else if (!productErrors.flares) flares = 'Nenhum flare XRA retornado neste produto';
      else if (!productErrors.flares) productErrors.flares = 'no_valid_data';
      const latestWind = timed(products.wind).filter(row => finite(row.proton_speed) && row.proton_speed > 0 && finite(row.proton_density) && row.proton_density >= 0).at(-1);
      const latestMag = timed(products.imf).filter(row => finite(row.bz_gsm) && finite(row.bt) && row.bt >= 0).at(-1);
      const solarWindTimestamp = latestWind?.time_tag ?? null, imfTimestamp = latestMag?.time_tag ?? null;
      if (solarWindTimestamp) times.push(solarWindTimestamp); else if (!productErrors.wind) productErrors.wind = 'no_valid_data';
      if (imfTimestamp) times.push(imfTimestamp); else if (!productErrors.imf) productErrors.imf = 'no_valid_data';
      let currentXRay: CurrentXRay | null = null, xrayHistory: XRayDataPoint[] = [];
      try {
        ({ current: currentXRay, history: xrayHistory } = normalizeXrays(products.xray));
        if (currentXRay) times.push(currentXRay.timestamp);
        else if (!productErrors.xray) productErrors.xray = 'no_valid_data';
      } catch (error) { productErrors.xray = error instanceof NoaaError ? error.code : 'parser_error'; }
      const solarData: SolarData = { solarFlux, solarFluxTimestamp, sunspots, flares, status: solarFlux === null ? 'F10.7 indisponível' : this.getStatusFromFlux(solarFlux),
        solarWindSpeed: latestWind?.proton_speed ?? null, protonDensity: latestWind?.proton_density ?? null,
        bz: latestMag?.bz_gsm ?? null, bt: latestMag?.bt ?? null, solarWindTimestamp, imfTimestamp, currentXRay, xrayHistory, productErrors };
      if (solarFlux === null && sunspots === null && !events.some(row => typeof row.particulars1 === 'string') && !latestWind && !latestMag && !currentXRay) {
        return { success: false, data: solarData, errorCode: 'noaa_products_unavailable', error: 'Não foi possível obter medições solares válidas da NOAA.', timestamp: null };
      }
      const result = { success: true, data: solarData, timestamp: times.sort().at(-1) ?? null,
        ...(Object.keys(productErrors).length ? { message: 'Disponibilidade parcial dos produtos NOAA.' } : {}) };
      apiCache.set('solar_noaa', result, 300);
      return result;
    });
  }
}
export const noaaProvider = new NoaaProvider();
