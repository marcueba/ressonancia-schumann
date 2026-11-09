// Types for the backend implementation
export interface NormalizedSchumannData {
  stationId: string;
  timestamp: string | null; // Measurement time only; never document/transport time.
  available?: boolean;
  availability?: 'available' | 'partial' | 'unavailable';
  source_updated_at?: string | null;
  estimated_observation_at?: string | null;
  source_delay_hours?: number | null;
  timestamp_basis?: 'source_update_minus_delay' | 'demo' | null;
  is_historical?: boolean;
  availability_reason?: string;
  fundamental: { frequency: number | null; amplitude: number | null; quality: string };
  mode2: { frequency: number | null; amplitude: number | null; quality: string };
  mode3: { frequency: number | null; amplitude: number | null; quality: string };
  mode4: { frequency: number | null; amplitude: number | null; quality: string };
  mode5: { frequency: number | null; amplitude: number | null; quality: string };
  quality: string;
  source: string;
  source_url?: string;
  source_type?: string;
  collected_at?: string;
  processing_method?: string;
  processing_version?: string;
  derived_from_image?: boolean;
  is_primary_measurement?: boolean;
  is_demo?: boolean;
  relativeIntensity?: {
    value: number;
    scale: string;
    calibrated: boolean;
    source: string;
  };
}

export interface ProviderResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  cached?: boolean;
  errorCode?: string;
  timestamp: string | null;
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

export interface NoaaRtswWind {
  time_tag: string;
  proton_speed: number | null;
  proton_density: number | null;
}

export interface NoaaRtswMag {
  time_tag: string;
  bz_gsm: number | null;
  bt: number | null;
}

export interface NoaaGoesXray {
  time_tag: string;
  satellite: number;
  flux: number | null;
  energy: string;
}

export interface SolarData {
  solarFlux: number | null;
  /** Legacy name: count of regions with reported spots in the identified dated product, not individual spots. */
  sunspots: number | null;
  flares: string | null;

  status: string;
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

export interface KpDataPoint {
  time_tag: string;
  kp: number;
}
