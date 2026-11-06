import { ProviderResponse, NormalizedSchumannData } from '../types';
import { apiCache } from '../services/cache';
import { normalizeSchumannDocument, SchumannSourceError } from '../services/schumann-contract';

function generateMockSchumann(stationId: string): NormalizedSchumannData {
  const now = new Date().toISOString();
  return {
    stationId,
    timestamp: now,
    available: true,
    availability: 'available',
    timestamp_basis: 'demo',
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
        errorCode: 'source_not_connected',
        timestamp: null
      };
    }

    return apiCache.resolve(cacheKey, async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        let json: unknown;
        try {
          const response = await fetch('https://ressonanciaschumannhoje.com/dados/schumann.json', { signal: controller.signal });
          if (!response.ok) {
            void response.body?.cancel();
            throw new SchumannSourceError('upstream_http_error', `A fonte JSON retornou HTTP ${response.status}.`);
          }
          try { json = await response.json(); }
          catch (error) {
            if (controller.signal.aborted) throw error;
            if (error instanceof SyntaxError) throw new SchumannSourceError('invalid_json', 'A fonte retornou JSON inválido.');
            throw new SchumannSourceError('upstream_transport_error', 'A transferência do documento JSON falhou.');
          }
        } catch (error) {
          if (controller.signal.aborted) throw new SchumannSourceError('upstream_timeout', 'A consulta à fonte JSON excedeu o tempo limite.');
          if (error instanceof SchumannSourceError) throw error;
          throw new SchumannSourceError('upstream_transport_error', 'Falha de transporte ao consultar a fonte JSON.');
        } finally {
          clearTimeout(timeout);
        }
        const data = normalizeSchumannDocument(json, this.stationId, new Date().toISOString());
        const result = { success: data.available === true, data, timestamp: data.timestamp,
          errorCode: data.available ? undefined : data.availability_reason };
        // 5 minutes cache
        apiCache.set(cacheKey, result, 300);
        return result;
      } catch (error) {
        const known = error instanceof SchumannSourceError;
        console.warn(`[Schumann JSON] ${known ? error.code : 'provider_error'}`);
        return {
          success: false,
          errorCode: known ? error.code : 'provider_error',
          error: known ? error.message : 'Falha local ao processar a fonte Schumann.',
          timestamp: null
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
