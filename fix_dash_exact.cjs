const fs = require('fs');
let text = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Title Status
const statusOld = `Status: Fonte ELF primária não conectada`;
const statusNew = `{current ? 'Status: Observações derivadas disponíveis' : 'Status: Fonte ELF primária não conectada'}`;
text = text.replace(statusOld, statusNew);

// P Tag
const pOld = `<p className="text-lg text-text-muted font-light tracking-wide max-w-4xl mx-auto">
          O sistema está operacional, mas as observações eletromagnéticas ELF primárias ainda não estão conectadas. Os dados geomagnéticos, solares e contextuais apresentados possuem suas respectivas fontes identificadas.
        </p>`;
const pNew = `<p className="text-lg text-text-muted font-light tracking-wide max-w-4xl mx-auto">
          O sistema está operacional. {current ? 'Fonte ELF primária direta ainda não conectada.' : 'Observações eletromagnéticas ELF primárias ainda não estão conectadas.'} Os dados geomagnéticos, solares e contextuais apresentados possuem suas respectivas fontes identificadas.
        </p>`;
text = text.replace(pOld, pNew);

// Cards
const regex = /<div className="grid grid-cols-1 md:grid-cols-3 gap-6">[\s\S]*?<\/div>\s*<div className="mt-8 mb-8">/g;
let match = text.match(regex);
if (match) {
  const replacement = `<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <Card className="flex flex-col items-center justify-center py-8 text-center bg-surface-hover/20" title="Amplitude física indisponível">
          <Activity className="w-8 h-8 text-violet mb-4 opacity-50" />
          <div className="text-4xl font-light text-text-main mb-1 tracking-tight">
            --
          </div>
          <div className="text-sm tracking-widest text-text-muted uppercase">Amplitude</div>
          <div className="text-[10px] text-text-muted mt-2">Amplitude física indisponível</div>
        </Card>
      </div>

      <div className="mt-8 mb-8">`;
  text = text.replace(regex, replacement);
}

fs.writeFileSync('src/pages/Dashboard.tsx', text);
