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

  // Classificação interna do observatório para fins visuais no Dashboard,
  // não corresponde a uma escala oficial padronizada pela NOAA.
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
      
      // The endpoint returns an array of objects: [{"time_tag": "...", "Kp": 2.00, ...}, ...]
      
      if (!Array.isArray(data) || data.length === 0) throw new Error('NOAA returned empty dataset');

      const recentItems = data.slice(-8); // Last 24h (3-hour intervals)
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
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      let response;
      try {
        response = await fetch('https://services.swpc.noaa.gov/json/f107_cm_flux.json', { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
      }
      if (!response.ok) throw new Error('NOAA API failure for solar flux');

      const data: any[] = await response.json();
      if (!Array.isArray(data) || data.length === 0) throw new Error('NOAA returned empty solar dataset');

      const validEntries = data.filter(item => item.time_tag && item.flux !== undefined && item.flux !== null);
      if (validEntries.length === 0) throw new Error('Nenhum registro de fluxo solar válido encontrado');

      validEntries.sort((a, b) => new Date(b.time_tag).getTime() - new Date(a.time_tag).getTime());
      
      const latest = validEntries[0];
      const flux = parseFloat(latest.flux);

      if (isNaN(flux)) {
         throw new Error('Fluxo solar F10.7 inválido ou indisponível');
      }

      const solarData: SolarData = {
        solarFlux: flux,
        sunspots: null, // "Se um dos indicadores não estiver disponível na fonte, retornar null"
        flares: null,
        status: this.getStatusFromFlux(flux)
      };

      const result = { 
        success: true, 
        data: solarData, 
        timestamp: latest.time_tag || new Date().toISOString(),
        message: 'Número de manchas solares (sunspots) não disponível neste endpoint REST JSON da NOAA.'
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
