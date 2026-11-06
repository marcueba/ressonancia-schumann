import { dataProvider } from './dataProvider';

/** Each source settles independently; one rejected request cannot erase its siblings. */
export async function loadDashboardSources(provider = dataProvider) {
  const [current, geo, solar] = await Promise.allSettled([
    provider.getCurrentData(), provider.getGeomagneticData(), provider.getSolarData(),
  ]);
  return {
    current: current.status === 'fulfilled' ? current.value : null,
    geo: geo.status === 'fulfilled' ? geo.value : null,
    solar: solar.status === 'fulfilled' ? solar.value : null,
  };
}
