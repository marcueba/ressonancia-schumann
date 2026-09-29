import re

with open('server/types.ts', 'r') as f:
    text = f.read()

# Add X-Ray data interfaces
xray_interfaces = """
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
"""
text = text + xray_interfaces

# Add to SolarData
solar_data_search = """export interface SolarData {
  solarFlux: number | null;
  sunspots: number | null;
  flares: string | null;
  timestamp: string | null;
  dataSource: string;
  status: string;
  solarWindSpeed?: number | null;
  protonDensity?: number | null;
  bz?: number | null;
  bt?: number | null;
  solarWindTimestamp?: string | null;
  imfTimestamp?: string | null;
}"""

solar_data_replace = """export interface SolarData {
  solarFlux: number | null;
  sunspots: number | null;
  flares: string | null;
  timestamp: string | null;
  dataSource: string;
  status: string;
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

with open('server/types.ts', 'w') as f:
    f.write(text)

print("types.ts updated.")
