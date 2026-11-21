// Isolated artifact verification: no production configuration or credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { request } = require('node:http');
const { spawn } = require('node:child_process');
const puppeteer = require('puppeteer-core');
const root = path.join(__dirname, '..');
const evidence = path.join(root, 'validation-evidence');
const publicRoot = path.join(root, 'dist', 'public');
const port = 19003;
const base = `http://127.0.0.1:${port}`;
const staticRoutes = ['/', '/atual', '/historico', '/estacoes', '/indice', '/geomagnetica', '/solar', '/metodologia',
  '/artigos', '/artigos/o-que-e-ressonancia-schumann', '/artigos/ressonancia-schumann-hoje',
  '/artigos/batimento-cardiaco-da-terra', '/404'];
const routes = ['/', '/indice', '/artigos', '/artigos/o-que-e-ressonancia-schumann',
  '/artigos/ressonancia-schumann-hoje', '/artigos/batimento-cardiaco-da-terra',
  '/historico', '/atual', '/nao-existe-recuperacao'];
const publicFiles = ['favicon.svg', 'og-article-1.jpg', 'og-article-2.jpg', 'og-article-3.jpg',
  'og-image.jpg', 'og-image.png', 'og-image.svg', 'robots.txt', 'site.webmanifest', 'sitemap.xml'];
const manifest = require('../server/assets/bgs/manifest.json');

