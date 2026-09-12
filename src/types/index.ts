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
  recentKp: number[];
  status: string;
  dataSource: string;
}

export interface SolarData {
  solarFlux: number;
  sunspots: number;
  flares: string;
  status: string;
  dataSource: string;
}

export interface HistoricalDataPoint {
  time: string;
  frequency: number;
  amplitude: number;
}
