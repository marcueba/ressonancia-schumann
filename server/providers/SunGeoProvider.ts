import fetch from 'node-fetch'; // Polyfill for fetch if needed, but native in Node 18+

export class SunGeoProvider {
  private static readonly API_URL = 'https://sungeo.net/api/current';

  async fetchCurrentData() {
    try {
      console.log('[SunGeoProvider] Fetching data from SunGeo...');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const res = await fetch(SunGeoProvider.API_URL, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      console.log('[SunGeoProvider] Data fetched successfully.');
      return data;
    } catch (error: any) {
      console.error('[SunGeoProvider] Error fetching data:', error.message);
      return null;
    }
  }
}

export const sunGeoProvider = new SunGeoProvider();
