import path from 'node:path';
import type { RequestHandler } from 'express';

// Vite copies public/sitemap.xml to dist; serve that same document in both modes.
export function createSitemapHandler(root = process.cwd(), production = process.env.NODE_ENV === 'production'): RequestHandler {
  const file = path.join(root, production ? 'dist' : 'public', 'sitemap.xml');
  return (_req, res, next) => {
    res.type('application/xml').sendFile(file, error => {
      if (error) next(error);
    });
  };
}
