import { ProviderResponse, NormalizedSchumannData } from '../types';
import { apiCache } from '../services/cache';

// Mock data generator for DEMO mode
function generateMockSchumann(stationId: string): NormalizedSchumannData {
  const now = new Date().toISOString();
  return {
    stationId,
    timestamp: now,
    fundamental: { frequency: 7.83 + (Math.random() * 0.1 - 0.05), amplitude: 3.4 + Math.random(), quality: 'Alta' },
    mode2: { frequency: 14.2 + (Math.random() * 0.2 - 0.1), amplitude: 1.8 + Math.random() * 0.5, quality: 'Alta' },
    mode3: { frequency: 20.5 + (Math.random() * 0.2 - 0.1), amplitude: 1.1 + Math.random() * 0.3, quality: 'Média' },
    mode4: { frequency: 26.0 + (Math.random() * 0.2 - 0.1), amplitude: 0.7 + Math.random() * 0.2, quality: 'Média' },
    mode5: { frequency: 33.0 + (Math.random() * 0.2 - 0.1), amplitude: 0.4 + Math.random() * 0.1, quality: 'Baixa' },
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

    // If LIVE mode, we return a failure since there are no open JSON APIs for Schumann currently.
    if (isLive) {
      return {
        success: false,
        error: `Conexão pendente. A fonte ${this.sourceName} não disponibiliza uma API JSON pública para dados em tempo real.`,
        timestamp: new Date().toISOString()
      };
    }

    // DEMO mode
    const cached = apiCache.get<NormalizedSchumannData>(cacheKey);
    if (cached) return cached;

    const data = generateMockSchumann(this.stationId);
    const response: ProviderResponse<NormalizedSchumannData> = {
      success: true,
      data,
      timestamp: data.timestamp
    };
    
    // Cache for 1 minute in demo mode
    apiCache.set(cacheKey, response, 60);
    return response;
  }
}

export const tomskProvider = new SchumannProvider('tomsk', 'SOSRFF (Tomsk)');
export const bgsProvider = new SchumannProvider('bgs', 'BGS (Eskdalemuir)');
export const cumianaProvider = new SchumannProvider('cumiana', 'Cumiana');
export const etnaProvider = new SchumannProvider('etna', 'ETNA');
export const heartmathProvider = new SchumannProvider('heartmath', 'HeartMath GCI');
