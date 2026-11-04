import { createClient } from '@supabase/supabase-js';
import type { RequestHandler } from 'express';

// The factory allows regression tests to use a read-only in-memory dependency.
export function createHistoryHandler(clientFactory = createClient, env = process.env): RequestHandler {
  return async (req, res) => {
    const durations: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const range = req.query.range;
    const month = req.query.month;
    if (range !== undefined && (typeof range !== 'string' || !Object.hasOwn(durations, range))) {
      res.status(400).json({ error: 'Invalid range' });
      return;
    }
    if (month !== undefined && (typeof month !== 'string' || !/^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(month))) {
      res.status(400).json({ error: 'Invalid month. Expected YYYY-MM' });
      return;
    }
    const unavailable = () => res.status(503).json({ available: false, error: 'history_unavailable', message: 'Histórico temporariamente indisponível.' });
    if (env.PRERENDER === 'true' || env.DATA_MODE !== 'live') {
      unavailable();
      return;
    }
    let url = env.VITE_SUPABASE_URL || env.SUPABASE_URL || '';
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;
    if (!url || !key) {
      unavailable();
      return;
    }
    if (!url.startsWith('http')) url = `https://${url}.supabase.co`;
    try {
      const client = clientFactory(url, key);
      let query = client.from('measurements')
        .select('timestamp, f1_hz, f2_hz, f3_hz, quality, source_type, derived_from_image, processor')
        .order('timestamp', { ascending: true });
      if (typeof month === 'string') {
        const [year, number] = month.split('-').map(Number);
        const next = number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, '0')}`;
        query = query.gte('timestamp', new Date(`${month}-01T00:00:00-03:00`).toISOString())
          .lt('timestamp', new Date(`${next}-01T00:00:00-03:00`).toISOString());
      } else {
        query = query.gte('timestamp', new Date(Date.now() - durations[typeof range === 'string' ? range : '24h'] * 86400000).toISOString());
      }
      const { data, error } = await query;
      if (error || !Array.isArray(data)) {
        console.warn('[API History] history_unavailable');
        unavailable();
        return;
      }
      res.json(data.map(row => ({
        timestamp: row.timestamp, f1: row.f1_hz, f2: row.f2_hz, f3: row.f3_hz,
        quality: row.quality, sourceType: row.source_type,
        derivedFromImage: row.derived_from_image, processor: row.processor,
      })));
    } catch {
      console.warn('[API History] history_unavailable');
      unavailable();
    }
  };
}
