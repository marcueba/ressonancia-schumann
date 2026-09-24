import { config } from 'dotenv';
config();
process.env.DATA_MODE = 'live';

import { tomskProvider } from './server/providers/SchumannProviders';
import { noaaProvider } from './server/providers/NoaaProvider';

async function run() {
  console.log("=== RAW SCHUMANN JSON ===");
  const rawSchumann = await fetch('https://ressonanciaschumannhoje.com/dados/schumann.json').then(r => r.json());
  console.log(JSON.stringify(rawSchumann, null, 2).substring(0, 500));

  console.log("\n=== NORMALIZED SCHUMANN PROVIDER ===");
  const schumannResult = await tomskProvider.getCurrent();
  console.log(JSON.stringify(schumannResult, null, 2));

  console.log("\n=== RAW NOAA SUNSPOTS/REGIONS ===");
  const rawRegions = await fetch('https://services.swpc.noaa.gov/json/solar_regions.json').then(r => r.json());
  console.log(`Regiões totais no JSON: ${rawRegions.length}. Últimas duas:`, JSON.stringify(rawRegions.slice(-2), null, 2));
  
  if (rawRegions.length > 0) {
    const latestDate = rawRegions[rawRegions.length - 1].observed_date;
    const currentRegions = rawRegions.filter(r => r.observed_date === latestDate);
    console.log(`\nCálculo manual: Regiões com observed_date === ${latestDate}: ${currentRegions.length}`);
  }

  console.log("\n=== NORMALIZED NOAA SOLAR PROVIDER ===");
  const solarResult = await noaaProvider.getSolar();
  console.log(JSON.stringify(solarResult, null, 2));
}

run();
