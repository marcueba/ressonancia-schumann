import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';

export function ERI() {
  useSEO({ title: "Earth Resonance Index (ERI) | Ressonância Schumann", description: "O Earth Resonance Index é um indicador estatístico experimental em desenvolvimento para avaliar desvios da Ressonância Schumann.", path: "/indice" });

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Earth Resonance Index (ERI)</h1>
        <div className="text-lg font-light text-gold tracking-widest uppercase mb-4">Em desenvolvimento</div>
        <p className="text-text-muted max-w-3xl leading-relaxed mb-6">
          O Earth Resonance Index está em desenvolvimento ativo por este observatório.
        </p>
        <p className="text-text-muted max-w-3xl leading-relaxed mb-6">
          A proposta futura é utilizar um histórico observacional denso e suficiente para avaliar estatisticamente os desvios físicos das frequências de ressonância da cavidade ionosférica (Z-score do desvio observacional). 
        </p>
        <p className="text-text-muted max-w-3xl leading-relaxed mb-6">
          O índice não está ativo neste momento enquanto a base observacional de telemetria bruta não atingir a densidade e a cobertura adequadas para fornecer validação matemática rigorosa. Não utilizaremos fórmulas provisórias que misturem dados de origens indiretas ou valores arbitrários.
        </p>
      </div>
      <div className="text-center mt-8">
        <Link to="/metodologia" className="text-gold hover:text-gold-muted text-sm uppercase tracking-widest">→ Leia a Metodologia</Link>
      </div>
      <div className="bg-surface-hover/20 border border-border/50 rounded-lg p-6 mt-6">
        <p className="text-sm text-text-muted text-center italic">
          Os dados apresentados são observações de campos eletromagnéticos naturais. A plataforma não atribui automaticamente efeitos biológicos, psicológicos ou espirituais a nenhuma métrica isolada.
        </p>
      </div>
    </div>
  );
}
