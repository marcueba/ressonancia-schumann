const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const templates = [
  {
    name: 'og-image.jpg',
    title: 'RESSONÂNCIA SCHUMANN HOJE',
    subtitle: 'Dados • Espectrograma • Histórico • Contexto Geofísico',
    bg: '#0f172a'
  },
  {
    name: 'og-article-1.jpg',
    title: 'O QUE É A RESSONÂNCIA SCHUMANN?',
    subtitle: 'A física da cavidade Terra-ionosfera e das ondas eletromagnéticas',
    bg: '#0f172a'
  },
  {
    name: 'og-article-2.jpg',
    title: 'RESSONÂNCIA SCHUMANN HOJE: COMO INTERPRETAR',
    subtitle: 'F1, F2, F3 e o espectrograma eletromagnético',
    bg: '#0f172a'
  },
  {
    name: 'og-article-3.jpg',
    title: 'O BATIMENTO CARDÍACO DA TERRA',
    subtitle: 'Metáfora, física e Ressonância Schumann',
    bg: '#0f172a'
  }
];

const htmlTemplate = (title, subtitle, bg) => `
<!DOCTYPE html>
<html>
<head>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600&display=swap');
  body {
    margin: 0;
    padding: 0;
    width: 1200px;
    height: 630px;
    background-color: ${bg};
    background-image: radial-gradient(circle at top right, rgba(234, 179, 8, 0.1), transparent 40%),
                      radial-gradient(circle at bottom left, rgba(234, 179, 8, 0.05), transparent 40%);
    font-family: 'Inter', sans-serif;
    color: #f8fafc;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 80px;
    box-sizing: border-box;
    position: relative;
  }
  .brand {
    position: absolute;
    top: 60px;
    left: 80px;
    font-size: 18px;
    letter-spacing: 0.3em;
    color: #eab308;
    font-weight: 600;
  }
  .content {
    margin-top: 40px;
  }
  .title {
    font-size: 72px;
    font-weight: 300;
    line-height: 1.1;
    margin: 0 0 24px 0;
    max-width: 900px;
  }
  .subtitle {
    font-size: 32px;
    color: #94a3b8;
    font-weight: 300;
  }
  .footer {
    position: absolute;
    bottom: 60px;
    left: 80px;
    font-size: 24px;
    color: #64748b;
    font-weight: 300;
  }
  .deco {
    position: absolute;
    right: 80px;
    bottom: 60px;
    width: 300px;
    height: 100px;
    border-bottom: 2px solid #eab308;
    border-right: 2px solid #eab308;
    opacity: 0.3;
  }
</style>
</head>
<body>
  <div class="brand">OBSERVATÓRIO DA TERRA</div>
  <div class="content">
    <h1 class="title">${title}</h1>
    <div class="subtitle">${subtitle}</div>
  </div>
  <div class="footer">ressonanciaschumann.com</div>
  <div class="deco"></div>
</body>
</html>
`;

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });

  for (const t of templates) {
    const html = htmlTemplate(t.title, t.subtitle, t.bg);
    await page.setContent(html);
    const outPath = path.join(__dirname, '../public', t.name);
    await page.screenshot({ path: outPath, type: 'jpeg', quality: 90 });
    console.log('Saved', outPath);
  }

  await browser.close();
})();
