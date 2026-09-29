const fs = require('fs');
let text = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const oldCard = `<Card className="flex flex-col items-center justify-center py-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gold/40" />
          <Globe2 className="w-8 h-8 text-gold mb-4" />
          <div className="text-2xl font-light text-text-main mb-1 tracking-tight">
            Em desenvolvimento
          </div>
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Earth Resonance Index</div>
          <div className="px-3 py-1 rounded-full text-xs font-medium border bg-gold/10 text-gold border-gold/20">
            ÍNDICE EXPERIMENTAL
          </div>
        </Card>`;

const newCard = `<Link to="/indice" className="block">
        <Card className="flex flex-col items-center justify-center py-8 text-center relative overflow-hidden hover:bg-surface-hover/30 transition-colors h-full">
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
        </Link>`;

if (!text.includes('<Link to="/indice"')) {
  text = text.replace(oldCard, newCard);
  // Garante que o Link está importado
  if (!text.includes("import { Link } from 'react-router-dom';")) {
    text = "import { Link } from 'react-router-dom';\n" + text;
  }
  fs.writeFileSync('src/pages/Dashboard.tsx', text);
}
