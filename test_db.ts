import { config } from 'dotenv';
config();
async function main() {
    let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    if (supabaseUrl && !supabaseUrl.startsWith('http')) {
      supabaseUrl = `https://${supabaseUrl}.supabase.co`;
    }
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log("=== MEASUREMENTS ===");
    const { data } = await supabase.from('measurements')
        .select('timestamp, collected_at, f1_hz, f2_hz, f3_hz, quality')
        .eq('station_id', 'tomsk')
        .order('timestamp', { ascending: false });
    console.log(data);
}
main();
