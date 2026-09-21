import express from "express";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from 'dotenv';
import { tomskProvider, bgsProvider, cumianaProvider, etnaProvider, heartmathProvider } from "./server/providers/SchumannProviders";
import { noaaProvider } from "./server/providers/NoaaProvider";
import { calculateERI } from "./server/services/eri";
import { supabase } from "./server/services/supabase";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());


  app.set('trust proxy', 1);

  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        fontSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    frameguard: {
      action: 'deny',
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: false,
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  }));

  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });

  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });


  const apiRateLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: "Muitas requisições. Aguarde um momento e tente novamente."
      });
    }
  });

  app.use('/api', apiRateLimiter);


  const stationsData = [
    { id: "tomsk", name: "Tomsk", country: "Rússia", latitude: 56.4977, longitude: 84.9744, dataSource: "SOSRFF", license: "Não especificada pela fonte", apiEndpoint: "http://sosrff.tsu.ru/" },
    { id: "bgs", name: "BGS Eskdalemuir", country: "Reino Unido", latitude: 55.314, longitude: -3.206, dataSource: "British Geological Survey", license: "OGL", apiEndpoint: "https://geomag.bgs.ac.uk/" },
    { id: "cumiana", name: "Cumiana", country: "Itália", latitude: 44.9791, longitude: 7.3787, dataSource: "Renato Romero / VLF.it", license: "Desconhecida", apiEndpoint: "" },
    { id: "etna", name: "ETNA", country: "Itália", latitude: 37.7510, longitude: 14.9934, dataSource: "INGV / ETNA", license: "Não especificada pela fonte", apiEndpoint: "" },
    { id: "heartmath", name: "HeartMath GCI", country: "EUA (Global)", latitude: 37.1232, longitude: -122.1234, dataSource: "Global Coherence Initiative", license: "Fechada", apiEndpoint: "" }
  ];

  // API Config
  app.get("/api/config", (req, res) => {
    res.json({ mode: process.env.DATA_MODE || 'demo' });
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
      let finalStatus = 'online';
      if (isLive) {
        if (pResult.success) {
          finalStatus = 'online';
        } else if (pResult.error?.includes('pendente') || pResult.error?.includes('indisponível')) {
          finalStatus = 'indisponível';
        } else {
          finalStatus = 'offline';
        }
      }

      return {
        ...s,
        status: finalStatus,
        quality: isLive ? (pResult.success ? pResult.data?.quality : 'Desconhecida') : 'Alta',
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
      res.json({
        success: true,
        available: true,
        dataSource: 'NOAA SWPC',
        timestamp: result.timestamp,
        ...result.data
      });
    } else {
      res.status(503).json({
        success: false,
        available: false,
        message: result.error || "Dados geomagnéticos temporariamente indisponíveis."
      });
    }
  });

  app.get("/api/solar", async (req, res) => {
    const result = await noaaProvider.getSolar();
    if (result.success && result.data) {
      res.json({
        success: true,
        available: true,
        dataSource: 'NOAA SWPC',
        timestamp: result.timestamp,
        message: result.message,
        ...result.data
      });
    } else {
      res.status(503).json({
        success: false,
        available: false,
        message: result.error || "Dados solares temporariamente indisponíveis."
      });
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

  // Placeholder for Correlation (Future implementation)
  app.get("/api/correlation", (req, res) => {
    res.status(503).json({
      success: false,
      available: false,
      message: "Dados de correlação ainda não disponíveis nesta versão."
    });
  });

  // Placeholder for Heatmap (Future implementation)
  app.get("/api/heatmap", (req, res) => {
    res.status(503).json({
      success: false,
      available: false,
      message: "Dados de mapa de calor ainda não disponíveis nesta versão."
    });
  });

  // Placeholder for Station Analyses (Future implementation)
  app.get("/api/station-analyses", (req, res) => {
    res.status(503).json({
      success: false,
      available: false,
      message: "Análise avançada de estações ainda não disponível nesta versão."
    });
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
