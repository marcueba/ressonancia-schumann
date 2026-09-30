const fs = require('fs');

// 1. JSON-LD fallback
let useSeoPath = 'src/hooks/useSEO.ts';
let seoContent = fs.readFileSync(useSeoPath, 'utf8');
seoContent = seoContent.replace('"datePublished": articleDate || new Date().toISOString(),', '...(articleDate ? { "datePublished": articleDate, "dateModified": articleDate } : {}),');
seoContent = seoContent.replace('"dateModified": articleDate || new Date().toISOString(),', '');
fs.writeFileSync(useSeoPath, seoContent);

// 2. Sitemap
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://ressonanciaschumann.com/</loc></url>
  <url><loc>https://ressonanciaschumann.com/atual</loc></url>
  <url><loc>https://ressonanciaschumann.com/historico</loc></url>
  <url><loc>https://ressonanciaschumann.com/estacoes</loc></url>
  <url><loc>https://ressonanciaschumann.com/indice</loc></url>
  <url><loc>https://ressonanciaschumann.com/geomagnetica</loc></url>
  <url><loc>https://ressonanciaschumann.com/solar</loc></url>
  <url><loc>https://ressonanciaschumann.com/metodologia</loc></url>
  <url><loc>https://ressonanciaschumann.com/artigos</loc></url>
  <url><loc>https://ressonanciaschumann.com/artigos/o-que-e-ressonancia-schumann</loc></url>
</urlset>`;
fs.writeFileSync('public/sitemap.xml', sitemap);

// 3 and 4. Article revision and internal links
let articlePath = 'src/pages/ArticleSchumann.tsx';
let articleContent = fs.readFileSync(articlePath, 'utf8');

// Replace batimento cardíaco
articleContent = articleContent.replace(
  'Frequentemente chamada de "o batimento cardíaco da Terra", a Ressonância Schumann é um conjunto de picos',
  'Popularmente conhecida pelo apelido não científico de "o batimento cardíaco da Terra", a Ressonância Schumann é fundamentalmente um conjunto de picos'
);

// Weaken causality
articleContent = articleContent.replace(
  'alteram ligeiramente o "tamanho" efetivo da cavidade, mudando a sintonia da ressonância.',
  'podem alterar as propriedades efetivas da cavidade, o que pode contribuir para flutuações e mudanças sutis na sintonia da ressonância observada pelas estações.'
);

articleContent = articleContent.replace(
  'Devido a uma tempestade elétrica massiva ou a um distúrbio ionosférico.',
  'Pode estar associado a uma tempestade elétrica massiva, um transiente local, ou ruídos não filtrados pela estação. É sempre necessário considerar a calibração e a metodologia do observatório, já que a colorização do espectrograma não equivale automaticamente à amplitude eletromagnética física rigorosamente calibrada.'
);

articleContent = articleContent.replace(
  'Raias verticais brilhantes representam rajadas de "ruído" eletromagnético de banda larga, causadas por tempestades elétricas intensas locais ou globais.',
  'Raias verticais luminosas frequentemente mostram o espectrograma com maior intensidade visual naquela região, o que pode estar associado a rajadas de ruído eletromagnético de banda larga, causadas por atividade elétrica local ou perturbações transitórias.'
);

articleContent = articleContent.replace(
  'alterar a espessura e a densidade da "parede" superior da cavidade, a atividade solar pode causar pequenas flutuações nas frequências e, principalmente, absorver ou refletir as ondas, alterando o que é medido no solo.',
  'alterar propriedades da "parede" superior da cavidade, o que sugere que a atividade solar pode contribuir indiretamente para pequenas flutuações, alterando ocasionalmente a reflexão ou absorção das ondas medidas no solo.'
);

// Add links at the bottom
const linksHtml = `
        <hr className="border-border my-10" />

        <div className="bg-surface-hover/20 rounded-xl p-6 border border-border">
          <h2 className="text-xl text-text-main font-medium mb-4 mt-0">Explore o Observatório</h2>
          <ul className="space-y-3 m-0 pl-0 list-none">
            <li><Link to="/atual" className="text-gold hover:text-gold-muted uppercase tracking-widest text-sm">→ Dados Atuais da Ressonância</Link></li>
            <li><Link to="/historico" className="text-gold hover:text-gold-muted uppercase tracking-widest text-sm">→ Histórico F1, F2 e F3</Link></li>
            <li><Link to="/metodologia" className="text-gold hover:text-gold-muted uppercase tracking-widest text-sm">→ Como Coletamos e Lemos os Dados (Metodologia)</Link></li>
          </ul>
        </div>
      </article>
`;
articleContent = articleContent.replace('</article>', linksHtml);

fs.writeFileSync(articlePath, articleContent);

console.log("Patches applied.");
