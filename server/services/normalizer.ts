import { supabase } from './supabase';

export async function normalizeAndPersistSunGeo(rawData: any) {
  if (!rawData || !rawData.status) {
    console.warn('[Normalizer] Invalid or missing raw data from SunGeo');
    return null;
  }

  try {
    // 1. Ensure Data Source exists
    const dataSource = {
      id: 'sungeo-api',
      name: 'SunGeo Network',
      url: 'https://sungeo.net',
      api_endpoint: 'https://sungeo.net/api/current',
      commercial_use: false,
      requires_attribution: true,
      status: 'online'
    };

    await supabase.from('data_sources').upsert(dataSource);

    // 2. Ensure Station exists (SunGeo is an aggregator)
    const stationId = 'sungeo-global';
    const station = {
      id: stationId,
      name: 'SunGeo Global Aggregator',
      country: 'Global',
      latitude: 0, // General placeholder for global aggregators
      longitude: 0,
      data_source_id: 'sungeo-api',
      status: 'online'
    };
    
    await supabase.from('stations').upsert(station);

    // 3. Insert Measurement
    // The timestamp "2026-09-11 21:30:09" needs formatting to ISO
    let timestamp = new Date().toISOString();
    if (rawData.updated_at) {
       // Replace space with T and append Z to force UTC (assuming SunGeo provides UTC)
       timestamp = new Date(rawData.updated_at.replace(' ', 'T') + 'Z').toISOString();
    }

    const measurementPayload = {
      station_id: stationId,
      timestamp: timestamp,
      quality: 'Alta' // Assuming SunGeo aggregated data is high quality
    };

    const { data: measurement, error: mError } = await supabase
      .from('measurements')
      .upsert(measurementPayload, { onConflict: 'station_id,timestamp' })
      .select()
      .single();

    if (mError) {
      console.error('[Normalizer] Error inserting measurement:', mError.message);
      return null;
    }

    // 4. Schumann Modes
    // SunGeo `/api/current` does NOT provide specific frequency/amplitude arrays.
    // Following strict instructions: "Não inventar valores quando algum campo estiver ausente."
    // We will leave modes empty rather than simulating them.

    return {
      source: dataSource,
      station: station,
      measurement: measurement,
      modes: [] // Explicitly empty, as raw data doesn't provide them
    };
  } catch (err: any) {
    console.error('[Normalizer] Critical error during normalization:', err.message);
    return null;
  }
}
