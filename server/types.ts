// Types for the backend implementation
export interface NormalizedSchumannData {
  stationId: string;
  timestamp: string; // ISO string
  fundamental: { frequency: number | null; amplitude: number | null; quality: string };
  mode2: { frequency: number | null; amplitude: number | null; quality: string };
  mode3: { frequency: number | null; amplitude: number | null; quality: string };
  mode4: { frequency: number | null; amplitude: number | null; quality: string };
  mode5: { frequency: number | null; amplitude: number | null; quality: string };
  quality: string;
  source: string;
  source_url?: string;
  source_type?: string;
  collected_at?: string;
  processing_method?: string;
  processing_version?: string;
  derived_from_image?: boolean;
  is_primary_measurement?: boolean;
  is_demo?: boolean;
}

export interface ProviderResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  timestamp: string;
}
