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

export async function runCollector() {
  if (isCollecting) {
    console.log('[Collector] Já existe uma coleta em andamento. Ignorando.');
    return;
  }

  isCollecting = true;
  try {
    console.log('[Collector] Iniciando coleta Schumann...');
    
    // 1. Obtém a leitura atual
    const result = await tomskProvider.getCurrent();
    
    if (!result.success || !result.data) {
      console.error('[Collector] Falha ao obter dados do provider.');
      return;
    }

    const data = result.data;

    // 2 & 3. Rejeita leitura sem timestamp ou sem F1 válido
    if (!data.timestamp || data.fundamental.frequency === null) {
      console.error('[Collector] Dados inválidos recebidos. Timestamp ou F1 ausente.');
      return;
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

    console.log('[Collector] Payload validado (Simulação de persistência):', JSON.stringify(payload, null, 2));

    // A estratégia de idempotência (8) é usar UNIQUE(station_id, timestamp) no banco de dados.
    // Assim, se tentarmos inserir o mesmo timestamp, o Supabase retornará um erro ou ignorará via ON CONFLICT DO NOTHING.
    if (supabase) {
      const { error } = await supabase.from('measurements').upsert(payload, { 
        onConflict: 'station_id, timestamp', 
        ignoreDuplicates: true 
      });
      if (error) console.error('[Collector] Erro no Supabase:', error);
      else console.log('[Collector] Registro persistido (upsert idempotent) com sucesso.');
    } else {
      console.error('[Collector] Supabase client não inicializado (falta credencial server-side).');
    }
  } catch (err) {
    console.error('[Collector] Erro interno:', err);
  } finally {
    isCollecting = false;
  }
}

export function startScheduler() {
  if (process.env.DATA_MODE !== 'live') {
    console.log('[Scheduler] DATA_MODE não é "live". Agendamento ignorado.');
    return;
  }

  console.log('[Scheduler] Iniciando timer interno (60 min)...');
  
  // Coleta inicial após startup
  setTimeout(() => {
    runCollector().catch(err => console.error(err));
  }, 5000);

  // Coleta a cada 60 minutos
  setInterval(() => {
    runCollector().catch(err => console.error(err));
  }, 60 * 60 * 1000);
}
