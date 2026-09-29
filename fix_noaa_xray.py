import re

with open('server/providers/NoaaProvider.ts', 'r') as f:
    text = f.read()

# Make sure imports are correct
import_search = "import { ProviderResponse } from '../types';"
import_replace = "import { ProviderResponse, NoaaRtswWind, NoaaRtswMag, NoaaGoesXray, XRayDataPoint, CurrentXRay } from '../types';"
text = text.replace(import_search, import_replace)

# Replace the SolarData local interface as it shouldn't duplicate or we just update it
solar_data_search = """export interface SolarData {
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
}"""
text = text.replace(solar_data_search, "")

# Find the getSolar method
# Update DEMO
demo_search = """data: { solarFlux: 145, sunspots: 78, flares: "M1.2 (Recente)", status: 'Ativa (DEMO)', solarWindSpeed: 420.5, protonDensity: 5.2, bz: -2.3, bt: 6.1 },"""
demo_replace = """data: { solarFlux: 145, sunspots: 78, flares: "M1.2 (Recente)", status: 'Ativa (DEMO)', solarWindSpeed: 420.5, protonDensity: 5.2, bz: -2.3, bt: 6.1, currentXRay: { flux: 3.2e-6, energy: '0.1-0.8nm', satellite: 16, flareClass: 'C3.2', timestamp: new Date().toISOString() }, xrayHistory: [] },"""
text = text.replace(demo_search, demo_replace)

# Helper function to classify X-ray
class_helper = """
  private getFlareClass(flux: number): string {
    if (flux < 1e-7) return `A${(flux * 1e8).toFixed(1)}`;
    if (flux < 1e-6) return `B${(flux * 1e7).toFixed(1)}`;
    if (flux < 1e-5) return `C${(flux * 1e6).toFixed(1)}`;
    if (flux < 1e-4) return `M${(flux * 1e5).toFixed(1)}`;
    return `X${(flux * 1e4).toFixed(1)}`;
  }
"""
text = text.replace("async getGeomagnetic()", class_helper + "\n  async getGeomagnetic()")

# Fetch X-ray logic
fetch_xray = """
        // Fetch GOES X-Ray
        let currentXRay = null;
        let xrayHistory: XRayDataPoint[] = [];
        try {
          const resXray = await fetch('https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json');
          if (resXray.ok) {
            const dataXray: NoaaGoesXray[] = await resXray.json();
            // Filter for 0.1-0.8nm band (typically used for flare classification)
            const primaryBand = dataXray.filter(d => d.energy === '0.1-0.8nm');
            
            xrayHistory = primaryBand.map(d => ({
              time_tag: d.time_tag,
              flux: d.flux,
              energy: d.energy,
              satellite: d.satellite
            }));

            if (primaryBand.length > 0) {
              const latest = primaryBand[primaryBand.length - 1];
              currentXRay = {
                flux: latest.flux,
                energy: latest.energy,
                satellite: latest.satellite,
                flareClass: this.getFlareClass(latest.flux),
                timestamp: latest.time_tag
              };
            }
          }
        } catch(e) {
          console.warn("NOAA xray fetch failed", e);
        }

        if (flux === null || isNaN(flux)) {
"""
text = text.replace("if (flux === null || isNaN(flux)) {", fetch_xray)

# Replace 'any[]' in RTSW Wind
text = text.replace("const dataWind: any[] = await resWind.json();", "const dataWind: NoaaRtswWind[] = await resWind.json();")

# Replace 'any[]' in RTSW Mag
text = text.replace("const dataMag: any[] = await resMag.json();", "const dataMag: NoaaRtswMag[] = await resMag.json();")

# Add to solarData
solar_data_assignment = """const solarData = {
          solarFlux: flux,
          sunspots: sunspots,
          flares: flares,
          status: this.getStatusFromFlux(flux),
          solarWindSpeed,
          protonDensity,
          bz,
          bt,
          solarWindTimestamp,
          imfTimestamp,
          currentXRay,
          xrayHistory
        };"""
text = re.sub(r'const solarData[^;]+;', solar_data_assignment, text)

# Change cache TTL from 3600 to 300
text = text.replace("apiCache.set(cacheKey, result, 3600);", "apiCache.set(cacheKey, result, 300);")

with open('server/providers/NoaaProvider.ts', 'w') as f:
    f.write(text)

print("NoaaProvider.ts updated.")
