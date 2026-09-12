import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from 'dotenv';
import { tomskProvider, bgsProvider, cumianaProvider, etnaProvider, heartmathProvider } from "./server/providers/SchumannProviders";
import { noaaProvider } from "./server/providers/NoaaProvider";
import { calculateERI } from "./server/services/eri";
import { supabase } from "./server/services/supabase";
import { sunGeoProvider } from "./server/providers/SunGeoProvider";
import { normalizeAndPersistSunGeo } from "./server/services/normalizer";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  const stationsData = [
    { id: "tomsk", name: "Tomsk", country: "Rússia", latitude: 56.4977, longitude: 84.9744, dataSource: "SOSRFF", license: "Educacional / Acadêmica", apiEndpoint: "http://sosrff.tsu.ru/" },
    { id: "bgs", name: "BGS Eskdalemuir", country: "Reino Unido", latitude: 55.314, longitude: -3.206, dataSource: "British Geological Survey", license: "OGL", apiEndpoint: "https://geomag.bgs.ac.uk/" },
    { id: "cumiana", name: "Cumiana", country: "Itália", latitude: 44.9791, longitude: 7.3787, dataSource: "Independent", license: "Desconhecida", apiEndpoint: "" },
    { id: "etna", name: "ETNA", country: "Itália", latitude: 37.7510, longitude: 14.9934, dataSource: "INGV", license: "CC BY 4.0", apiEndpoint: "" },
    { id: "heartmath", name: "HeartMath GCI", country: "EUA (Global)", latitude: 37.1232, longitude: -122.1234, dataSource: "Global Coherence Initiative", license: "Fechada", apiEndpoint: "" }
  ];

  // API Config
  app.get("/api/config", (req, res) => {
    res.json({ mode: process.env.DATA_MODE || 'demo' });
  });

  // Test Endpoint for Supabase integration (Etapa 8/9)
  app.get("/api/test-db", async (req, res) => {
    try {
      const testStation = {
        id: "test-station-01",
        name: "Station Test API",
        status: "online",
        latitude: 0,
        longitude: 0
      };

      // 1. Insert
      const { error: insertError } = await supabase
        .from('stations')
        .insert([testStation]);
        
      if (insertError) throw new Error(`Erro na inserção: ${insertError.message}`);

      // 2. Select
      const { data: selectData, error: selectError } = await supabase
        .from('stations')
        .select('*')
        .eq('id', 'test-station-01')
        .single();
        
      if (selectError) throw new Error(`Erro na leitura: ${selectError.message}`);

      // 3. Delete
      const { error: deleteError } = await supabase
        .from('stations')
        .delete()
        .eq('id', 'test-station-01');

      if (deleteError) throw new Error(`Erro na deleção: ${deleteError.message}`);

      res.json({
        success: true,
        message: "Operações de teste concluídas com sucesso (Insert, Select, Delete)",
        data_read: selectData
      });

    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message
      });
    }
  });

  // SunGeo Integration Endpoints (Etapa 6)
  app.get("/api/sungeo/test", async (req, res) => {
    try {
      const data = await sunGeoProvider.fetchCurrentData();
      if (!data) {
        return res.status(500).json({ success: false, error: 'Failed to fetch SunGeo data' });
      }
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/sungeo/fetch", async (req, res) => {
    try {
      const rawData = await sunGeoProvider.fetchCurrentData();
      if (!rawData) {
        return res.status(500).json({ success: false, error: 'Failed to fetch SunGeo data' });
      }

      const normalized = await normalizeAndPersistSunGeo(rawData);
      if (!normalized) {
         return res.status(500).json({ success: false, error: 'Failed to normalize and persist' });
      }

      res.json({ success: true, normalized });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Current Schumann Resonance
  app.get("/api/current", async (req, res) => {
    // We try Tomsk as the primary source
    const result = await tomskProvider.getCurrent();
    if (result.success && result.data) {
      res.json(result.data);
    } else {
      res.status(503).json({ error: result.error || 'Serviço indisponível' });
    }
  });

  app.get("/api/stations", async (req, res) => {
    const isLive = process.env.DATA_MODE === 'live';
    
    // Evaluate status for each station
    const stationsStatus = await Promise.all([
      tomskProvider.getCurrent(),
      bgsProvider.getCurrent(),
      cumianaProvider.getCurrent(),
      etnaProvider.getCurrent(),
      heartmathProvider.getCurrent()
    ]);

    const formatted = stationsData.map((s, index) => {
      const pResult = stationsStatus[index];
      return {
        ...s,
        status: isLive ? (pResult.success ? 'online' : 'offline') : 'online',
        quality: isLive ? (pResult.success ? pResult.data?.quality : 'Baixa') : 'Alta',
        lastUpdate: pResult.timestamp
      };
    });
    
    res.json(formatted);
  });

  app.get("/api/stations/:id", async (req, res) => {
    const station = stationsData.find(s => s.id === req.params.id);
    if (!station) {
      return res.status(404).json({ error: 'Station not found' });
    }
    
    // Evaluate status for this station specifically if we wanted to
    // For now, return basic info and 'online' status for demo
    res.json({
      ...station,
      status: 'online',
      quality: 'Alta',
      lastUpdate: new Date().toISOString()
    });
  });

  app.get("/api/geomagnetic", async (req, res) => {
    const result = await noaaProvider.getGeomagnetic();
    if (result.success && result.data) {
      res.json({ ...result.data, dataSource: 'NOAA SWPC' });
    } else {
      res.status(503).json({ error: result.error });
    }
  });

  app.get("/api/solar", async (req, res) => {
    const result = await noaaProvider.getSolar();
    if (result.success && result.data) {
      res.json({ ...result.data, dataSource: 'NOAA SWPC' });
    } else {
      res.status(503).json({ error: result.error });
    }
  });

  app.get("/api/eri", async (req, res) => {
    // To calculate ERI, we need the latest Schumann data and Geo Kp
    const [schumann, geo] = await Promise.all([
      tomskProvider.getCurrent(),
      noaaProvider.getGeomagnetic()
    ]);

    const sData = schumann.success ? schumann.data! : null;
    const kp = geo.success ? geo.data!.currentKp : null;
    
    const eri = calculateERI(sData, kp);
    res.json(eri);
  });

  // History (Simulated for both modes as we don't have DB configured yet)
  app.get("/api/history", (req, res) => {
    if (process.env.DATA_MODE === 'live') {
      return res.json([]);
    }
    const history = [];
    const now = Date.now();
    for (let i = 24; i >= 0; i--) {
      history.push({
        time: new Date(now - i * 3600000).toISOString(),
        frequency: 7.8 + Math.random() * 0.1,
        amplitude: 2.5 + Math.random() * 2.0,
      });
    }
    res.json(history);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
