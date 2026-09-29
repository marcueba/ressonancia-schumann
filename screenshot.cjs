const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: "new" });
  const page = await browser.newPage();
  await page.goto('https://ressonanciaschumann.com', { waitUntil: 'networkidle0' });
  await page.setViewport({ width: 1200, height: 800 });
  await page.screenshot({ path: 'dashboard.png' });
  await browser.close();
})();
