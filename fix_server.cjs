const fs = require('fs');
let text = fs.readFileSync('server.ts', 'utf8');

const proxyEndpoint = `
  // Proxy para o Espectrograma de Tomsk
  app.get('/api/spectrogram/tomsk', async (req, res) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      
      const targetUrl = 'https://sos70.ru/provider.php?file=shm.jpg';
      const response = await fetch(targetUrl, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SchumannObservatory/1.1; +https://ressonanciaschumann.com)',
          'Accept': 'image/jpeg,image/*;q=0.8'
        }
      });
      clearTimeout(timeout);
      
      if (!response.ok) {
        return res.status(response.status).send('Erro ao buscar espectrograma externo');
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Magic bytes check (FF D8 FF)
      if (buffer.length < 3 || buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
        console.error('[Spectrogram Proxy] Resposta upstream não é um JPEG válido.');
        return res.status(502).send('Resposta inválida do servidor de origem');
      }
      
      res.set('Content-Type', 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutos cache
      res.send(buffer);
    } catch (error) {
      console.error('[Spectrogram Proxy] Error:', error);
      res.status(500).send('Espectrograma indisponível no momento');
    }
  });
`;

if (!text.includes('/api/spectrogram/tomsk')) {
  text = text.replace('  // Inicia servidor', proxyEndpoint + '\n  // Inicia servidor');
  fs.writeFileSync('server.ts', text);
}
