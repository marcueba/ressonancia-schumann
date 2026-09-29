// Types for the backend implementation
export interface NormalizedSchumannData {
  stationId: string;
  timestamp: string; // ISO string
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
}

export interface ProviderResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  cached?: boolean;
  timestamp: string;
}

export interface XRayDataPoint {
  time_tag: string;
  flux: number;
  energy: string;
  satellite: number;
}

export interface CurrentXRay {
  flux: number;
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
  flux: number;
  energy: string;
}

export interface SolarData {
  solarFlux: number | null;
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
}
