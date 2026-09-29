const fs = require('fs');
let content = fs.readFileSync('src/pages/Methodology.tsx', 'utf8');

const anchor = `<h3 className="text-xl font-medium text-text-main mt-6 mb-4">6. Limitações Conhecidas</h3>`;

const injection = `<h3 className="text-xl font-medium text-text-main mt-6 mb-4">6. Intensidade Relativa vs Amplitude Física</h3>
            <p className="text-text-muted mb-4">
              A <strong>Intensidade Relativa</strong> exibida neste observatório é derivada unicamente da escala visual do espectrograma utilizado pela fonte secundária (0 a 100). Ela <strong>não possui calibração conhecida para unidades físicas</strong> de campo eletromagnético.
            </p>
            <ul className="list-disc pl-6 text-text-muted space-y-2 mb-6">
              <li>Não pode ser convertida diretamente em picotesla (pT).</li>
              <li>Não deve ser comparada como amplitude absoluta entre instrumentos ou estações diferentes.</li>
              <li>Não constitui uma medição física independente realizada pelo nosso Observatório.</li>
            </ul>

            <h3 className="text-xl font-medium text-text-main mt-6 mb-4">7. Limitações Conhecidas</h3>`;

if (!content.includes('Intensidade Relativa vs Amplitude Física')) {
    content = content.replace(anchor, injection);
    fs.writeFileSync('src/pages/Methodology.tsx', content);
}
