const fs = require('fs');
let text = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const importRegex = /import \{ Activity, Globe2, Radio \} from 'lucide-react';/;
if (!text.match(importRegex)) {
  text = text.replace(/import \{ Activity, Radio \} from 'lucide-react';/, "import { Activity, Globe2, Radio } from 'lucide-react';");
}

const cardsRegex = /<div className="grid grid-cols-1 md:grid-cols-2 gap-6">([\s\S]*?)<\/div>\s*<div className="mt-8 mb-8">/;
const newCards = `<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center justify-center py-8 text-center bg-surface-hover/50 border-primary/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-primary/40" />
          <Radio className="w-8 h-8 text-primary mb-4 opacity-50" />
          <div className="text-4xl font-light text-text-main mb-1 tracking-tight">
            {current?.fundamental?.frequency ? current.fundamental.frequency.toFixed(2) : '--'} <span className="text-xl text-text-muted">Hz</span>
          </div>
          <div className="text-sm tracking-widest text-text-muted uppercase">
            {current ? 'F1 — FREQUÊNCIA DERIVADA' : 'Frequência Fundamental'}
          </div>
          {current && (
            <div className="text-[10px] text-text-muted mt-2">Dado derivado de espectrograma</div>
          )}
        </Card>

        <Card className="flex flex-col items-center justify-center py-8 text-center bg-surface-hover/20">
          <Activity className="w-8 h-8 text-violet mb-4 opacity-50" />
          <div className="text-4xl font-light text-text-main mb-1 tracking-tight">
            --
          </div>
          <div className="text-sm tracking-widest text-text-muted uppercase">Amplitude</div>
          <div className="text-[10px] text-text-muted mt-2">Amplitude física indisponível</div>
        </Card>

        <Card className="flex flex-col items-center justify-center py-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gold/40" />
          <Globe2 className="w-8 h-8 text-gold mb-4" />
          <div className="text-2xl font-light text-text-main mb-1 tracking-tight">
            Em desenvolvimento
          </div>
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Earth Resonance Index</div>
          <div className="px-3 py-1 rounded-full text-xs font-medium border bg-gold/10 text-gold border-gold/20">
            ÍNDICE EXPERIMENTAL
          </div>
        </Card>
      </div>

      <div className="mt-8 mb-8">`;
      
text = text.replace(cardsRegex, newCards);
fs.writeFileSync('src/pages/Dashboard.tsx', text);
