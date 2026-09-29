const fs = require('fs');
let text = fs.readFileSync('src/pages/Methodology.tsx', 'utf8');

const search = "<li><strong>Dados Derivados:</strong> As frequências exibidas resultam do processamento computacional da imagem de um espectrograma em vez de processamento matemático de uma série temporal ELF bruta.</li>";
const replace = `<li><strong>Dados Derivados:</strong> As frequências exibidas resultam do processamento computacional da imagem de um espectrograma em vez de processamento matemático de uma série temporal ELF bruta.</li>
            <li><strong>Apresentação do Espectrograma:</strong> A imagem do espectrograma exibida na aplicação é apresentada apenas como <em>referência visual da fonte de origem</em>. Nosso observatório <strong>não converte suas cores em amplitude física, "energia" ou "poder" (Power Index)</strong>, mantendo assim um rigor conservador que evita interpretações pseudo-científicas das anomalias de cor.</li>`;

text = text.replace(search, replace);
fs.writeFileSync('src/pages/Methodology.tsx', text);
