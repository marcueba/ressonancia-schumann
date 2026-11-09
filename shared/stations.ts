import { BGS_SOURCE_PAGE_URL } from './bgs';
import type { BgsSpectrogramsMetadata } from './bgs';

export type StationId = 'tomsk' | 'bgs' | 'cumiana' | 'etna' | 'heartmath' | 'sierra';
export type StationIntegration = 'numeric_connected' | 'visual_independent' | 'not_integrated' | 'reference';
export type StationStatus = 'numeric_available' | 'numeric_unavailable' | 'visual_available' | 'visual_unavailable' | 'not_integrated' | 'reference' | 'query_failed' | 'unknown'
  | 'online' | 'atraso' | 'offline'; // Legacy values remain accepted, but are not produced from missing data.
export type NumericAvailability = 'available' | 'partial' | 'unavailable' | 'not_connected' | 'query_failed';

export interface StationDefinition {
  id: StationId;
  name: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  dataSource: string;
  license: string;
  apiEndpoint: string;
  referenceUrl: string | null;
  type: string;
  role: string;
  integration: StationIntegration;
  metadataNote: string;
  rights: { rawData: string | null; images: string | null };
}

export interface Station extends StationDefinition {
  status: StationStatus;
  numericAvailability: NumericAvailability;
  statusDetail: string;
  quality: string | null;
  // A source observation timestamp only; never request time or an image's day-only period.
  lastUpdate: string | null;
  sourceUpdatedAt: string | null;
  estimatedObservationAt: string | null;
  checkedAt: string | null;
  isHistorical: boolean | null;
  errorCode: string | null;
  visual: BgsSpectrogramsMetadata | null;
}

// Union of the existing API and page identifiers. A reference is not an integration.
export const STATION_CATALOG: readonly StationDefinition[] = [
  { id: 'tomsk', name: 'Tomsk', country: 'Rússia', latitude: 56.4977, longitude: 84.9744,
    dataSource: 'Tomsk / SOS-70 — JSON derivado externo', license: 'Não especificada pela fonte',
    apiEndpoint: 'https://ressonanciaschumannhoje.com/dados/schumann.json', referenceUrl: 'https://sos70.ru/',
    type: 'Espectrograma ELF / parâmetros derivados externamente', role: 'Fonte numérica configurada no site', integration: 'numeric_connected',
    metadataNote: 'A disponibilidade abaixo descreve o produto consultado pelo site, não o funcionamento físico da estação.',
    rights: { rawData: null, images: null } },
  { id: 'bgs', name: 'BGS Eskdalemuir', country: 'Reino Unido', latitude: 55.314, longitude: -3.206,
    dataSource: 'British Geological Survey', license: 'JPEGs: permissão não comercial específica; dados brutos: OGL',
    apiEndpoint: 'https://geomag.bgs.ac.uk/', referenceUrl: BGS_SOURCE_PAGE_URL,
    type: 'Magnetômetros de indução — espectrogramas diários ELF', role: 'Painel visual independente; sem números conectados', integration: 'visual_independent',
    metadataNote: 'Hash verificado comprova a integridade do arquivo, não uma classificação de qualidade científica.',
    rights: { rawData: 'OGL dos dados brutos; não se estende aos JPEGs reproduzidos.', images: 'Reprodução não comercial autorizada, com crédito por imagem. Uso comercial exige autorização separada.' } },
  { id: 'cumiana', name: 'Cumiana', country: 'Itália', latitude: null, longitude: null,
    dataSource: 'Renato Romero / VLF.it (referência legada)', license: 'Termos de uso não confirmados',
    apiEndpoint: '', referenceUrl: 'https://www.vlf.it/', type: 'Receptor VLF/ELF — referência externa',
    role: 'Integração não realizada no site', integration: 'not_integrated',
    metadataNote: 'Referência legada não revalidada. A falta de integração no site não comprova que a estação física esteja offline.',
    rights: { rawData: null, images: null } },
  { id: 'etna', name: 'ETNA', country: 'Itália', latitude: null, longitude: null,
    dataSource: 'Etna Radio Observatory (ERO)', license: 'Não verificada para reprodução de dados ou imagens',
    apiEndpoint: '', referenceUrl: 'https://www.ct.ingv.it/index.php/ricerca/i-vulcani-siciliani/etna/le-eruzioni-dell-etna-impatto-sul-territorio/2-uncategorised/247-ero-change-in-the-level-of-electromagnetic-environmental-noise-following-the-covid-19-lockdown',
    type: 'Observações eletromagnéticas ELF/ULF/VLF — referência externa', role: 'Integração não realizada no site', integration: 'not_integrated',
    metadataNote: 'O INGV documenta cooperação com ERO. Isso não identifica ERO como uma estação operada exclusivamente pelo INGV.',
    rights: { rawData: null, images: null } },
  { id: 'heartmath', name: 'HeartMath GCI', country: 'Rede global', latitude: null, longitude: null,
    dataSource: 'HeartMath Institute / Global Coherence Monitoring System', license: 'Não verificada para reprodução de dados ou imagens',
    apiEndpoint: '', referenceUrl: 'https://main.heartmath.org/gci/gcms/', type: 'Rede de magnetômetros',
    role: 'Integração não realizada no site', integration: 'not_integrated',
    metadataNote: 'A rede é descrita pela própria instituição; seus produtos não estão conectados aos números deste site.',
    rights: { rawData: null, images: null } },
  { id: 'sierra', name: 'Sierra Nevada', country: 'Espanha', latitude: null, longitude: null,
    dataSource: 'Universidade de Granada — estudo de Salinas et al. (2022)', license: 'Consultar os termos de cada publicação e dataset',
    apiEndpoint: '', referenceUrl: 'https://digibug.ugr.es/handle/10481/75094', type: 'Arquivos instrumentais históricos — referência bibliográfica',
    role: 'Referência metodológica; sem integração operacional', integration: 'reference',
    metadataNote: 'O artigo descreve registros de março de 2013 a fevereiro de 2017. O projeto não comprova validação própria desses datasets.',
    rights: { rawData: null, images: null } },
];

export const STATION_STATUS_LABELS: Record<StationStatus, string> = {
  numeric_available: 'Dados numéricos disponíveis', numeric_unavailable: 'Produto numérico sem observações válidas',
  visual_available: 'Imagem verificada disponível', visual_unavailable: 'Sem imagem verificada disponível', not_integrated: 'Não integrado ao site', reference: 'Referência informativa',
  query_failed: 'Falha de consulta ao produto', unknown: 'Estado não confirmado',
  online: 'Estado legado: online', atraso: 'Estado legado: atraso', offline: 'Estado legado: offline',
};
export const NUMERIC_AVAILABILITY_LABELS: Record<NumericAvailability, string> = {
  available: 'Disponíveis', partial: 'Parciais', unavailable: 'Sem observações válidas', not_connected: 'Não conectados ao site', query_failed: 'Consulta não concluída',
};
