import { useSEO } from '../hooks/useSEO';
import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { EarthResonanceIndex } from '../types';

export function ERI() {
  useSEO({ title: "Índice ERI | Ressonância Schumann | Observatório da Terra", description: "Conheça o Índice ERI experimental e os dados geomagnéticos utilizados em sua composição no Observatório da Terra.", path: "/indice" });

  const [eriData, setEriData] = useState<EarthResonanceIndex | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dataProvider.getERI()
      .then(data => {
        if (data && typeof data.score === 'number') {
          setEriData(data);
        } else {
          setEriData(null);
        }
      })
      .catch((err) => {
        console.error(err);
        setEriData(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const getBucketIndex = (score: number) => {
    if (score <= 20) return 0;
    if (score <= 40) return 1;
    if (score <= 60) return 2;
    if (score <= 80) return 3;
    return 4;
  };

  const activeBucket = eriData ? getBucketIndex(eriData.score) : -1;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Earth Resonance Index (ERI)</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          O ERI é um indicador experimental desenvolvido por este observatório. Seu cálculo combina a atividade geomagnética (Kp) com parâmetros de atividade ELF quando uma fonte primária de dados está disponível. Na ausência de uma medição ELF primária conectada, o indicador utiliza apenas os dados geomagnéticos disponíveis, conforme a versão atual do algoritmo. Não é uma métrica acadêmica consolidada nem uma medida direta da intensidade da Ressonância de Schumann.
        </p>
      </div>

      <div className="bg-surface border border-border rounded-xl p-8 flex flex-col items-center justify-center text-center py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gold-muted blur-[100px] rounded-full opacity-20 pointer-events-none" />
        
        {isLoading ? (
          <div className="text-2xl font-light text-text-muted mb-4">Carregando...</div>
        ) : !eriData ? (
          <div className="text-2xl font-light text-rose-400 mb-4">Índice temporariamente indisponível</div>
        ) : (
          <>
            <div className="text-[120px] font-light leading-none text-gold tracking-tighter mb-4">
              {eriData.score}<span className="text-4xl text-text-muted">/100</span>
            </div>
            
            <div className="text-2xl font-light text-text-main tracking-widest uppercase mb-12">
              Atividade {eriData.status}
            </div>
          </>
        )}

        <div className="w-full max-w-2xl mt-4">
          <div className="flex justify-between text-xs text-text-muted mb-2 tracking-widest uppercase">
            <span>Muito Baixa (0)</span>
            <span>Muito Elevada (100)</span>
          </div>
          <div className="h-2 w-full bg-background rounded-full overflow-hidden flex">
            {[0, 1, 2, 3, 4].map(idx => (
              <div 
                key={idx} 
                className={`h-full w-[20%] ${activeBucket === idx ? 'bg-gold' : 'bg-border'}`} 
              />
            ))}
          </div>
          <div className="flex justify-between text-xs text-text-muted mt-2">
            <span className={`w-1/5 text-center ${activeBucket === 0 ? 'text-gold' : ''}`}>0-20</span>
            <span className={`w-1/5 text-center ${activeBucket === 1 ? 'text-gold' : ''}`}>21-40</span>
            <span className={`w-1/5 text-center ${activeBucket === 2 ? 'text-gold' : ''}`}>41-60</span>
            <span className={`w-1/5 text-center ${activeBucket === 3 ? 'text-gold' : ''}`}>61-80</span>
            <span className={`w-1/5 text-center ${activeBucket === 4 ? 'text-gold' : ''}`}>81-100</span>
          </div>
        </div>
      </div>
      
      <div className="bg-surface-hover/20 border border-border/50 rounded-lg p-6 mt-6">
        <p className="text-sm text-text-muted text-center italic">
          Os dados apresentados são observações de campos eletromagnéticos naturais. A plataforma não atribui automaticamente efeitos psicológicos, médicos ou espirituais às variações observadas.
        </p>
      </div>
    </div>
  );
}
