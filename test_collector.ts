import { runCollector } from './server/services/collector';
import { config } from 'dotenv';
config();
process.env.DATA_MODE = 'live';

async function main() {
    console.log("=== RAW PAYLOAD FROM SOURCE ===");
    const raw = await fetch('https://ressonanciaschumannhoje.com/dados/schumann.json').then(r => r.json());
    console.log(JSON.stringify({ 
      timestamp: raw.atualizado, 
      f1: raw.fundamental.pico_hz,
      f2: raw.harmonicas?.[0]?.pico_hz || null,
      f3: raw.harmonicas?.[1]?.pico_hz || null
    }, null, 2));
    
    console.log("\n=== RUNNING COLLECTOR (NORMALIZED & DB PERSISTENCE) ===");
    await runCollector();
}
main();
