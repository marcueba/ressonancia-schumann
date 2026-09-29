import re

with open('server/providers/NoaaProvider.ts', 'r') as f:
    text = f.read()

# Add KpDataPoint and NoaaKp types
import_search = "import { ProviderResponse, SolarData, NoaaRtswWind, NoaaRtswMag, NoaaGoesXray, XRayDataPoint, CurrentXRay } from '../types';"
import_replace = "import { ProviderResponse, SolarData, NoaaRtswWind, NoaaRtswMag, NoaaGoesXray, XRayDataPoint, CurrentXRay, KpDataPoint } from '../types';\n\nexport interface NoaaKp {\n  time_tag: string;\n  Kp: string;\n  a_running: number;\n  station_count: number;\n}"
text = text.replace(import_search, import_replace)

# Replace GeoData interface
geo_interface_search = """export interface GeoData {
  currentKp: number;
  recentKp: { time: string; kp: number }[];
  status: string;
}"""

geo_interface_replace = """export interface GeoData {
  currentKp: number | null;
  recentKp: { time: string; kp: number }[];
  history: KpDataPoint[];
  status: string;
}"""
text = text.replace(geo_interface_search, geo_interface_replace)

# Replace DEMO in getGeomagnetic
demo_search = """data: { currentKp: 3, recentKp: [
          { time: new Date(Date.now() - 21*3600000).toISOString(), kp: 2 },
          { time: new Date(Date.now() - 18*3600000).toISOString(), kp: 1 },
          { time: new Date(Date.now() - 15*3600000).toISOString(), kp: 2 },
          { time: new Date(Date.now() - 12*3600000).toISOString(), kp: 3 },
          { time: new Date(Date.now() - 9*3600000).toISOString(), kp: 3 },
          { time: new Date(Date.now() - 6*3600000).toISOString(), kp: 2 },
          { time: new Date(Date.now() - 3*3600000).toISOString(), kp: 4 },
          { time: new Date().toISOString(), kp: 3 }
        ], status: 'Instável (DEMO)' },"""
demo_replace = """data: { currentKp: 3, recentKp: [], history: [], status: 'Instável (DEMO)' },"""
text = text.replace(demo_search, demo_replace)

# Replace getGeomagnetic logic
geo_logic_search = """const data: any[] = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) throw new Error('NOAA returned empty dataset');

        const recentItems = data.slice(-8);
        const recentKp = recentItems.map(item => ({
          time: item.time_tag,
          kp: parseFloat(item.Kp)
        }));
        const currentKpObj = data[data.length - 1];
        const currentKp = currentKpObj && currentKpObj.Kp !== undefined ? parseFloat(currentKpObj.Kp) : null;

        if (currentKp === null || isNaN(currentKp)) {
           throw new Error('Valor Kp indisponível na fonte');
        }

        const geoData: GeoData = {
          currentKp,
          recentKp: recentKp.filter(k => !isNaN(k.kp)),
          status: this.getStatusFromKp(currentKp)
        };

        const result = { success: true, data: geoData, timestamp: currentKpObj.time_tag || new Date().toISOString() };
        apiCache.set(cacheKey, result, 3600);"""

geo_logic_replace = """const data: NoaaKp[] = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) throw new Error('NOAA returned empty dataset');

        // Extract the last 72 hours (since it's 3-hour data, that's 24 items)
        const recentItems = data.slice(-24);
        
        const history: KpDataPoint[] = recentItems.map(item => ({
          time_tag: item.time_tag,
          kp: parseFloat(item.Kp)
        })).filter(k => !isNaN(k.kp));

        const recentKp = history.slice(-8).map(h => ({ time: h.time_tag, kp: h.kp }));

        const currentKpObj = data[data.length - 1];
        const currentKp = currentKpObj && currentKpObj.Kp !== undefined ? parseFloat(currentKpObj.Kp) : null;

        const geoData: GeoData = {
          currentKp,
          recentKp,
          history,
          status: currentKp !== null ? this.getStatusFromKp(currentKp) : 'Indisponível'
        };

        const result = { success: true, data: geoData, timestamp: currentKpObj?.time_tag || new Date().toISOString() };
        apiCache.set(cacheKey, result, 900); // 15 minutos cache para janela de 3h"""
text = text.replace(geo_logic_search, geo_logic_replace)

# Now inject the X-ray gap logic in getSolar
xray_gap_logic = """
            const rawHistory = primaryBand.map(d => ({
              time_tag: d.time_tag,
              flux: d.flux,
              energy: d.energy,
              satellite: d.satellite
            }));
            
            // Insert nulls for gaps > 90 seconds
            xrayHistory = [];
            for (let i = 0; i < rawHistory.length; i++) {
              xrayHistory.push(rawHistory[i]);
              if (i < rawHistory.length - 1) {
                const t1 = new Date(rawHistory[i].time_tag).getTime();
                const t2 = new Date(rawHistory[i+1].time_tag).getTime();
                if (t2 - t1 > 90000) {
                  // Add a null point slightly after t1 to break the line visually
                  xrayHistory.push({
                    time_tag: new Date(t1 + 1000).toISOString(),
                    flux: null as any,
                    energy: rawHistory[i].energy,
                    satellite: rawHistory[i].satellite
                  });
                }
              }
            }
"""
text = text.replace("""xrayHistory = primaryBand.map(d => ({
              time_tag: d.time_tag,
              flux: d.flux,
              energy: d.energy,
              satellite: d.satellite
            }));""", xray_gap_logic)

# Re-insert the type so TS isn't angry about `null as any`
text = text.replace("flux: number;", "flux: number | null;")

with open('server/providers/NoaaProvider.ts', 'w') as f:
    f.write(text)

with open('server/types.ts', 'r') as f:
    text_types = f.read()
    text_types = text_types.replace("flux: number;", "flux: number | null;")
with open('server/types.ts', 'w') as f:
    f.write(text_types)

with open('src/types/index.ts', 'r') as f:
    text_src_types = f.read()
    text_src_types = text_src_types.replace("flux: number;", "flux: number | null;")
with open('src/types/index.ts', 'w') as f:
    f.write(text_src_types)

print("NoaaProvider updated.")
