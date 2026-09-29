const fs = require('fs');
let text = fs.readFileSync('server.ts', 'utf8');

const importSearch = "import express from 'express';";
if (!text.includes("import fetch from 'node-fetch';")) {
  // node 18+ has native fetch, so we don't necessarily need node-fetch, but let's check what's available
}

const proxyEndpoint = `
  // Proxy para o Espectrograma de Tomsk (Evita CORB/CORS e Content-Type errado)
  app.get('/api/spectrogram/tomsk', async (req, res) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      
      const targetUrl = 'https://sos70.ru/provider.php?file=shm.jpg';
      
      const response = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeout);
      
      if (!response.ok) {
        return res.status(response.status).send('Erro ao buscar espectrograma externo');
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutos cache
      res.send(buffer);
    } catch (error) {
      console.error('[Spectrogram Proxy] Error:', error);
      res.status(500).send('Espectrograma indisponível no momento');
    }
  });
`;

text = text.replace('// Inicia servidor', proxyEndpoint + '\n  // Inicia servidor');

fs.writeFileSync('server.ts', text);
