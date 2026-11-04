import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { installStaticPages } from '../server/services/static-pages';

async function start(prerender: boolean) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'schumann-pages-'));
  await fs.mkdir(path.join(dir, 'artigos'));
  await fs.writeFile(path.join(dir, 'index.html'), 'original shell');
  await fs.writeFile(path.join(dir, 'indice.html'), 'ERI em desenvolvimento');
  await fs.writeFile(path.join(dir, 'artigos.html'), 'índice editorial');
  await fs.writeFile(path.join(dir, 'artigos', 'o-que-e-ressonancia-schumann.html'), 'artigo');
  await fs.writeFile(path.join(dir, '404.html'), 'não encontrada');
  const app = express();
  installStaticPages(app, dir, prerender);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port');
  return { dir, url: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>(resolve => server.close(() => resolve())) };
}

test('editorial routes take precedence over directories and retain a real 404', async () => {
  const server = await start(false);
  try {
    for (const [route, body] of [['/indice', 'ERI em desenvolvimento'], ['/artigos', 'índice editorial'], ['/artigos/', 'índice editorial'], ['/artigos/o-que-e-ressonancia-schumann', 'artigo']]) {
      const res = await fetch(server.url + route, { redirect: 'manual' });
      assert.equal(res.status, 200, route);
      assert.equal(await res.text(), body, route);
    }
    const missing = await fetch(server.url + '/nao-existe');
    assert.equal(missing.status, 404);
    assert.equal(await missing.text(), 'não encontrada');
  } finally { await server.close(); }
});

test('prerender keeps the shell immutable when Home is replaced, and only allows known pages', async () => {
  const server = await start(true);
  try {
    await fs.writeFile(path.join(server.dir, 'index.html'), 'rendered Home with unrelated head');
    for (const route of ['/indice', '/artigos', '/404']) {
      const res = await fetch(server.url + route);
      assert.equal(res.status, 200);
      assert.equal(await res.text(), 'original shell');
    }
    assert.equal((await fetch(server.url + '/nao-existe')).status, 404);
  } finally { await server.close(); }
});
