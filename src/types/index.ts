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

export interface Station {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  status: 'online' | 'atraso' | 'offline';
  lastUpdate: string;
  quality: 'Alta' | 'Média' | 'Baixa';
  dataSource: string;
  license: string;
  apiEndpoint: string;
}

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
