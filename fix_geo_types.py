import re

with open('server/types.ts', 'r') as f:
    text = f.read()

# Add KpDataPoint interface
kp_interface = """
export interface KpDataPoint {
  time_tag: string;
  kp: number;
}
"""
text = text + kp_interface

with open('server/types.ts', 'w') as f:
    f.write(text)

with open('src/types/index.ts', 'r') as f:
    src_text = f.read()

# Update GeomagneticData in src
geo_search = """export interface GeomagneticData {
  currentKp: number;
  recentKp: { time: string; kp: number }[];
  status: string;
  dataSource: string;
}"""

geo_replace = """export interface KpDataPoint {
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
}"""

src_text = src_text.replace(geo_search, geo_replace)

with open('src/types/index.ts', 'w') as f:
    f.write(src_text)

print("types updated.")
