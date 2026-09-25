import { config } from 'dotenv';
config();
process.env.DATA_MODE = 'live';
import { runCollector } from './server/services/collector';

async function main() {
    console.log("=== RUNNING COLLECTOR ===");
    await runCollector();

    let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    if (supabaseUrl && !supabaseUrl.startsWith('http')) {
      supabaseUrl = `https://${supabaseUrl}.supabase.co`;
    }
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log("\n=== MEASUREMENTS AFTER 1st RUN ===");
    const { data: data1 } = await supabase.from('measurements')
        .select('timestamp, f1_hz')
        .eq('station_id', 'tomsk')
        .order('timestamp', { ascending: false });
    console.log(data1);

    console.log("\n=== RUNNING COLLECTOR AGAIN ===");
    await runCollector();

    console.log("\n=== MEASUREMENTS AFTER 2nd RUN ===");
    const { data: data2 } = await supabase.from('measurements')
        .select('timestamp, f1_hz')
        .eq('station_id', 'tomsk')
        .order('timestamp', { ascending: false });
    console.log(data2);
}
main();
