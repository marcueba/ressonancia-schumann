import { config } from 'dotenv';
config();
process.env.DATA_MODE = 'live';
import { runCollector } from './server/services/collector';
import { tomskProvider } from './server/providers/SchumannProviders';

async function main() {
    let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    if (supabaseUrl && !supabaseUrl.startsWith('http')) {
      supabaseUrl = `https://${supabaseUrl}.supabase.co`;
    }
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("\n=== 2. REAL PERSISTENCE ===");
    await runCollector();

    console.log("\n=== 3. IDEMPOTENCY ===");
    const { data: currentData } = await tomskProvider.getCurrent();
    const ts = currentData?.timestamp;
    console.log("Current timestamp:", ts);
    
    // Select to check idempotency
    const { data: checkData, error: checkErr } = await supabase.from('measurements').select('id, timestamp').eq('station_id', 'tomsk').eq('timestamp', ts);
    if (checkErr) {
        console.error("Select error:", checkErr);
    } else {
        console.log(`Rows before 2nd run: ${checkData?.length}`);
    }

    await runCollector();
    
    const { data: checkData2 } = await supabase.from('measurements').select('id, timestamp').eq('station_id', 'tomsk').eq('timestamp', ts);
    console.log(`Rows after 2nd run: ${checkData2?.length}`);
    
}
main();
