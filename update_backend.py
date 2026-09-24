import re

# Update collector.ts
with open('server/services/collector.ts', 'r', encoding='utf-8') as f:
    collector_code = f.read()

collector_code = collector_code.replace(
    '''const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;''',
    '''const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
// MUST USE SERVICE_ROLE FOR SERVER-SIDE INSERTS (Bypass RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseKey && process.env.DATA_MODE === 'live') {
  console.warn('[Collector] AVISO: SUPABASE_SERVICE_ROLE_KEY não configurada. As gravações falharão devido ao RLS.');
}
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;'''
)

collector_code = re.sub(
    r'// Exemplo do código final \(MOCKADO, NÃO EXECUTA\):\s*/\*.*?\*/',
    '''if (supabase) {
      const { error } = await supabase.from('measurements').upsert(payload, { 
        onConflict: 'station_id, timestamp', 
        ignoreDuplicates: true 
      });
      if (error) console.error('[Collector] Erro no Supabase:', error);
      else console.log('[Collector] Registro persistido (upsert idempotent) com sucesso.');
    } else {
      console.error('[Collector] Supabase client não inicializado (falta credencial server-side).');
    }''',
    collector_code,
    flags=re.DOTALL
)

with open('server/services/collector.ts', 'w', encoding='utf-8') as f:
    f.write(collector_code)

# Update server.ts
with open('server.ts', 'r', encoding='utf-8') as f:
    server_code = f.read()

history_logic = r'''if \(process\.env\.DATA_MODE === 'live'\) \{.*?return res\.json\(\[\]\); // Por enquanto retorna vazio pois não inserimos no banco ainda\.\s*\}'''
new_history = '''if (process.env.DATA_MODE === 'live') {
      const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
      const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
      
      // We can use anon key here since reading might be public, or service key if RLS blocks read.
      // Assuming RLS allows read for anon, but we'll use service key if needed to ensure it works for now.
      const keyToUse = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
      
      if (!supabaseUrl || !keyToUse) {
        return res.json([]);
      }
      
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, keyToUse);
      
      let msRange = 24 * 3600 * 1000;
      if (range === '7d') msRange = 7 * 24 * 3600 * 1000;
      if (range === '30d') msRange = 30 * 24 * 3600 * 1000;
      if (range === '90d') msRange = 90 * 24 * 3600 * 1000;
      if (range === '1y') msRange = 365 * 24 * 3600 * 1000;
      
      const { data, error } = await supabase
         .from('measurements')
         .select('timestamp, f1_hz, f2_hz')
         .gte('timestamp', new Date(Date.now() - msRange).toISOString())
         .order('timestamp', { ascending: true });
         
      if (error) {
        console.error('[API History] Error fetching data:', error);
        return res.status(500).json({ error: "Failed to fetch history" });
      }
      
      return res.json(data.map(row => ({ 
        time: row.timestamp, 
        frequency: row.f1_hz,
        f2: row.f2_hz 
      })));
    }'''

server_code = re.sub(history_logic, new_history, server_code, flags=re.DOTALL)

with open('server.ts', 'w', encoding='utf-8') as f:
    f.write(server_code)

