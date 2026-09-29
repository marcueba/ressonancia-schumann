import { ProviderResponse, SolarData, NoaaRtswWind, NoaaRtswMag, NoaaGoesXray, XRayDataPoint, CurrentXRay, KpDataPoint } from '../types';

export interface NoaaKp {
  time_tag: string;
  Kp: string;
  a_running: number;
  station_count: number;
}
import { apiCache } from '../services/cache';

export interface GeoData {
  currentKp: number | null;
  recentKp: { time: string; kp: number }[];
  history: KpDataPoint[];
  status: string;
}



export class NoaaProvider {
  private getStatusFromKp(kp: number): string {
    if (kp <= 2.66) return 'Calma';
    if (kp <= 3.66) return 'Instável';
    if (kp <= 4.66) return 'Ativa';
    return 'Tempestade Geomagnética';
  }

  private getStatusFromFlux(flux: number): string {
    if (flux < 90) return 'Baixa';
    if (flux < 120) return 'Moderada';
    if (flux < 160) return 'Elevada';
    return 'Muito Elevada';
  }

  
  private getFlareClass(flux: number): string {
    if (flux < 1e-7) return `A${(flux * 1e8).toFixed(1)}`;
    if (flux < 1e-6) return `B${(flux * 1e7).toFixed(1)}`;
    if (flux < 1e-5) return `C${(flux * 1e6).toFixed(1)}`;
    if (flux < 1e-4) return `M${(flux * 1e5).toFixed(1)}`;
    return `X${(flux * 1e4).toFixed(1)}`;
  }

  async getGeomagnetic(): Promise<ProviderResponse<GeoData>> {
    const isLive = process.env.DATA_MODE === 'live';
    const cacheKey = 'geomagnetic_noaa';

    if (!isLive) {
      return {
        success: true,
        data: { currentKp: 3, recentKp: [], history: [], status: 'Instável (DEMO)' },
        timestamp: new Date().toISOString()
      };
    }

    return apiCache.resolve(cacheKey, async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        let response;
        try {
          response = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', { signal: controller.signal });
        } finally {
          clearTimeout(timeout);
        }
        if (!response.ok) throw new Error('NOAA API failure');
        
        const data: NoaaKp[] = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) throw new Error('NOAA returned empty dataset');

        // Extract the last 72 hours (since it's 3-hour data, that's 24 items)
        const recentItems = data.slice(-24);
        
        const history = recentItems.map(item => ({
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
        apiCache.set(cacheKey, result, 900); // 15 minutos cache para janela de 3h
        return result;

      } catch (error: any) {
        return {
          success: false,
          available: false,
          error: 'Dados geomagnéticos NOAA temporariamente indisponíveis.',
          timestamp: new Date().toISOString()
        };
      }
    });
  }

