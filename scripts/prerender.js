const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROUTES = ['/', '/atual', '/historico', '/estacoes', '/indice', '/geomagnetica', '/solar', '/metodologia'];
const PORT = process.env.PRERENDER_PORT || 8999;

async function startServer() {
  return new Promise((resolve, reject) => {
    // Run the production bundle
    const server = spawn(process.execPath, ['dist/server.cjs'], {
      env: { ...process.env, NODE_ENV: 'production', DATA_MODE: 'live', PORT: PORT.toString() },
    });

    let started = false;

    server.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log(`[Server]: ${msg.trim()}`);
      if (msg.includes('Server running on port')) {
        started = true;
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      console.error(`[Server Error]: ${data.toString().trim()}`);
    });

    server.on('error', (err) => {
      if (!started) reject(err);
    });

    server.on('exit', (code) => {
      if (!started && code !== 0) reject(new Error(`Server exited with code ${code}`));
    });
  });
}

(async () => {
  let serverProcess;
  let browser;
  try {
    console.log(`\nStarting temporary server on port ${PORT}...`);
    serverProcess = await startServer();

    console.log('Starting Puppeteer...');
    browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const distDir = path.join(__dirname, '../dist');

    for (const route of ROUTES) {
      console.log(`Prerendering ${route}...`);
      const page = await browser.newPage();
      
      page.on('console', msg => {
        if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) {
           // Ignorar erro do CSP gerado por Vite e ignorar 404 do favicon
           if (!msg.text().includes('Content Security Policy')) {
             console.log(`[Prerender Browser Warning ${route}]:`, msg.text());
           }
        }
      });

      const url = `http://localhost:${PORT}${route}`;
      const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      if (!response.ok()) {
        throw new Error(`Failed to load ${url}: Status ${response.status()}`);
      }

      // Esperar o hook useSEO finalizar
      await page.waitForSelector('link[rel="canonical"]', { timeout: 10000 });
      await new Promise(r => setTimeout(r, 1000));
      const html = await page.evaluate(() => {
        return '<!doctype html>\n' + document.documentElement.outerHTML;
      });

      let fileName = route === '/' ? 'index.html' : `${route.substring(1)}.html`;
      const filePath = path.join(distDir, fileName);

      fs.writeFileSync(filePath, html);
      console.log(`✅ Saved ${fileName} (${(html.length / 1024).toFixed(2)} KB)`);
      await page.close();
    }

    console.log('🎉 Prerender completed successfully!');
  } catch (err) {
    console.error('\n❌ PRERENDER FAILED:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
    if (serverProcess) {
       serverProcess.kill();
    }
    process.exit(0);
  }
})();
