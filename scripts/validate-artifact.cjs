// Isolated artifact verification: no production configuration or credentials.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const puppeteer = require('puppeteer-core');
const root = path.join(__dirname, '..');
const evidence = path.join(root, 'validation-evidence');
const routes = ['/indice', '/artigos', '/artigos/o-que-e-ressonancia-schumann',
  '/artigos/ressonancia-schumann-hoje', '/artigos/batimento-cardiaco-da-terra',
  '/historico', '/nao-existe-recuperacao'];

(async () => {
  assert.equal(fs.existsSync(path.join(root, '.env')), false, 'Run validation in an isolated checkout without .env');
  fs.mkdirSync(evidence, { recursive: true });
  let browser;
  const server = spawn(process.execPath, ['dist/server.cjs'], {
    cwd: root,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'production', DATA_MODE: 'live', PORT: '19003' },
  });
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Artifact server startup timeout')), 10000);
      server.stdout.on('data', data => {
        process.stdout.write(data);
        if (String(data).includes('Server running')) { clearTimeout(timer); resolve(); }
      });
      server.stderr.on('data', data => process.stderr.write(data));
      server.once('error', error => { clearTimeout(timer); reject(error); });
      server.once('exit', code => { clearTimeout(timer); reject(new Error(`Server exit ${code}`)); });
    });
    const base = 'http://127.0.0.1:19003';
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
