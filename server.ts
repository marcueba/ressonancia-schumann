import express from "express";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import path from "path";
import { createServer as createViteServer } from "vite";
import * as dotenv from 'dotenv';
import { tomskProvider } from "./server/providers/SchumannProviders";
import { noaaProvider } from "./server/providers/NoaaProvider";
import { installStaticPages } from "./server/services/static-pages";
import { getERIState } from "./server/services/eri";
import { createHistoryHandler } from "./server/services/history";
import { serveTomskSpectrogram } from "./server/services/spectrogram";
import { bgsSpectrogramService } from "./server/services/bgs-spectrogram";
import { createSitemapHandler } from "./server/services/sitemap";
import { createStationService } from "./server/services/stations";

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

  // Prerender has no live data dependencies and never represents missing data as an empty archive.
  if (process.env.PRERENDER === 'true') {
    app.use('/api', (req, res, next) => {
      if (req.path === '/eri' || req.path === '/config') return next();
      return res.status(503).json({ available: false, error: 'prerender_data_unavailable' });
    });
  }



  const stationService = createStationService({
    getTomskCurrent: () => tomskProvider.getCurrent(),
    getBgsMetadata: () => bgsSpectrogramService.getMetadata(),
  });

  // API Config
  app.get("/api/config", (req, res) => {
    res.json({ mode: process.env.DATA_MODE || 'demo' });
  });

  // Current Schumann Resonance
  app.get("/api/current", async (req, res) => {
    // We try Tomsk as the primary source
    const result = await tomskProvider.getCurrent();
    // A valid source document can explicitly report no observation.
    // Keep that state (and document/query times) distinct from transport/parser errors.
    if (result.data) {
      res.json(result.data);
    } else {
      res.status(503).json({ available: false, error: result.errorCode || 'provider_error', message: result.error || 'Serviço indisponível' });
    }
  });

  app.get("/api/stations", async (_req, res) => {
    res.json(await stationService.getStations());
  });

  app.get("/api/stations/:id", async (req, res) => {
    const station = await stationService.getStationById(req.params.id);
    if (!station) return res.status(404).json({ error: 'Station not found' });
    res.json(station);
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
        error: result.errorCode,
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
        error: result.errorCode,
        message: result.error || "Dados solares temporariamente indisponíveis.",
        productErrors: result.data?.productErrors
      });
    }
  });

  app.get("/api/eri", (_req, res) => {
    res.json(getERIState());
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
  app.get("/api/history", createHistoryHandler());
  app.get('/api/spectrogram/tomsk', serveTomskSpectrogram);

  app.get('/api/bgs/spectrograms', async (_req, res) => {
    try {
      res.set('Cache-Control', 'no-store').json(await bgsSpectrogramService.getMetadata());
    } catch {
      res.status(503).set('Cache-Control', 'no-store').json({ available: false, error: 'bgs_unavailable' });
    }
  });
  app.get('/api/bgs/spectrograms/:channel/:sha256.jpg', async (req, res) => {
    try {
      // Validates the bundled archive once; parameters never trigger an upstream fetch.
      const image = await bgsSpectrogramService.getImage(req.params.channel, req.params.sha256);
      if (!image) {
        res.status(404).set('Cache-Control', 'no-store').json({ available: false, error: 'bgs_image_not_cached' });
        return;
      }
      res.type('image/jpeg').set({
        'Cache-Control': 'public, max-age=86400, immutable',
        ETag: '"' + req.params.sha256 + '"',
      }).send(image);
    } catch {
      res.status(503).set('Cache-Control', 'no-store').json({ available: false, error: 'bgs_image_unavailable' });
    }
  });

  app.get("/robots.txt", (req, res) => {
    res.type('text/plain');
    res.send("User-agent: *\nAllow: /\n\nSitemap: https://ressonanciaschumann.com/sitemap.xml");
  });

  app.get("/sitemap.xml", createSitemapHandler());

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    installStaticPages(app, path.join(process.cwd(), 'dist'), process.env.PRERENDER === 'true');
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
