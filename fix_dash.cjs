const fs = require('fs');
let content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const oldCard = `<Card className="flex flex-col items-center justify-center py-8 text-center bg-surface-hover/20">
          <Activity className="w-8 h-8 text-violet mb-4 opacity-50" />
          <div className="text-4xl font-light text-text-main mb-1 tracking-tight">
            --
          </div>
          <div className="text-sm tracking-widest text-text-muted uppercase">Amplitude</div>
          <div className="text-[10px] text-text-muted mt-2">Amplitude física indisponível</div>
        </Card>`;

const newCard = `<Card className="flex flex-col items-center justify-center py-8 text-center bg-surface-hover/20 relative group">
          <Activity className="w-8 h-8 text-violet mb-4" />
          <div className="text-4xl font-light text-text-main mb-1 tracking-tight">
            {current?.relativeIntensity ? (
              <>{current.relativeIntensity.value.toFixed(1)} <span className="text-xl text-text-muted">/ 100</span></>
            ) : '--'}
          </div>
          <div className="text-sm tracking-widest text-text-muted uppercase">
            Intensidade Relativa
          </div>
          <div className="text-[10px] text-text-muted mt-2">
            Derivada da escala de cor &bull; Não calibrada em pT
          </div>
          <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-surface p-2 rounded text-xs border border-white/10 -bottom-8 w-64 z-10 pointer-events-none shadow-lg">
            Índice relativo extraído da escala visual do espectrograma. Não representa amplitude física calibrada.
          </div>
        </Card>`;

if (!content.includes('Intensidade Relativa')) {
    content = content.replace(oldCard, newCard);
    fs.writeFileSync('src/pages/Dashboard.tsx', content);
}
