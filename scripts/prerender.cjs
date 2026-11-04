const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const os = require('os');

const ROUTES = ['/', '/atual', '/historico', '/estacoes', '/indice', '/geomagnetica', '/solar', '/metodologia',
  '/artigos',
  '/artigos/o-que-e-ressonancia-schumann',
  '/artigos/ressonancia-schumann-hoje',
  '/artigos/batimento-cardiaco-da-terra', '/404'];
const PORT = process.env.PRERENDER_PORT || 8999;
const projectRoot = path.join(__dirname, '..');

async function getBrowserConfig() {
  const platform = os.platform();

  if (platform === 'linux') {
    console.log('[Puppeteer] Plataforma Linux detectada. Utilizando @sparticuz/chromium...');
    // Dependendo de onde/como importamos, sparticuz tem export default
    let chromium;
    try {
      chromium = require('@sparticuz/chromium').default || require('@sparticuz/chromium');
    } catch (e) {
      throw new Error(`Falha ao carregar @sparticuz/chromium no Linux: ${e.message}`);
    }
    
    return {
      executablePath: await chromium.executablePath(),
      args: chromium.args,
      defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
      headless: 'shell',
    };
  }

  console.log(`[Puppeteer] Plataforma ${platform} detectada. Buscando executável Chromium/Chrome local...`);

  let executablePath = null;

  if (platform === 'darwin') {
    const macPaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
      '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary'
    ];
    for (const p of macPaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }
  }

  // Fallback via terminal para qualquer sistema
  if (!executablePath) {
    try {
      const whichCmd = platform === 'win32' ? 'where chrome' : 'which google-chrome';
      const p = execSync(whichCmd, { stdio: 'pipe' }).toString().trim();
      if (p && fs.existsSync(p)) executablePath = p;
    } catch (e) {
      try {
        const whichChromium = platform === 'win32' ? 'where chromium' : 'which chromium';
        const p = execSync(whichChromium, { stdio: 'pipe' }).toString().trim();
        if (p && fs.existsSync(p)) executablePath = p;
      } catch (e2) {}
    }
  }

  if (!executablePath) {
    throw new Error(`Nenhum navegador Chrome/Chromium encontrado localmente para a plataforma ${platform}. Instale o Chrome para utilizar o prerender localmente.`);
  }

  console.log(`[Puppeteer] Executável encontrado em: ${executablePath}`);
  
  return {
    executablePath,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  };
}

async function startServer() {
  return new Promise((resolve, reject) => {
    const server = spawn(process.execPath, ['dist/server.cjs'], {
      cwd: projectRoot,
      env: { ...process.env, NODE_ENV: 'production', DATA_MODE: 'live', PORT: PORT.toString(), PRERENDER: 'true' },
    });

    let started = false;
    const startupTimer = setTimeout(() => {
      server.kill();
      reject(new Error('Temporary server did not start within 10 seconds'));
    }, 10000);

    server.stdout.on('data', (data) => {
      const msg = data.toString();
      if (!msg.includes('injected env')) {
         console.log(`[Server]: ${msg.trim()}`);
      }
      if (msg.includes('Server running on port')) {
        started = true;
        clearTimeout(startupTimer);
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      console.error(`[Server Error]: ${data.toString().trim()}`);
    });

    server.on('error', (err) => {
      clearTimeout(startupTimer);
      if (!started) reject(err);
    });

    server.on('exit', (code) => {
      clearTimeout(startupTimer);
      if (!started) reject(new Error(`Server exited before readiness with code ${code}`));
    });
  });
}

(async () => {
  let serverProcess;
  let browser;
  try {
    console.log(`\nStarting temporary server on port ${PORT}...`);
    serverProcess = await startServer();

    console.log('Resolvendo configuração do browser...');
    const browserConfig = await getBrowserConfig();

    console.log('Starting Puppeteer...');
    browser = await puppeteer.launch(browserConfig);
    const distDir = path.join(__dirname, '../dist');

    for (const route of ROUTES) {
      console.log(`Prerendering ${route}...`);
      const page = await browser.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(String(error)));
      try {
        page.on('console', msg => {
          if (msg.type() === 'error' && !msg.text().includes('favicon.ico')) {
            console.log(`[Prerender Browser Warning ${route}]:`, msg.text());
          }
        });

        const url = `http://localhost:${PORT}${route}`;
        const response = await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
        if (!response.ok()) {
          throw new Error(`Failed to load ${url}: Status ${response.status()}`);
        }

        if (route === '/404') {
          await page.waitForFunction(() => document.querySelector('meta[name="robots"]')?.content.includes('noindex'), { timeout: 10000 });
        } else {
          await page.waitForFunction(expected => document.querySelector('link[rel="canonical"]')?.href === expected, { timeout: 10000 }, `https://ressonanciaschumann.com${route}`);
        }
        if (pageErrors.length) throw new Error(`JavaScript errors on ${route}: ${pageErrors.join('; ')}`);

        const html = await page.evaluate(() => {
          return '<!doctype html>\n' + document.documentElement.outerHTML;
        });

        let fileName = route === '/' ? 'index.html' : `${route.substring(1)}.html`;
        const filePath = path.join(distDir, fileName);

        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, html);
        console.log(`✅ Saved ${fileName} (${(html.length / 1024).toFixed(2)} KB)`);
      } catch (error) {
        console.error('Prerender diagnostic:', JSON.stringify({
          route, url: page.url(), pageErrors,
          head: await page.evaluate(() => ({
            title: document.title,
            canonical: document.querySelector('link[rel="canonical"]')?.href,
            robots: document.querySelector('meta[name="robots"]')?.content,
          })),
        }));
        throw error;
      } finally {
        await page.close();
      }
    }

    console.log('🎉 Prerender completed successfully!');
  } catch (err) {
    console.error('\n❌ PRERENDER FAILED:', err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (serverProcess) {
       await new Promise(resolve => {
         if (serverProcess.exitCode !== null) return resolve();
         serverProcess.once('exit', resolve);
         serverProcess.kill();
       });
    }
  }
})();
