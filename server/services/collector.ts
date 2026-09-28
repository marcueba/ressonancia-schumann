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

export type CollectorResult = 'persisted' | 'already_exists' | 'no_valid_observation' | 'error';

export async function runCollector(): Promise<CollectorResult> {
  if (isCollecting) {
    console.log('[Collector] Já existe uma coleta em andamento. Ignorando.');
    return 'error';
  }

  isCollecting = true;
  try {
    console.log('[Collector] Iniciando coleta Schumann...');
    
    // 1. Obtém a leitura atual
    const result = await tomskProvider.getCurrent();
    
    if (!result.success || !result.data) {
      console.error('[Collector] Falha ao obter dados do provider.');
      return 'error';
    }

    const data = result.data;

    if (data.fundamental.frequency === null || !data.timestamp) {
      console.log('[Collector] Ausência de observação válida (F1 null ou sem timestamp).');
      return 'no_valid_observation';
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

    if (supabase) {
      const { error, data: insertedData } = await supabase.from('measurements').upsert(payload, { 
        onConflict: 'station_id, timestamp', 
        ignoreDuplicates: true 
      }).select();
      
      if (error) {
        console.error('[Collector] Erro no Supabase:', error.message);
        return 'error';
      } else {
        if (insertedData && insertedData.length > 0) {
          console.log('[Schumann Job] persisted');
          return 'persisted';
        } else {
          console.log('[Schumann Job] already exists');
          return 'already_exists';
        }
      }
    } else {
      console.error('[Collector] Supabase client não inicializado (falta credencial server-side).');
      return 'error';
    }
  } catch (err: any) {
    console.error('[Collector] Erro interno:', err.message);
    return 'error';
  } finally {
    isCollecting = false;
  }
}


