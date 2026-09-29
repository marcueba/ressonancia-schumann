export interface SchumannMode {
  frequency: number;
  amplitude: number;
  quality: 'Alta' | 'Média' | 'Baixa';
  lastUpdate: string;
}

export interface CurrentResonanceData {
  stationId?: string;
  timestamp?: string;
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
  score: number;
  status: string;
}

export interface GeomagneticData {
  currentKp: number;
  recentKp: { time: string; kp: number }[];
  status: string;
  dataSource: string;
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
