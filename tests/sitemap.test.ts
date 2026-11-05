import assert from 'node:assert/strict';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import express from 'express';
import { createSitemapHandler } from '../server/services/sitemap';
import { pageRoutes } from '../server/services/static-pages';

const source = new URL('../public/sitemap.xml', import.meta.url);

test('sitemap covers only the existing canonical indexable pages, including the articles', async () => {
  const xml = await fs.readFile(source, 'utf8');
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(new Set(locations).size, locations.length, 'No duplicate sitemap entries');
  const paths = locations.map(location => {
    const url = new URL(location);
    assert.equal(url.origin, 'https://ressonanciaschumann.com');
    assert.equal(url.href, location, 'URLs must already be absolute and canonical');
    assert.equal(url.search, '');
    assert.equal(url.hash, '');
    return url.pathname;
  });
  assert.deepEqual(paths, [...pageRoutes]);
  assert.doesNotMatch(xml, /<lastmod\b/, 'Do not invent modification dates');
});

test('HTTP serves the file verbatim from public in development and dist in production', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'schumann-sitemap-'));
  const xml = await fs.readFile(source, 'utf8');
  for (const directory of ['public', 'dist']) await fs.mkdir(path.join(root, directory));
  await fs.writeFile(path.join(root, 'public/sitemap.xml'), xml);
  const builtXml = xml.replace('</urlset>', '<!-- isolated build fixture -->\n</urlset>');
  await fs.writeFile(path.join(root, 'dist/sitemap.xml'), builtXml);
  for (const production of [false, true]) {
    const app = express();
    app.get('/sitemap.xml', createSitemapHandler(root, production));
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test port');
    try {
      const response = await fetch(`http://127.0.0.1:${address.port}/sitemap.xml`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') || '', /^application\/xml\b/);
      assert.equal(await response.text(), production ? builtXml : xml);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  }
});
