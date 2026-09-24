import { config } from 'dotenv';
config();
process.env.DATA_MODE = 'live';
import { runCollector } from './server/services/collector';
import express from 'express';
// We'll spin up a quick server to test the endpoints in the same process
import { tomskProvider } from './server/providers/SchumannProviders';

async function main() {
    let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    if (supabaseUrl && !supabaseUrl.startsWith('http')) {
      supabaseUrl = `https://${supabaseUrl}.supabase.co`;
    }
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing supabase credentials");
        return;
    }
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("=== 1. SCHEMA VERIFICATION ===");
    // check schema by selecting 1 row
    const { data: schemaCheck, error: schemaErr } = await supabase.from('measurements').select('f1_hz, f2_hz, f3_hz, derived_from_image, source_type, processor').limit(1);
    if (schemaErr) {
        console.error("Schema error:", schemaErr.message);
        return;
    }
    console.log("Schema exists. Ready for persistence.");

    console.log("\n=== 2. REAL PERSISTENCE ===");
    await runCollector();

    console.log("\n=== 3. IDEMPOTENCY ===");
    // Get the timestamp we just inserted
    const { data: currentData } = await tomskProvider.getCurrent();
    if (!currentData || !currentData.timestamp) {
        console.error("No current data available");
        return;
    }
    const ts = currentData.timestamp;
    
    const countBefore = await supabase.from('measurements').select('*', { count: 'exact' }).eq('station_id', 'tomsk').eq('timestamp', ts);
    console.log(`Rows for tomsk at ${ts}: ${countBefore.count}`);
    
    await runCollector();
    
    const countAfter = await supabase.from('measurements').select('*', { count: 'exact' }).eq('station_id', 'tomsk').eq('timestamp', ts);
    console.log(`Rows after second run: ${countAfter.count}`);
    
    if (countBefore.count !== countAfter.count) {
        console.error("IDEMPOTENCY FAILED!");
        return;
    }

    console.log("\n=== 4. TEST HISTORY ENDPOINT LOGIC ===");
    const { data: history24h, error: err24 } = await supabase
         .from('measurements')
         .select('timestamp, f1_hz, f2_hz')
         .gte('timestamp', new Date(Date.now() - 24 * 3600 * 1000).toISOString())
         .order('timestamp', { ascending: true });
    console.log("24h History count:", history24h?.length);
    if (history24h && history24h.length > 0) {
        console.log("Sample 24h:", history24h[0]);
    }

    console.log("\n=== 5. CURRENT READING ===");
    console.log(JSON.stringify(currentData, null, 2));

}
main();
