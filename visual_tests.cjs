const puppeteer = require('puppeteer-core');

async function runTests() {
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  });
  const viewports = [
    { width: 1440, height: 900 },
    { width: 768, height: 1024 },
    { width: 390, height: 844 },
    { width: 375, height: 812 }
  ];
  
  const routes = ['/', '/atual', '/historico', '/estacoes', '/indice', '/geomagnetica', '/solar', '/metodologia', '/404'];
  
  for (const v of viewports) {
    console.log(`\n=== Testing Viewport ${v.width}x${v.height} ===`);
    let pageErrors = 0, consoleErrors = 0, requestFailures = 0, horizontalOverflow = 0;
    
    const page = await browser.newPage();
    await page.setViewport(v);
    
    page.on('pageerror', err => { pageErrors++; });
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors++;
    });
    page.on('requestfailed', request => {
      requestFailures++;
    });

    for (const route of routes) {
      try {
        await page.goto(`http://localhost:8999${route}`, { waitUntil: 'networkidle0', timeout: 5000 });
        const width = await page.evaluate(() => document.documentElement.scrollWidth);
        if (width > v.width) horizontalOverflow++;
      } catch (e) {
      }
    }
    console.log(`pageErrors: ${pageErrors}`);
    console.log(`consoleErrors: ${consoleErrors}`);
    console.log(`requestFailures: ${requestFailures}`);
    console.log(`horizontalOverflow: ${horizontalOverflow}`);
    await page.close();
  }
  
  await browser.close();
}

runTests().catch(console.error);
