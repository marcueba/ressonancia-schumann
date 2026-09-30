import { useSEO } from '../hooks/useSEO';
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
        <Link to="/artigos/o-que-e-ressonancia-schumann" className="block bg-surface border border-border hover:border-gold/50 rounded-xl p-6 transition-colors">
          <div className="text-xs text-gold tracking-widest uppercase mb-2">Fundamentos</div>
          <h2 className="text-xl text-text-main font-medium mb-3">O que é a Ressonância Schumann?</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-4">
            Entenda a definição científica da "frequência da Terra" (7,83 Hz), como os raios geram esse fenômeno eletromagnético global e por que as frequências F1, F2 e F3 variam.
          </p>
          <div className="text-xs text-text-muted flex items-center gap-4">
            <span>Leitura: 5 min</span>
          </div>
        </Link>
      </div>
    </div>
  );
}