// node:http preserves the path passed to the loopback server verbatim.
function readArtifact(pathname, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const req = request({ hostname: '127.0.0.1', port, path: pathname, method, headers, signal: AbortSignal.timeout(5000) }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function checkHealthEndpoint() {
  const body = Buffer.from('{"status":"ok"}');
  for (const method of ['GET', 'HEAD']) {
    const response = await readArtifact('/healthz', method, { 'If-None-Match': '*' });
    assert.equal(response.status, 200, method);
    assert.equal(response.headers['cache-control'], 'no-store', method);
    assert.equal(response.headers['content-type'], 'application/json; charset=utf-8', method);
    assert.equal(response.headers['x-content-type-options'], 'nosniff', method);
    assert.equal(Number(response.headers['content-length']), body.length, method);
    assert.ok(response.body.equals(method === 'GET' ? body : Buffer.alloc(0)), method);
  }
  console.log('GET and HEAD /healthz returned 200 JSON with no-store and external fetch blocked.');
}

async function checkPublicArtifact() {
  const builtNotFound = fs.readFileSync(path.join(publicRoot, '404.html'));
  const privatePaths = ['/server.cjs', '/server.cjs.map', '/%73erver.cjs', '/server.cjs%2emap',
    '/server.cjs?check=1', '/dist/server.cjs', '/dist/server.cjs.map', '/assets/server.cjs',
    '/%2e%2e/server.cjs', '/assets/%2e%2e/%2e%2e/server.cjs.map', '/%252e%252e/server.cjs',
    '/assets/server.cjs.map', '/.env', '/.env.example', '/package.json', '/bun.lock',
    '/vite.config.ts', '/server.ts', '/scripts/prerender.cjs', '/scripts/monitoramento/monitor.mjs',
    '/server/services/healthz.mjs', '/bgs-archive/manifest.json',
    ...manifest.images.map(image => '/bgs-archive/' + image.file)];
  for (const method of ['GET', 'HEAD']) {
    for (const route of privatePaths) {
      const response = await readArtifact(route, method);
      assert.equal(response.status, 404, `${method} ${route}`);
      assert.match(response.headers['content-type'], /^text\/html\b/, `${method} ${route} must use the 404 page`);
      assert.ok(response.body.equals(method === 'GET' ? builtNotFound : Buffer.alloc(0)), `${method} ${route} response body`);
    }
  }
  console.log(`${privatePaths.length * 2} internal-path checks returned HTTP 404.`);

  const renderedFiles = staticRoutes.map(route => route === '/' ? 'index.html' : route.slice(1) + '.html');
  for (const [index, route] of staticRoutes.entries()) {
    const html = fs.readFileSync(path.join(publicRoot, renderedFiles[index]), 'utf8');
    const response = await readArtifact(route);
    assert.equal(response.status, route === '/404' ? 404 : 200, route);
    assert.match(response.headers['content-type'], /^text\/html\b/, route);
    assert.equal(response.body.toString('utf8'), html, route);
    if (route === '/404') assert.match(html, /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/, route);
    else assert.ok(html.includes(`href="https://ressonanciaschumann.com${route}"`), route);
    const initialMain = html.match(/<main[\s>][\s\S]*?<\/main>/i)?.[0];
    assert.ok(initialMain, route);
    assert.doesNotMatch(initialMain, /role="alert"|dados (?:simulados|ilustrativos)|prerender_data_unavailable|falha ao consultar|não foi possível (?:consultar|atualizar)|espectrograma Tomsk temporariamente indisponível/i, route);
  }
  console.log('13 prerendered routes served with the expected status and no transient errors.');

  const home = fs.readFileSync(path.join(publicRoot, 'index.html'), 'utf8');
  const bundledAssets = [...new Set([...home.matchAll(/\b(?:src|href)="(\/assets\/[^"\s]+)"/g)].map(match => match[1]))];
  assert.ok(bundledAssets.some(route => route.endsWith('.js')), 'Expected a browser script in the Home');
  assert.ok(bundledAssets.some(route => route.endsWith('.css')), 'Expected a stylesheet in the Home');
  for (const route of [...bundledAssets, '/favicon.svg', '/sitemap.xml']) {
    const response = await readArtifact(route);
    assert.equal(response.status, 200, route);
    assert.ok(response.body.equals(fs.readFileSync(path.join(publicRoot, route.slice(1)))), route);
  }

  const approvedFiles = new Set([...renderedFiles, ...publicFiles]);
  for (const entry of fs.readdirSync(publicRoot, { recursive: true, withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    const file = path.relative(publicRoot, path.join(entry.parentPath, entry.name));
    const bundledFile = /^assets[/\\][A-Za-z0-9_-]+\.(?:js|css)$/.test(file);
    assert.ok(entry.isFile() && (approvedFiles.has(file) || bundledFile), `Unexpected file in public artifact: ${file}`);
  }
}

async function checkBgsArchive() {
  const response = await fetch(base + '/api/bgs/spectrograms', { signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200);
  const { channels, sourcePageUrl } = await response.json();
  assert.equal(sourcePageUrl, manifest.sourcePageUrl);
  for (const { channel, sha256, originalUrl, observedPeriod, credit } of manifest.images) {
    const metadata = channels[channel];
    const imageUrl = `/api/bgs/spectrograms/${channel}/${sha256}.jpg`;
    assert.equal(metadata.imageUrl, imageUrl, channel);
    assert.equal(metadata.imageOrigin, 'archive', channel);
    assert.equal(metadata.sha256, sha256, channel);
    assert.equal(metadata.originalUrl, originalUrl, channel);
    assert.deepEqual(metadata.observedPeriod, observedPeriod, channel);
    assert.equal(metadata.credit, credit, channel);
    const image = await readArtifact(imageUrl);
    assert.equal(image.status, 200, imageUrl);
    assert.equal(image.headers['content-type'], 'image/jpeg', imageUrl);
    assert.equal(createHash('sha256').update(image.body).digest('hex'), sha256, channel);
  }
  console.log('Both BGS channels preserve their original SHA-256 and attribution through the public API.');
}

async function checkBgsLinks(page) {
  for (const { channel, sha256 } of manifest.images) {
    const label = channel === 'north' ? 'Canal Norte' : 'Canal Leste';
    const url = `${base}/api/bgs/spectrograms/${channel}/${sha256}.jpg`;
    await page.waitForSelector('[data-bgs-panel] button[aria-controls="bgs-channel-content"]');
    await page.$$eval('[data-bgs-panel] button[aria-controls="bgs-channel-content"]', (buttons, text) => {
      buttons.find(button => button.textContent === text).click();
    }, label);
    await page.waitForFunction(expected => {
      const panel = document.querySelector('#bgs-channel-content');
      const image = panel?.querySelector('img');
      const enlargement = [...(panel?.querySelectorAll('a') ?? [])].find(link => link.textContent === 'Ampliar esta imagem');
      return image?.naturalWidth > 0 && image.currentSrc === expected && enlargement?.href === expected;
    }, { timeout: 10000 }, url);
  }
}

async function checkOverviewBgsLinks(page) {
  for (const { channel, sha256 } of manifest.images) {
    const url = `${base}/api/bgs/spectrograms/${channel}/${sha256}.jpg`;
    await page.waitForFunction((id, expected) => {
      const figure = document.querySelector(`[data-overview-channel="${id}"]`);
      const image = figure?.querySelector('img');
      return image?.naturalWidth > 0 && image.currentSrc === expected && image.closest('a')?.href === expected;
    }, { timeout: 10000 }, channel, url);
  }
}

(async () => {
  assert.equal(fs.existsSync(path.join(root, '.env')), false, 'Run validation in an isolated checkout without .env');
  fs.mkdirSync(evidence, { recursive: true });
  let browser;
  let unexpectedReads = false;
  const fetchMarker = 'Unexpected fetch in artifact server';
  const blockFetch = `globalThis.fetch = () => { process.stderr.write('${fetchMarker}'); throw new Error('External fetch blocked'); };`;
  const preload = 'data:text/javascript,' + encodeURIComponent(blockFetch);
  const server = spawn(process.execPath, ['--import', preload, 'dist/server.cjs'], {
    cwd: root,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production', DATA_MODE: 'live', PORT: String(port) },
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Artifact server startup timeout')), 10000);
      server.stdout.on('data', data => {
        process.stdout.write(data);
        if (String(data).includes('Server running')) { clearTimeout(timer); resolve(); }
      });
      server.stderr.on('data', data => {
        if (String(data).includes(fetchMarker)) unexpectedReads = true;
        process.stderr.write(data);
      });
      server.once('error', error => { clearTimeout(timer); reject(error); });
      server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exit ${code}`)); });
    });
    await checkHealthEndpoint();
    await checkPublicArtifact();
    await checkBgsArchive();
    const eri = await fetch(base + '/api/eri');
    assert.equal(eri.status, 200);
    assert.deepEqual(await eri.json(), { enabled: false, status: 'Em desenvolvimento', experimental: true });
    const history = await fetch(base + '/api/history?range=24h');
    assert.equal(history.status, 503);
    assert.equal((await history.json()).error, 'history_unavailable');
    const invalid = await fetch(base + '/api/history?month=2026-13');
    assert.equal(invalid.status, 400);
    await invalid.arrayBuffer();

    let config;
    if (process.platform === 'linux') {
      const module = require('@sparticuz/chromium');
      const chromium = module.default || module;
      config = { executablePath: await chromium.executablePath(), args: chromium.args, headless: 'shell' };
    } else {
      config = { executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true };
    }
    console.log('Chromium:', config.executablePath);
    browser = await puppeteer.launch(config);
    console.log('Browser:', await browser.version());
    for (const width of [1440, 390]) {
      const page = await browser.newPage();
      await page.setViewport({ width, height: 900 });
      await page.setCacheEnabled(false);
      // The BGS archive, ERI, config and unconfigured history are local.
      // Keep the browser validation independent of the other scientific sources.
      await page.setRequestInterception(true);
      page.on('request', request => {
        const { origin, pathname } = new URL(request.url());
        const localApi = ['/api/config', '/api/eri', '/api/history', '/api/bgs/spectrograms'].includes(pathname) ||
          pathname.startsWith('/api/bgs/spectrograms/');
        if (origin === base && (!pathname.startsWith('/api/') || localApi)) return request.continue();
        return request.abort();
      });
      const errors = [];
      page.on('pageerror', error => errors.push(String(error)));
      for (const route of routes) {
        const expected = route.startsWith('/nao-') ? 404 : 200;
        for (const reload of [false, true]) {
          const response = reload
            ? await page.reload({ waitUntil: 'networkidle2', timeout: 30000 })
            : await page.goto(base + route, { waitUntil: 'networkidle2', timeout: 30000 });
          assert.equal(response.status(), expected, route);
          if (expected === 200) {
            await page.waitForFunction(url => document.querySelector('link[rel=canonical]')?.href === url,
              { timeout: 10000 }, 'https://ressonanciaschumann.com' + route);
          }
          if (route === '/indice') assert.match(await page.$eval('main', el => el.textContent), /Em desenvolvimento/);
          if (route === '/') await checkOverviewBgsLinks(page);
          if (route === '/atual') await checkBgsLinks(page);
          if (route === '/historico') {
            await page.waitForSelector('[role="alert"]', { timeout: 10000 });
            assert.match(await page.$eval('[role="alert"]', el => el.textContent), /Não foi possível consultar o histórico/);
            assert.doesNotMatch(await page.$eval('main', el => el.textContent), /Nenhum registro disponível neste período/);
          }
          assert.deepEqual(errors, []);
          console.log(JSON.stringify({ width, route, reload, status: response.status(), pageErrors: errors }));
        }
        if (route === '/indice' || route === '/historico') {
          await page.screenshot({ path: path.join(evidence, `${route.slice(1)}-${width}.png`) });
        }
      }
      await page.close();
    }
    assert.equal(unexpectedReads, false, 'Artifact server attempted to fetch an external dependency');
    console.log('Artifact validation passed; no production credentials or collection used.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => {
      if (server.exitCode !== null) return resolve();
      server.once('exit', resolve);
      server.kill();
    });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
