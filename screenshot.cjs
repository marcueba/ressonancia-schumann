const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set viewport for desktop
  await page.setViewport({ width: 1280, height: 1024 });
  
  console.log('Navegando para https://ressonanciaschumann.com/');
  await page.goto('https://ressonanciaschumann.com/', { waitUntil: 'networkidle2' });
  
  // Wait a bit just to be sure animations finish and spectrogram loads
  await new Promise(r => setTimeout(r, 3000));
  
  const dest = '/Users/marcuscosta/.gemini/antigravity/brain/3e9b0c95-38be-4a5c-bfb6-82e934485984/scratch/dashboard_final.png';
  await page.screenshot({ path: dest, fullPage: true });
  console.log('Screenshot salvo em:', dest);
  
  await browser.close();
})();