  async getSolar(): Promise<ProviderResponse<SolarData>> {
    const isLive = process.env.DATA_MODE === 'live';
    const cacheKey = 'solar_noaa';

    if (!isLive) {
      return {
        success: true,
        data: { solarFlux: 145, sunspots: 78, flares: "M1.2 (Recente)", status: 'Ativa (DEMO)', solarWindSpeed: 420.5, protonDensity: 5.2, bz: -2.3, bt: 6.1, currentXRay: { flux: 3.2e-6, energy: '0.1-0.8nm', satellite: 16, flareClass: 'C3.2', timestamp: new Date().toISOString() }, xrayHistory: [] },
        timestamp: new Date().toISOString()
      };
    }

    return apiCache.resolve(cacheKey, async () => {
      try {
        // Fetch Flux
        const resFlux = await fetch('https://services.swpc.noaa.gov/json/f107_cm_flux.json');
        if (!resFlux.ok) throw new Error('NOAA API failure for solar flux');
        const dataFlux: any[] = await resFlux.json();
        const validFlux = dataFlux.filter(item => item.time_tag && item.flux !== undefined && item.flux !== null);
        validFlux.sort((a, b) => new Date(b.time_tag).getTime() - new Date(a.time_tag).getTime());
        const flux = validFlux.length > 0 ? parseFloat(validFlux[0].flux) : null;

        // Fetch Regions (using as proxy for active sunspot regions)
        let sunspots = null;
        try {
          const resRegions = await fetch('https://services.swpc.noaa.gov/json/solar_regions.json');
          if (resRegions.ok) {
            const dataRegions: any[] = await resRegions.json();
            // Count regions from the latest observed_date
            if (dataRegions.length > 0) {
              const latestDate = dataRegions[dataRegions.length - 1].observed_date;
              const currentRegions = dataRegions.filter(r => r.observed_date === latestDate);
              sunspots = currentRegions.length; // We use region count
            }
          }
        } catch(e) {
          console.warn("NOAA solar_regions fetch failed", e);
        }

        // Fetch Flares
        let flares = null;
        try {
          const resFlares = await fetch('https://services.swpc.noaa.gov/json/edited_events.json');
          if (resFlares.ok) {
            const dataFlares: any[] = await resFlares.json();
            const xraEvents = dataFlares.filter(ev => ev.type === 'XRA');
            if (xraEvents.length > 0) {
              const latestEvent = xraEvents[xraEvents.length - 1];
              flares = latestEvent.particulars1 || "Recente";
            } else {
              flares = "Nenhum flare XRA recente no período monitorado";
            }
          }
        } catch(e) {
          console.warn("NOAA flares fetch failed", e);
        }

        
        // Fetch Solar Wind (Plasma)
        let solarWindSpeed = null;
        let protonDensity = null;
        let solarWindTimestamp = null;
        try {
          const resWind = await fetch('https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json');
          if (resWind.ok) {
            const dataWind: NoaaRtswWind[] = await resWind.json();
            // Find the most recent active/valid entry
            for (let i = dataWind.length - 1; i >= 0; i--) {
              const item = dataWind[i];
              if (item.proton_speed != null && item.proton_density != null) {
                solarWindSpeed = item.proton_speed;
                protonDensity = item.proton_density;
                solarWindTimestamp = item.time_tag;
                break;
              }
            }
          }
        } catch(e) {
          console.warn("NOAA solar wind fetch failed", e);
        }

        // Fetch IMF (Mag)
        let bz = null;
        let bt = null;
        let imfTimestamp = null;
        try {
          const resMag = await fetch('https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json');
          if (resMag.ok) {
            const dataMag: NoaaRtswMag[] = await resMag.json();
            for (let i = dataMag.length - 1; i >= 0; i--) {
              const item = dataMag[i];
              if (item.bz_gsm != null && item.bt != null) {
                bz = item.bz_gsm;
                bt = item.bt;
                imfTimestamp = item.time_tag;
                break;
              }
            }
          }
        } catch(e) {
          console.warn("NOAA mag fetch failed", e);
        }

        
        // Fetch GOES X-Ray
        let currentXRay = null;
        let xrayHistory: XRayDataPoint[] = [];
        try {
          const resXray = await fetch('https://services.swpc.noaa.gov/json/goes/primary/xrays-1-day.json');
          if (resXray.ok) {
            const dataXray: NoaaGoesXray[] = await resXray.json();
            // Filter for 0.1-0.8nm band (typically used for flare classification)
            const primaryBand = dataXray.filter(d => d.energy === '0.1-0.8nm');
            
            
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


           throw new Error('Fluxo solar F10.7 inválido ou indisponível');
        }

        const solarData = {
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
        };

        const result = { 
          success: true, 
          data: solarData, 
          timestamp: validFlux[0].time_tag || new Date().toISOString()
        };
        
        apiCache.set(cacheKey, result, 300);
        return result;
      } catch (error: any) {
        return {
          success: false,
          available: false,
          error: 'Dados solares NOAA temporariamente indisponíveis.',
          timestamp: new Date().toISOString()
        };
      }
    });
  }
}

export const noaaProvider = new NoaaProvider();
