export const BGS_STATION_ID = 'bgs-eskdalemuir' as const;
export const BGS_SOURCE_PAGE_URL = 'https://geomag.bgs.ac.uk/research/inductioncoils.html';
export const BGS_ORIGINAL_URLS = {
  north: 'https://geomag.bgs.ac.uk/images/currentSpectrogramCH1.jpg',
  east: 'https://geomag.bgs.ac.uk/images/currentSpectrogramCH2.jpg',
} as const;
export type BgsChannel = keyof typeof BGS_ORIGINAL_URLS;
export function isBgsChannel(value: unknown): value is BgsChannel { return value === 'north' || value === 'east'; }

export interface BgsObservedPeriod {
  label: string;
  date: string;
  year: number;
  basis: 'image_verified_by_sha256';
  note?: string;
}
export interface BgsChannelMetadata {
  channel: BgsChannel;
  available: boolean;
  imageUrl: string | null;
  originalUrl: string;
  sha256: string | null;
  imageOrigin: 'archive' | 'remote' | null;
  fetchedAt: string | null;
  checkedAt: string;
  nextCheckAt: string;
  cacheState: 'fresh' | 'cached' | 'stale' | 'unavailable';
  observedPeriod: BgsObservedPeriod | null;
  credit: string | null;
  error: string | null;
}
export interface BgsSpectrogramsMetadata {
  stationId: typeof BGS_STATION_ID;
  sourcePageUrl: typeof BGS_SOURCE_PAGE_URL;
  channels: Record<BgsChannel, BgsChannelMetadata>;
}
