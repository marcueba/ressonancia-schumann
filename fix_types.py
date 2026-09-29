with open('src/types/index.ts', 'r') as f:
    text = f.read()

solar_data_search = """export interface SolarData {
  solarFlux: number;
  sunspots: number;
  flares: string;
  status: string;
  dataSource: string;
  timestamp: string;
}"""

solar_data_replace = """export interface XRayDataPoint {
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
}"""

text = text.replace(solar_data_search, solar_data_replace)

with open('src/types/index.ts', 'w') as f:
    f.write(text)

print("src/types/index.ts updated.")
