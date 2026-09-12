import type { 
  CurrentResonanceData, 
  HistoricalDataPoint, 
  Station, 
  EarthResonanceIndex, 
  GeomagneticData, 
  SolarData 
} from '../types';

// The data provider abstracts the API calls.
// It will attempt to fetch from our Express endpoints.

export const dataProvider = {
  async getConfig(): Promise<{ mode: string }> {
    const res = await fetch('/api/config');
    if (!res.ok) return { mode: 'demo' };
    return res.json();
  },

  async getCurrentData(): Promise<CurrentResonanceData | null> {
    const res = await fetch('/api/current');
    if (!res.ok) return null;
    return res.json();
  },

  async getHistoricalData(): Promise<HistoricalDataPoint[]> {
    const res = await fetch('/api/history');
    if (!res.ok) throw new Error('Failed to fetch historical data');
    return res.json();
  },

  async getStations(): Promise<Station[]> {
    const res = await fetch('/api/stations');
    if (!res.ok) throw new Error('Failed to fetch stations');
    return res.json();
  },

  async getStationById(id: string): Promise<Station> {
    const res = await fetch(`/api/stations/${id}`);
    if (!res.ok) throw new Error('Failed to fetch station data');
    return res.json();
  },

  async getGeomagneticData(): Promise<GeomagneticData | null> {
    const res = await fetch('/api/geomagnetic');
    if (!res.ok) return null;
    return res.json();
  },

  async getSolarData(): Promise<SolarData | null> {
    const res = await fetch('/api/solar');
    if (!res.ok) return null;
    return res.json();
  },

  async getERI(): Promise<EarthResonanceIndex> {
    const res = await fetch('/api/eri');
    if (!res.ok) throw new Error('Failed to fetch ERI');
    return res.json();
  }
};
