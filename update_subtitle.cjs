const fs = require('fs');
let text = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const pOld = `<p className="text-lg text-text-muted font-light tracking-wide max-w-4xl mx-auto">
          O sistema está operacional. {current ? 'Fonte ELF primária direta ainda não conectada, exibindo medições derivadas de espectrograma.' : 'Observações eletromagnéticas ELF primárias ainda não estão conectadas.'}
        </p>`;
        
const pNew = `<p className="text-lg text-text-muted font-light tracking-wide max-w-4xl mx-auto">
          O sistema está operacional. {current ? 'Fonte ELF primária direta ainda não conectada.' : 'Observações eletromagnéticas ELF primárias ainda não estão conectadas.'} Os dados geomagnéticos, solares e contextuais apresentados possuem suas respectivas fontes identificadas.
        </p>`;

text = text.replace(pOld, pNew);
fs.writeFileSync('src/pages/Dashboard.tsx', text);
