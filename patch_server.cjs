const fs = require('fs');
let text = fs.readFileSync('server.ts', 'utf8');

const oldProxy = `      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      res.set('Content-Type', 'image/jpeg');`;
      
const newProxy = `      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Validação de segurança: verificar assinatura JPEG (Magic Bytes: FF D8 FF)
      if (buffer.length < 3 || buffer[0] !== 0xFF || buffer[1] !== 0xD8 || buffer[2] !== 0xFF) {
        console.error('[Spectrogram Proxy] Resposta upstream não é um JPEG válido.');
        return res.status(502).send('Resposta inválida do servidor de origem');
      }
      
      res.set('Content-Type', 'image/jpeg');`;

text = text.replace(oldProxy, newProxy);
fs.writeFileSync('server.ts', text);
