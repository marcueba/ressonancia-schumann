const fs = require('fs');

const content = `import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';

export function Articles() {
  useSEO({ 
    title: "Artigos sobre Ressonância Schumann | Aprenda a Ciência", 
    description: "Hub de conhecimento do Observatório da Terra. Aprenda o que é a Ressonância Schumann, como funcionam as frequências da Terra, F1, espectrogramas e geomagnetismo.", 
    path: "/artigos" 
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Artigos e Educação</h1>
        <p className="text-text-muted leading-relaxed">
          Bem-vindo ao hub de conhecimento científico do Observatório. Aqui publicamos artigos baseados em evidências geofísicas para ajudar a interpretar os dados de ressonância e atividade solar.
        </p>
      </div>

      <div className="grid gap-6">
        <Link to="/artigos/ressonancia-schumann-hoje" className="block bg-surface border border-border hover:border-gold/50 rounded-xl p-6 transition-colors">
          <div className="text-xs text-gold tracking-widest uppercase mb-2">Análise de Dados</div>
          <h2 className="text-xl text-text-main font-medium mb-3">Ressonância Schumann hoje: como interpretar os dados</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-4">
            Aprenda a ler corretamente os valores do observatório. Descubra a diferença entre frequência (Hertz) e intensidade (amplitude) em um espectrograma Schumann.
          </p>
          <div className="text-xs text-text-muted flex items-center gap-4">
            <span>Leitura: 5 min</span>
          </div>
        </Link>

        <Link to="/artigos/o-que-e-ressonancia-schumann" className="block bg-surface border border-border hover:border-gold/50 rounded-xl p-6 transition-colors">
          <div className="text-xs text-gold tracking-widest uppercase mb-2">Fundamentos</div>
          <h2 className="text-xl text-text-main font-medium mb-3">O que é a Ressonância Schumann?</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-4">
            Entenda a definição científica do fenômeno. Como os raios geram pulsos eletromagnéticos globais na cavidade Terra-ionosfera.
          </p>
          <div className="text-xs text-text-muted flex items-center gap-4">
            <span>Leitura: 5 min</span>
          </div>
        </Link>

        <Link to="/artigos/batimento-cardiaco-da-terra" className="block bg-surface border border-border hover:border-gold/50 rounded-xl p-6 transition-colors">
          <div className="text-xs text-gold tracking-widest uppercase mb-2">Cultura e Ciência</div>
          <h2 className="text-xl text-text-main font-medium mb-3">Por que a Ressonância Schumann é chamada de “batimento cardíaco da Terra”?</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-4">
            Onde a poesia se encontra com a física. Entenda o que existe de real na comparação entre 7,83 Hz e o cérebro, e onde a metáfora encontra seus limites.
          </p>
          <div className="text-xs text-text-muted flex items-center gap-4">
            <span>Leitura: 6 min</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/pages/Articles.tsx', content);
