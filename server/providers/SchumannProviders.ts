import { ProviderResponse, NormalizedSchumannData } from '../types';
import { apiCache } from '../services/cache';

function generateMockSchumann(stationId: string): NormalizedSchumannData {
  const now = new Date().toISOString();
  return {
    stationId,
    timestamp: now,
    fundamental: { frequency: 7.83 + (Math.random() * 0.1 - 0.05), amplitude: null, quality: 'Alta' },
    mode2: { frequency: 14.2 + (Math.random() * 0.2 - 0.1), amplitude: null, quality: 'Alta' },
    mode3: { frequency: 20.5 + (Math.random() * 0.2 - 0.1), amplitude: null, quality: 'Média' },
    mode4: { frequency: 26.0 + (Math.random() * 0.2 - 0.1), amplitude: null, quality: 'Média' },
    mode5: { frequency: 33.0 + (Math.random() * 0.2 - 0.1), amplitude: null, quality: 'Baixa' },
    quality: 'Demo',
    source: 'Dados Demonstrativos',
    source_type: 'MOCK_GENERATOR',
    processing_method: 'RANDOM_WALK',
    is_primary_measurement: false,
    is_demo: true,
    collected_at: now
  };
}

export class SchumannProvider {
  constructor(private stationId: string, private sourceName: string) {}

  async getCurrent(): Promise<ProviderResponse<NormalizedSchumannData>> {
    const isLive = process.env.DATA_MODE === 'live';
    const cacheKey = `schumann_${this.stationId}`;

    if (!isLive) {
      return apiCache.resolve(cacheKey, async () => {
        const data = generateMockSchumann(this.stationId);
        const response: ProviderResponse<NormalizedSchumannData> = {
          success: true,
          data,
          timestamp: data.timestamp
        };
        apiCache.set(cacheKey, response, 60);
        return response;
      });
    }

    if (this.stationId !== 'tomsk') {
       return {
        success: false,
        error: `A fonte ${this.sourceName} não possui uma API JSON pública conectada.`,
        timestamp: new Date().toISOString()
      };
    }

    return apiCache.resolve(cacheKey, async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        let response;
        try {
          response = await fetch('https://ressonanciaschumannhoje.com/dados/schumann.json', { signal: controller.signal });
        } finally {
          clearTimeout(timeout);
        }

        if (!response.ok) throw new Error('Falha na fonte secundária');

        const json = await response.json();
        
        // Validation
        const updatedAt = json.atualizado || new Date().toISOString();
        const f1 = json.fundamental?.pico_hz;
        const f2 = json.harmonicas?.[0]?.pico_hz;
        const f3 = json.harmonicas?.[1]?.pico_hz;
        const f4 = json.harmonicas?.[2]?.pico_hz;
        const f5 = json.harmonicas?.[3]?.pico_hz;

        const data: NormalizedSchumannData = {
          stationId: this.stationId,
          timestamp: updatedAt,
          fundamental: { frequency: f1 ?? null, amplitude: null, quality: json.fundamental?.estado || 'desconhecido' },
          mode2: { frequency: f2 ?? null, amplitude: null, quality: json.harmonicas?.[0]?.estado || 'desconhecido' },
          mode3: { frequency: f3 ?? null, amplitude: null, quality: json.harmonicas?.[1]?.estado || 'desconhecido' },
          mode4: { frequency: f4 ?? null, amplitude: null, quality: json.harmonicas?.[2]?.estado || 'desconhecido' },
          mode5: { frequency: f5 ?? null, amplitude: null, quality: json.harmonicas?.[3]?.estado || 'desconhecido' },
          quality: json.estado || 'ok',
          source: 'Tomsk / SOS-70',
          source_type: 'derived_spectrogram',
          source_url: 'https://sos70.ru/provider.php?file=shm.jpg',
          processing_method: 'Processamento de Imagem Externo',
          processing_version: 'RessonanciaSchumannHoje/1.0',
          derived_from_image: true,
          is_primary_measurement: false,
          is_demo: false,
          collected_at: new Date().toISOString()
        };

        const result = { success: true, data, timestamp: updatedAt };
        // 5 minutes cache
        apiCache.set(cacheKey, result, 300);
        return result;
      } catch (error: any) {
        return {
          success: false,
          error: 'Não foi possível carregar os dados de Tomsk no momento.',
          timestamp: new Date().toISOString()
        };
      }
    });
  }
}

export const tomskProvider = new SchumannProvider('tomsk', 'Tomsk / SOS-70');
export const bgsProvider = new SchumannProvider('bgs', 'BGS (Eskdalemuir)');
export const cumianaProvider = new SchumannProvider('cumiana', 'Cumiana');
export const etnaProvider = new SchumannProvider('etna', 'ETNA');
export const heartmathProvider = new SchumannProvider('heartmath', 'HeartMath GCI');
