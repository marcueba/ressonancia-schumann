import type { 
  CurrentResonanceData, 
  HistoricalDataPoint, 
  Station, 
  EarthResonanceIndex, 
  GeomagneticData, 
  SolarData 
} from '../types';
import { pendingRead } from './pendingRead';

// The data provider abstracts the API calls.
// It will attempt to fetch from our Express endpoints.
async function fetchApi(url: string): Promise<Response> {
  const res = await fetch(url);
  // Error callers do not consume JSON. Release the response stream so failed
  // upstream requests cannot stay pending in the browser/prerender lifecycle.
  if (!res.ok) await res.body?.cancel();
  return res;
}

export const dataProvider = {
  async getConfig(): Promise<{ mode: string }> {
    return pendingRead('/api/config', async () => {
      const res = await fetchApi('/api/config');
      if (!res.ok) throw new Error('Failed to fetch data mode');
      return res.json();
    });
  },

  async getCurrentData(): Promise<CurrentResonanceData | null> {
    return pendingRead('/api/current', async () => {
      const res = await fetchApi('/api/current');
      if (!res.ok) return null;
      return res.json();
    });
  },

  async getHistoricalData(range: string = '24h'): Promise<HistoricalDataPoint[]> {
    return pendingRead(`/api/history?range=${range}`, async () => {
      const res = await fetchApi(`/api/history?range=${range}`);
      if (!res.ok) throw new Error('Failed to fetch historical data');
      return res.json();
    });
  },

  async getStations(): Promise<Station[]> {
    const res = await fetchApi('/api/stations');
    if (!res.ok) throw new Error('Failed to fetch stations');
    return res.json();
  },

  async getStationById(id: string): Promise<Station> {
    const res = await fetchApi(`/api/stations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch station data');
    return res.json();
  },

  async getGeomagneticData(): Promise<GeomagneticData | null> {
    return pendingRead('/api/geomagnetic', async () => {
      const res = await fetchApi('/api/geomagnetic');
      if (!res.ok) return null;
      return res.json();
    });
  },

  async getSolarData(): Promise<SolarData | null> {
    return pendingRead('/api/solar', async () => {
      const res = await fetchApi('/api/solar');
      if (!res.ok) return null;
      return res.json();
    });
  },

  async getERI(): Promise<EarthResonanceIndex> {
    const res = await fetchApi('/api/eri');
    if (!res.ok) throw new Error('Failed to fetch ERI');
    return res.json();
  }
};
