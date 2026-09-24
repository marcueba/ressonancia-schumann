import { ProviderResponse } from '../types';
import { apiCache } from '../services/cache';

export interface GeoData {
  currentKp: number;
  recentKp: { time: string; kp: number }[];
  status: string;
}

export interface SolarData {
  solarFlux: number | null;
  sunspots: number | null;
  flares: string | null;
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

  async getGeomagnetic(): Promise<ProviderResponse<GeoData>> {
    const isLive = process.env.DATA_MODE === 'live';
    const cacheKey = 'geomagnetic_noaa';

    if (!isLive) {
      return {
        success: true,
        data: { currentKp: 3, recentKp: [
          { time: new Date(Date.now() - 21*3600000).toISOString(), kp: 2 },
          { time: new Date(Date.now() - 18*3600000).toISOString(), kp: 1 },
          { time: new Date(Date.now() - 15*3600000).toISOString(), kp: 2 },
          { time: new Date(Date.now() - 12*3600000).toISOString(), kp: 3 },
          { time: new Date(Date.now() - 9*3600000).toISOString(), kp: 3 },
          { time: new Date(Date.now() - 6*3600000).toISOString(), kp: 2 },
          { time: new Date(Date.now() - 3*3600000).toISOString(), kp: 4 },
          { time: new Date().toISOString(), kp: 3 }
        ], status: 'Instável (DEMO)' },
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
        
        const data: any[] = await response.json();
        
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
        apiCache.set(cacheKey, result, 3600);
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
        data: { solarFlux: 145, sunspots: 78, flares: "M1.2 (Recente)", status: 'Ativa (DEMO)' },
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

        if (flux === null || isNaN(flux)) {
           throw new Error('Fluxo solar F10.7 inválido ou indisponível');
        }

        const solarData: SolarData = {
          solarFlux: flux,
          sunspots: sunspots,
          flares: flares,
          status: this.getStatusFromFlux(flux)
        };

        const result = { 
          success: true, 
          data: solarData, 
          timestamp: validFlux[0].time_tag || new Date().toISOString()
        };
        
        apiCache.set(cacheKey, result, 3600);
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
