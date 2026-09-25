import { createClient } from '@supabase/supabase-js';
import { tomskProvider } from '../providers/SchumannProviders';

let supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}.supabase.co`;
}
// MUST USE SERVICE_ROLE FOR SERVER-SIDE INSERTS (Bypass RLS)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseKey && process.env.DATA_MODE === 'live') {
  console.warn('[Collector] AVISO: SUPABASE_SERVICE_ROLE_KEY não configurada. As gravações falharão devido ao RLS.');
}
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

let isCollecting = false;

export async function runCollector(): Promise<boolean> {
  if (isCollecting) {
    console.log('[Collector] Já existe uma coleta em andamento. Ignorando.');
    return false;
  }

  isCollecting = true;
  try {
    console.log('[Collector] Iniciando coleta Schumann...');
    
    // 1. Obtém a leitura atual
    const result = await tomskProvider.getCurrent();
    
    if (!result.success || !result.data) {
      console.error('[Collector] Falha ao obter dados do provider.');
      return false;
    }

    const data = result.data;

    // 2 & 3. Rejeita leitura sem timestamp ou sem F1 válido
    if (!data.timestamp || data.fundamental.frequency === null) {
      console.error('[Collector] Dados inválidos recebidos. Timestamp ou F1 ausente.');
      return false;
    }

    // 7. Preparar payload de inserção (Normalizado)
    const payload = {
      station_id: data.stationId,
      timestamp: data.timestamp, // O timestamp original da observação
      collected_at: data.collected_at,
      quality: data.quality,
      f1_hz: data.fundamental.frequency,
      f2_hz: data.mode2?.frequency ?? null,
      f3_hz: data.mode3?.frequency ?? null,
      source_type: data.source_type,
      derived_from_image: data.derived_from_image,
      processor: data.processing_method,
    };

    console.log(`[Schumann Job] timestamp da fonte: ${data.timestamp}`);

    // A estratégia de idempotência (8) é usar UNIQUE(station_id, timestamp) no banco de dados.
    // Assim, se tentarmos inserir o mesmo timestamp, o Supabase retornará um erro ou ignorará via ON CONFLICT DO NOTHING.
    if (supabase) {
      const { error, data: insertedData } = await supabase.from('measurements').upsert(payload, { 
        onConflict: 'station_id, timestamp', 
        ignoreDuplicates: true 
      }).select();
      
      if (error) {
        console.error('[Collector] Erro no Supabase:', error.message);
        return false;
      } else {
        if (insertedData && insertedData.length > 0) {
          console.log('[Schumann Job] persisted');
        } else {
          console.log('[Schumann Job] already exists');
        }
        return true;
      }
    } else {
      console.error('[Collector] Supabase client não inicializado (falta credencial server-side).');
      return false;
    }
  } catch (err: any) {
    console.error('[Collector] Erro interno:', err.message);
    return false;
  } finally {
    isCollecting = false;
  }
}


