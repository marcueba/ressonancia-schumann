import { dataProvider } from './dataProvider';
import type { CurrentResonanceData, GeomagneticData, SolarData } from '../types';

export interface DashboardSources {
  current: CurrentResonanceData | null;
  geo: GeomagneticData | null;
  solar: SolarData | null;
}

/** Each source settles independently; one rejected request cannot erase its siblings. */
export async function loadDashboardSources(provider = dataProvider, onSource?: (source: Partial<DashboardSources>) => void) {
  function publish<K extends keyof DashboardSources>(key: K, request: Promise<DashboardSources[K]>) {
    return request.then(value => {
      onSource?.({ [key]: value } as Partial<DashboardSources>);
      return value;
    }, error => {
      onSource?.({ [key]: null } as Partial<DashboardSources>);
      throw error;
    });
  }
  const [current, geo, solar] = await Promise.allSettled([
    publish('current', provider.getCurrentData()), publish('geo', provider.getGeomagneticData()), publish('solar', provider.getSolarData()),
  ]);
  return {
    current: current.status === 'fulfilled' ? current.value : null,
    geo: geo.status === 'fulfilled' ? geo.value : null,
    solar: solar.status === 'fulfilled' ? solar.value : null,
  };
}
