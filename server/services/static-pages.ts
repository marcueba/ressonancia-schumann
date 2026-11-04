import express, { type Express } from 'express';
import fs from 'node:fs';
import path from 'node:path';

export const pageRoutes = [
  '/', '/atual', '/historico', '/estacoes', '/indice', '/geomagnetica', '/solar', '/metodologia',
  '/artigos', '/artigos/o-que-e-ressonancia-schumann',
  '/artigos/ressonancia-schumann-hoje', '/artigos/batimento-cardiaco-da-terra',
] as const;

/** Serve explicit editorial routes before directories such as dist/artigos. */
export function installStaticPages(app: Express, distPath: string, prerender: boolean) {
  // The build replaces index.html with the rendered Home. Keep the original
  // shell in memory so later pages never render from another page's HTML/head.
  const shell = prerender ? fs.readFileSync(path.join(distPath, 'index.html'), 'utf8') : null;
  app.get('*', (req, res, next) => {
    const route = req.path === '/' ? '/' : req.path.replace(/\/$/, '');
    if (!(pageRoutes as readonly string[]).includes(route) && !(prerender && route === '/404')) {
      return next();
    }
    if (prerender) return res.type('html').send(shell);
    const file = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
    res.sendFile(path.join(distPath, file), error => {
      if (error) next(error);
    });
  });
  app.use(express.static(distPath, { index: false, redirect: false }));
  app.get('*', (_req, res) => {
    const notFoundPath = path.join(distPath, '404.html');
    if (fs.existsSync(notFoundPath)) res.status(404).sendFile(notFoundPath);
    else res.status(404).send('Página não encontrada');
  });
}
