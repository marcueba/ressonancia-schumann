import { STATION_CATALOG } from '../../shared/stations';
import type { Station, StationDefinition } from '../../shared/stations';
import type { BgsSpectrogramsMetadata } from '../../shared/bgs';
import type { NormalizedSchumannData, ProviderResponse } from '../types';
import { getSchumannAvailability, isSchumannFrequency } from '../../shared/schumann';
import { isValidObservationTime } from './observation-time';

interface StationDependencies {
  getTomskCurrent: () => Promise<ProviderResponse<NormalizedSchumannData>>;
  getBgsMetadata: () => Promise<BgsSpectrogramsMetadata>;
}
const sourceTime = (value: unknown) => isValidObservationTime(value) && !value.endsWith('-00:00') ? value : null;

function initialStation(definition: StationDefinition): Station {
  return { ...definition, status: definition.integration === 'reference' ? 'reference' : 'not_integrated',
    numericAvailability: 'not_connected', statusDetail: definition.integration === 'reference'
      ? 'Referência informativa, sem integração operacional ou validação própria de dados.'
      : 'A integração não foi realizada no site. O estado físico da estação não foi verificado.',
    quality: null, lastUpdate: null, sourceUpdatedAt: null, estimatedObservationAt: null, checkedAt: null,
    isHistorical: null, errorCode: null, visual: null };
}

function numericStation(definition: StationDefinition, result: ProviderResponse<NormalizedSchumannData>): Station {
  const station = initialStation(definition);
  const data = result.data;
  // success:false can accompany a valid error-state document. It is not a transport failure.
  if (!data) return { ...station, status: 'query_failed', numericAvailability: 'query_failed',
    statusDetail: 'A consulta à fonte numérica falhou. Isso não comprova que a estação física esteja offline.',
    errorCode: result.errorCode ?? 'provider_error' };
  if (data.is_demo) return { ...station, status: 'unknown', numericAvailability: 'unavailable',
    statusDetail: 'Dados demonstrativos não comprovam disponibilidade observacional da estação.', errorCode: 'demonstration_data' };
  const modes = [data.fundamental, data.mode2, data.mode3, data.mode4, data.mode5];
  const availability = data.available === true
    ? getSchumannAvailability(modes.map(mode => isSchumannFrequency(mode?.frequency) ? mode.frequency : null)) : 'unavailable';
  const available = availability !== 'unavailable';
  return { ...station, status: available ? 'numeric_available' : 'numeric_unavailable', numericAvailability: availability,
    statusDetail: available
      ? `${availability === 'partial' ? 'Há apenas parte dos parâmetros numéricos válidos.' : 'O produto contém parâmetros numéricos válidos.'}${data.is_historical ? ' A fonte identifica dados históricos/últimos conhecidos.' : ''}`
      : 'O documento foi consultado, mas não contém observações numéricas válidas. Isso não descreve o estado físico da estação.',
    // ProviderResponse.timestamp may be an error/query time; never use it here.
    lastUpdate: available ? sourceTime(data.timestamp) : null,
    sourceUpdatedAt: sourceTime(data.source_updated_at), checkedAt: sourceTime(data.collected_at),
    estimatedObservationAt: available ? sourceTime(data.estimated_observation_at) : null,
    isHistorical: available ? data.is_historical ?? null : null,
    errorCode: available ? null : result.errorCode ?? data.availability_reason ?? 'no_valid_observations' };
}

function visualStation(definition: StationDefinition, metadata: BgsSpectrogramsMetadata | null): Station {
  const station = initialStation(definition);
  if (!metadata) return { ...station, status: 'query_failed', statusDetail: 'Não foi possível consultar a disponibilidade do painel visual BGS. Não há dados numéricos conectados.', errorCode: 'bgs_metadata_failed' };
  const channels = Object.values(metadata.channels);
  // The existing BGS service owns validation/approval; this layer only describes its cached product.
  const available = channels.filter(channel => channel.available && channel.sha256 && channel.imageUrl && channel.observedPeriod && channel.credit);
  const checked = channels.map(channel => sourceTime(channel.checkedAt)).filter((time): time is string => time !== null).sort((a, b) => Date.parse(b) - Date.parse(a));
  return { ...station, status: available.length ? 'visual_available' : 'visual_unavailable',
    statusDetail: available.length
      ? `${available.length === 2 ? 'Ambos os canais têm imagem verificada disponível.' : 'Um dos canais tem imagem verificada disponível.'} Painel visual independente, sem parâmetros numéricos conectados.${channels.some(channel => channel.error) ? ' A atualização remota não forneceu material aprovado; consulte o estado de cada canal.' : ''}`
      : 'Nenhuma imagem verificada disponível no produto consultado. Sem parâmetros numéricos conectados; o estado físico da estação não foi verificado.',
    checkedAt: checked[0] ?? null, visual: metadata,
    errorCode: available.length ? null : 'bgs_visual_unavailable' };
}

export function createStationService(dependencies: StationDependencies) {
  async function resolve(definition: StationDefinition): Promise<Station> {
    if (definition.id === 'tomsk') {
      try { return numericStation(definition, await dependencies.getTomskCurrent()); }
      catch { return numericStation(definition, { success: false, timestamp: null, errorCode: 'provider_error' }); }
    }
    if (definition.id === 'bgs') {
      try { return visualStation(definition, await dependencies.getBgsMetadata()); }
      catch { return visualStation(definition, null); }
    }
    return initialStation(definition);
  }
  return {
    getStations: () => Promise.all(STATION_CATALOG.map(resolve)),
    async getStationById(id: string): Promise<Station | null> {
      const definition = STATION_CATALOG.find(station => station.id === id);
      return definition ? resolve(definition) : null;
    },
  };
}
