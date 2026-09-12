import { ProviderResponse } from '../types';
import { apiCache } from '../services/cache';

export interface GeoData {
  currentKp: number;
  recentKp: number[];
  status: string;
}

export interface SolarData {
  solarFlux: number;
  sunspots: number;
  flares: string;
  status: string;
}

export class NoaaProvider {
  private getStatusFromKp(kp: number): string {
    if (kp <= 2.66) return 'Calma'; // NOAA standard: <3 is quiet
    if (kp <= 3.66) return 'Instável'; // 3 is unsettled
    if (kp <= 4.66) return 'Ativa'; // 4 is active
    return 'Tempestade Geomagnética'; // >= 5 is storm
  }

  async getGeomagnetic(): Promise<ProviderResponse<GeoData>> {
    const isLive = process.env.DATA_MODE === 'live';
    const cacheKey = 'geomagnetic_noaa';

    if (!isLive) {
      return {
        success: true,
        data: { currentKp: 3, recentKp: [2, 1, 2, 3, 3, 2, 4, 3], status: 'Instável (DEMO)' },
        timestamp: new Date().toISOString()
      };
    }

    const cached = apiCache.get<GeoData>(cacheKey);
    if (cached) return cached;

    try {
      // NOAA API endpoint for planetary K-index
      const response = await fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json');
      if (!response.ok) throw new Error('NOAA API failure');
      
      const data: string[][] = await response.json();
      
      // Data is an array of arrays. The first array is headers: ["time_tag", "Kp_index", "a_running"]
      if (data.length < 2) throw new Error('NOAA returned empty dataset');

      const recentItems = data.slice(-8); // Last 24h (3-hour intervals)
      const recentKp = recentItems.map(row => parseFloat(row[1]));
      const currentKp = recentKp[recentKp.length - 1];

      const geoData: GeoData = {
        currentKp,
        recentKp,
        status: this.getStatusFromKp(currentKp)
      };

      const result = { success: true, data: geoData, timestamp: new Date().toISOString() };
      apiCache.set(cacheKey, result, 3600); // Cache for 1 hour
      return result;

    } catch (error: any) {
      return {
        success: false,
        error: `Falha ao buscar dados geomagnéticos: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getSolar(): Promise<ProviderResponse<SolarData>> {
    const isLive = process.env.DATA_MODE === 'live';
    if (!isLive) {
      return {
        success: true,
        data: { solarFlux: 145, sunspots: 78, flares: "M1.2 (Recente)", status: 'Ativa (DEMO)' },
        timestamp: new Date().toISOString()
      };
    }

    // NOAA's simple JSON endpoints for solar are scattered. We will mock a live fallback for solar flux if an exact simple REST endpoint isn't easily parsed here.
    // For this demonstration, we'll indicate connection pending for solar flux as it requires parsing complex text reports (e.g. SGAS) or specific XMLs.
    return {
      success: false,
      error: 'Conexão pendente. A integração para Fluxo Solar F10.7 e manchas está em desenvolvimento.',
      timestamp: new Date().toISOString()
    };
  }
}

export const noaaProvider = new NoaaProvider();
