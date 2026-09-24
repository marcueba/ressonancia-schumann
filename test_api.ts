import { config } from 'dotenv';
config();
process.env.DATA_MODE = 'live';

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
    
    let msRange = 24 * 3600 * 1000;
    const { data, error } = await supabase
       .from('measurements')
       .select('timestamp, f1_hz, f2_hz')
       .gte('timestamp', new Date(Date.now() - msRange).toISOString())
       .order('timestamp', { ascending: true });
       
    if (error) {
        console.log("Expected error (schema missing):", error.message);
    } else {
        console.log("Data returned:", data);
    }
}
main();
