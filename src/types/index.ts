export interface SchumannMode {
  frequency: number | null;
  amplitude: number | null;
  quality: string;
  lastUpdate?: string;
}

export interface CurrentResonanceData {
  stationId?: string;
  timestamp?: string | null;
  available?: boolean;
  availability?: 'available' | 'partial' | 'unavailable';
  availability_reason?: string;
  source_updated_at?: string | null;
  estimated_observation_at?: string | null;
  source_delay_hours?: number | null;
  timestamp_basis?: 'source_update_minus_delay' | 'demo' | null;
  is_historical?: boolean;
  fundamental: SchumannMode;
  mode2: SchumannMode;
  mode3: SchumannMode;
  mode4: SchumannMode;
  mode5: SchumannMode;
  quality?: string;
  source?: string;
  source_type?: string;
  collected_at?: string;
  processing_method?: string;
  processing_version?: string;
  is_primary_measurement?: boolean;
  is_demo?: boolean;
  derived_from_image?: boolean;
  relativeIntensity?: {
    value: number;
    scale: string;
    calibrated: boolean;
    source: string;
  };
}

export type { Station } from '../../shared/stations';

export interface EarthResonanceIndex {
  enabled: false;
  status: 'Em desenvolvimento';
  experimental: true;
}

export interface KpDataPoint {
  time_tag: string;
  kp: number;
}

export interface GeomagneticData {
  currentKp: number | null;
  recentKp: { time: string; kp: number }[];
  history: KpDataPoint[];
  status: string;
  dataSource: string;
  timestamp?: string;
}

export interface XRayDataPoint {
  time_tag: string;
  flux: number | null;
  energy: string;
  satellite: number;
  electronContaminated?: boolean;
}

export interface CurrentXRay {
  flux: number | null;
  energy: string;
  satellite: number;
  flareClass: string;
  timestamp: string;
}

export interface SolarData {
  solarFlux: number | null;
  /** Legacy name: count of regions with reported spots in the identified dated product, not individual spots. */
  sunspots: number | null;
  flares: string | null;
  status: string;
  dataSource: string;
  timestamp: string | null;
  solarWindSpeed?: number | null;
  protonDensity?: number | null;
  bz?: number | null;
  bt?: number | null;
  solarWindTimestamp?: string | null;
  imfTimestamp?: string | null;
  currentXRay?: CurrentXRay | null;
  xrayHistory?: XRayDataPoint[];
  solarFluxTimestamp?: string | null;
  productErrors?: Record<string, string>;
  /** Per-field times; legacy solarWindTimestamp follows speed and imfTimestamp follows Bz. */
  solarWindSpeedTimestamp?: string | null;
  protonDensityTimestamp?: string | null;
  bzTimestamp?: string | null;
  btTimestamp?: string | null;
  /** available means validated, not necessarily recent; no observation time is inferred from a query. */
  productMetadata?: Partial<Record<'f107' | 'regions' | 'flares' | 'windSpeed' | 'density' | 'bz' | 'bt' | 'xray', {
    state: 'available' | 'partial' | 'absent' | 'unavailable';
    sourceUrl: string;
    observedAt: string | null;
    observedDate: string | null;
    timePrecision: 'timestamp' | 'date' | 'unknown';
    kind?: 'observed_flux' | 'adjusted_flux' | 'spotted_regions' | 'catalogued_xra' | 'measurement';
    reportingSchedule?: string;
    timeKind?: 'begin' | 'maximum';
    issuedAt?: string | null;
    fallbackUsed?: boolean;
    primaryError?: string | null;
    error?: string | null;
    note?: string;
  }>>;

}

export interface HistoricalDataPoint {
  timestamp: string;
  f1: number | null;
  f2: number | null;
  f3: number | null;
  quality: string;
  sourceType: string;
  derivedFromImage: boolean;
  processor: string;
}
