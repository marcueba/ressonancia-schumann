import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';

export function ArticleHeartbeat() {
  useSEO({ 
    title: "Batimento Cardíaco da Terra: O que é a Ressonância Schumann?", 
    description: "Entenda por que a Ressonância Schumann é chamada de “batimento cardíaco da Terra”, o que existe de científico nessa comparação e onde a metáfora encontra seus limites.", 
    path: "/artigos/batimento-cardiaco-da-terra",
    isArticle: true,
    articleDate: "2026-09-29T14:00:00Z"
  });

  return (
    <div className="animate-in fade-in duration-700 max-w-3xl mx-auto pb-12">
      <Link to="/artigos" className="text-gold hover:text-gold-muted text-sm tracking-widest uppercase mb-8 inline-block">
        ← Voltar para Artigos
      </Link>

      <article className="prose prose-invert prose-p:text-text-muted prose-headings:text-text-main prose-a:text-gold hover:prose-a:text-gold-muted max-w-none">
        <h1 className="text-4xl font-light mb-6">Por que a Ressonância Schumann é chamada de “batimento cardíaco da Terra”?</h1>
        
        <p className="lead text-xl text-text-main/80 mb-8">
          A expressão "batimento cardíaco da Terra" popularizou-se na internet e na cultura pop como um apelido para a Ressonância Schumann. Onde a poesia se encontra com a física, e quais são os limites dessa comparação?
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">1. Por que "batimento cardíaco da Terra"?</h2>
        <p>
          A expressão funciona como uma bela metáfora popular para descrever um fenômeno eletromagnético global e persistente. Da mesma forma que o pulso biológico demonstra que estamos vivos, a cavidade da Terra apresenta frequências constantes originadas nas descargas atmosféricas.
        </p>
        <p>
          Contudo, a Terra não possui literalmente um "coração eletromagnético" pulsando ativamente a 7,83 Hz. O fenômeno origina-se do aprisionamento de ondas eletromagnéticas produzidas por tempestades elétricas.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">2. De onde vem 7,83 Hz?</h2>
        <p>
          As dimensões globais da cavidade formada pela superfície do planeta e a sua ionosfera (cerca de 100 km de altura) atuam como uma câmara de ressonância natural. A primeira frequência harmônica que cabe e ressoa perfeitamente nessa cavidade geométrica ocorre em aproximadamente <strong>7,83 Hz</strong>. Novamente, essa não é uma constante absoluta geométrica que define o planeta com um único número imutável, mas a base de uma sintonia eletromagnética gerada predominantemente por raios.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">3. A Terra realmente "pulsa"?</h2>
        <p>
          Um coração possui contrações biológicas ativas e periódicas destinadas a bombear sangue. A Ressonância Schumann, no entanto, é um fenômeno <em>passivo</em> de cavidade ressonante, excitado por eventos ambientais locais (tempestades). Assim sendo, o planeta possui sim uma atividade eletromagnética natural mensurável constante, porém <strong>ressonância não é batimento biológico</strong>.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">4. Por que a comparação ficou tão popular?</h2>
        <p>
          É extremamente intuitivo fazer essa conexão humana com a natureza. A Ressonância Schumann é um fenômeno de escala planetária; é contínua, sempre presente (desde o surgimento da ionosfera e tempestades de raios na Terra Antiga), e se manifesta em frequências baixas que culturalmente e intuitivamente assemelham-se a um "ritmo" ou "pulso" da vida natural.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">5. A relação com ondas cerebrais</h2>
        <p>
          A frequência fundamental ~7,8 Hz situa-se numericamente na fronteira mais baixa da faixa de ondas cerebrais humanas Alpha (que geralmente compreende 8 a 12 Hz) e no topo das ondas Theta. 
        </p>
        <p>
          Embora seja fascinante notar que organismos biológicos na Terra evoluíram imersos neste fundo eletromagnético natural, é preciso ter cautela científica. <strong>Coincidência ou proximidade numérica em frequência não demonstra que o cérebro está sincronizado em fase biológica com a Terra</strong>. Não existe até o momento evidência rigorosa de que o cérebro humano entra ativamente em ressonância física com o planeta devido à semelhança da métrica de Hertz.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">6. Existe relação com saúde e emoções?</h2>
        <p>
          Esse é o ponto que exige maior rigor para separar <em>hipóteses ou estudos exploratórios isolados</em> de <em>fatos físicos estabelecidos</em>.
        </p>
        <p>
          A ciência atualmente não atesta que:
        </p>
        <ul>
          <li>Picos de intensidade na Ressonância causem diretamente insônia.</li>
          <li>A Ressonância cause ansiedade ou curas corporais automáticas.</li>
          <li>7,83 Hz controle a consciência humana.</li>
        </ul>
        <p>
          Os campos eletromagnéticos ELF da Ressonância Schumann que chegam ao nível da nossa pele são incrivelmente débeis — medidos na escala de picoteslas (pT) —, sendo bilhões de vezes mais fracos que o campo magnético estático que envolve a própria Terra ou os sinais de geladeiras e redes de Wi-Fi domésticas.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">7. Então é errado dizer "batimento cardíaco da Terra"?</h2>
        <p>
          Depende. Como metáfora popular de conexão da humanidade com sua biosfera, é uma expressão altamente compreensível, evocativa e poética.
        </p>
        <p>
          Como descrição científica literal em um laboratório ou artigo de geofísica, a expressão é simplesmente inadequada. 
        </p>
        <p className="text-xl font-medium text-gold/90 my-8 italic border-l-4 border-gold pl-4">
          "A poesia pode chamar de batimento. A física observa como ressonância eletromagnética excitada por raios na cavidade Terra-ionosfera."
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">8. Como a ciência realmente observa esse fenômeno?</h2>
        <p>
          No mundo real, geofísicos utilizam grandes estações com antenas imensas e magnetômetros supersensíveis enterrados no solo para fugir da interferência eletromagnética humana. Lá, eles acompanham os modos ressonantes F1, F2 e F3, processando o espectro eletromagnético por Fourier para desenhar gráficos chamados espectrogramas, permitindo entender o clima global através das variações e absorção na ionosfera. (Saiba mais na nossa <Link to="/metodologia">Metodologia</Link>).
        </p>

        <hr className="border-border my-10" />

        <h2 className="text-2xl font-light mb-6">Perguntas Frequentes (FAQ)</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg text-text-main font-medium mb-2">A Terra tem uma frequência?</h3>
            <p className="text-sm">
              Não existe um número fixo e mágico, mas um espectro de ressonâncias de cavidade (F1, F2, F3). A mais proeminente gira em torno de 7,8 Hz.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-text-main font-medium mb-2">7,83 Hz é o batimento cardíaco da Terra?</h3>
            <p className="text-sm">
              É uma metáfora. 7,83 Hz é o pico aproximado da frequência fundamental primária das ondas de baixa frequência produzidas pelos relâmpagos ao redor do globo.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-text-main font-medium mb-2">A Ressonância Schumann influencia o cérebro?</h3>
            <p className="text-sm">
              Trata-se de uma alegação sem demonstração científica contundente. Embora os números das frequências cruzem a faixa de certas ondas cerebrais do EEG, os sinais da Ressonância são fracos o suficiente em intensidade para serem indetectáveis por organismos sem aparelhos sofisticados.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-text-main font-medium mb-2">Existe relação entre Schumann e espiritualidade?</h3>
            <p className="text-sm">
              A atribuição espiritual e emocional ao fenômeno das ondas ELF da Terra é uma interpretação cultural da internet moderna. A física geofísica pura observa a Schumann como ondas de rádio extremamente longas aprisionadas, sem lhes atribuir caráter místico inerente.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-text-main font-medium mb-2">A frequência da Terra está aumentando?</h3>
            <p className="text-sm">
              Não. Esta é outra desinformação comum resultante da interpretação equivocada de intensidade eletromagnética em espectrogramas de internet. F1 permanece perto de 7,8 Hz.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center bg-primary/10 border border-primary/20 rounded-xl p-8">
          <h3 className="text-2xl text-text-main font-light mb-4">Deixe a metáfora e observe os dados físicos</h3>
          <Link to="/" className="inline-block bg-primary text-primary-foreground font-medium px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors uppercase tracking-wider text-sm">
            ACOMPANHAR A RESSONÂNCIA SCHUMANN HOJE
          </Link>
        </div>

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
    </div>
  );
}
