import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';

export function ArticleSchumann() {
  useSEO({ 
    title: "O que é a Ressonância Schumann? | Frequência da Terra 7,83 Hz", 
    description: "Aprenda a definição científica da Ressonância Schumann. O que significa 7,83 Hz, como os raios criam ondas ELF na cavidade Terra-ionosfera e o que mostram os dados.", 
    path: "/artigos/o-que-e-ressonancia-schumann",
    isArticle: true,
    articleDate: "2026-09-29T12:00:00Z"
  });

  return (
    <div className="animate-in fade-in duration-700 max-w-3xl mx-auto pb-12">
      <Link to="/artigos" className="text-gold hover:text-gold-muted text-sm tracking-widest uppercase mb-8 inline-block">
        ← Voltar para Artigos
      </Link>

      <article className="prose prose-invert prose-p:text-text-muted prose-headings:text-text-main prose-a:text-gold hover:prose-a:text-gold-muted max-w-none">
        <h1 className="text-4xl font-light mb-6">O que é a Ressonância Schumann?</h1>
        
        <p className="lead text-xl text-text-main/80 mb-8">
          Frequentemente chamada de "o batimento cardíaco da Terra", a Ressonância Schumann é um conjunto de picos no espectro de frequência extremamente baixa (ELF) do campo eletromagnético da Terra.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">Como a Ressonância Schumann é gerada?</h2>
        <p>
          A qualquer momento, ocorrem cerca de 2.000 tempestades elétricas em todo o mundo, produzindo aproximadamente 50 relâmpagos por segundo. Cada descarga de raio emite pulsos eletromagnéticos.
        </p>
        <p>
          O espaço entre a superfície da Terra e a ionosfera (uma camada de partículas carregadas a cerca de 60 a 100 km de altitude) atua como um guia de ondas esférico fechado. As ondas eletromagnéticas geradas pelos raios viajam ao redor do globo dentro dessa cavidade. Quando essas ondas se combinam em fase, elas entram em ressonância.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">A Frequência Fundamental (7,83 Hz) e os Modos F1, F2 e F3</h2>
        <p>
          As dimensões da Terra determinam as frequências que ressoam nessa cavidade. O primeiro modo, ou frequência fundamental (frequentemente rotulado como <strong>F1</strong>), ocorre a aproximadamente <strong>7,83 Hz</strong>.
        </p>
        <p>
          No entanto, não existe apenas uma frequência. Os harmônicos superiores (modos subsequentes) ocorrem em intervalos aproximados de 6.5 Hz. Os mais comuns monitorados por observatórios são:
        </p>
        <ul>
          <li><strong>F1:</strong> ~7,83 Hz</li>
          <li><strong>F2:</strong> ~14,1 Hz</li>
          <li><strong>F3:</strong> ~20,3 Hz</li>
        </ul>

        <h2 className="text-2xl font-light mt-10 mb-4">Por que a frequência varia? A frequência da Terra está aumentando?</h2>
        <p>
          Ao contrário de alguns mitos populares, a frequência fundamental da Terra <strong>não</strong> está aumentando drasticamente de 7,83 Hz para 30 ou 40 Hz.
        </p>
        <p>
          As variações observadas (normalmente oscilando em décimos de Hertz, como 7.7 Hz ou 8.0 Hz) são causadas por mudanças físicas na cavidade Terra-ionosfera. Ciclos de dia/noite, mudanças nas estações, intensidade da atividade global de tempestades elétricas e flutuações na ionosfera devido à atividade solar (vento solar e raios X) alteram ligeiramente o "tamanho" efetivo da cavidade, mudando a sintonia da ressonância.
        </p>
        
        <h2 className="text-2xl font-light mt-10 mb-4">Frequência versus Intensidade (Amplitude)</h2>
        <p>
          Quando as pessoas dizem que "a Ressonância Schumann teve um pico", elas normalmente estão olhando para um espectrograma e vendo um clarão brilhante (geralmente branco ou verde na escala de cor).
        </p>
        <p>
          Isso não significa que a <em>frequência</em> (7,83 Hz) subiu para 40 Hz. Significa que a <strong>intensidade</strong> (ou potência) da onda eletromagnética aumentou. A frequência continua sendo 7,83 Hz, mas a energia daquele modo ressonante ficou temporariamente muito mais forte devido a uma tempestade elétrica massiva ou a um distúrbio ionosférico.
        </p>

        <hr className="border-border my-10" />

        <h2 className="text-2xl font-light mb-6">Perguntas Frequentes (FAQ)</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg text-text-main font-medium mb-2">A Ressonância Schumann afeta o corpo humano?</h3>
            <p className="text-sm">
              Embora a frequência de 7,83 Hz coincida com o limite inferior das ondas cerebrais Alpha no EEG humano, não existe consenso científico sólido ou evidência conclusiva de que picos na Ressonância Schumann causem diretamente sintomas físicos ou alterações de humor em humanos. Os campos ELF gerados são extremamente fracos (medidos em picoteslas), bilhões de vezes mais fracos que o campo magnético estático da Terra.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-text-main font-medium mb-2">O que mostra um espectrograma Schumann?</h3>
            <p className="text-sm">
              Um espectrograma é um gráfico visual onde o eixo horizontal é o tempo, o eixo vertical é a frequência (geralmente 0 a 40 Hz) e a cor representa a intensidade da onda. As linhas horizontais brilhantes constantes mostram os modos de ressonância (F1, F2, F3). Raias verticais brilhantes representam rajadas de "ruído" eletromagnético de banda larga, causadas por tempestades elétricas intensas locais ou globais.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-text-main font-medium mb-2">A atividade solar altera a Ressonância Schumann?</h3>
            <p className="text-sm">
              Indiretamente, sim. Erupções solares (Raios X) e tempestades geomagnéticas (vento solar) ionizam a atmosfera superior da Terra (ionosfera). Ao alterar a espessura e a densidade da "parede" superior da cavidade, a atividade solar pode causar pequenas flutuações nas frequências e, principalmente, absorver ou refletir as ondas, alterando o que é medido no solo.
            </p>
          </div>
        </div>

      </article>
    </div>
  );
}
