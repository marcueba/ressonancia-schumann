import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';

export function ArticleSchumannToday() {
  useSEO({ 
    title: "Ressonância Schumann Hoje: Como Interpretar os Dados", 
    description: "Aprenda a interpretar a Ressonância Schumann hoje: frequências F1, F2 e F3, intensidade relativa, espectrograma, histórico e contexto geomagnético e solar.", 
    path: "/artigos/ressonancia-schumann-hoje",
    isArticle: true,
    articleDate: "2026-09-29T13:00:00Z"
  });

  return (
    <div className="animate-in fade-in duration-700 max-w-3xl mx-auto pb-12">
      <Link to="/artigos" className="text-gold hover:text-gold-muted text-sm tracking-widest uppercase mb-8 inline-block">
        ← Voltar para Artigos
      </Link>

      <article className="prose prose-invert prose-p:text-text-muted prose-headings:text-text-main prose-a:text-gold hover:prose-a:text-gold-muted max-w-none">
        <h1 className="text-4xl font-light mb-6">Ressonância Schumann hoje: como interpretar os dados</h1>
        
        <p className="lead text-xl text-text-main/80 mb-8">
          O que significa consultar a Ressonância Schumann hoje? Não existe um único número que represente o "estado da Ressonância Schumann". Aprenda a interpretar corretamente as variáveis físicas do nosso Observatório.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">1. O que significa "Ressonância Schumann hoje"?</h2>
        <p>
          Consultar a Ressonância Schumann hoje significa observar o espectro eletromagnético de baixa frequência da cavidade Terra-ionosfera nas últimas horas. Em vez de procurar por um número mágico ou uma resposta simples de "alto" ou "baixo", a interpretação correta requer a observação de frequências (F1, F2, F3), suas respectivas intensidades (amplitudes) e a evolução temporal desses valores no espectrograma.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">2. O que são F1, F2 e F3?</h2>
        <p>
          A Ressonância Schumann possui vários modos de ressonância (frequências). Os três primeiros e mais acompanhados são aproximadamente:
        </p>
        <ul>
          <li><strong>F1:</strong> ~7,8 Hz</li>
          <li><strong>F2:</strong> ~14 Hz</li>
          <li><strong>F3:</strong> ~20 Hz</li>
        </ul>
        <p>
          O fundamental é compreender que esses números (como o famoso 7,83 Hz) são <strong>médias e referências aproximadas</strong>. As medições físicas reais sempre flutuam levemente ao longo do dia, dependendo da atividade global de raios e mudanças na ionosfera.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">3. O que significa quando F1 muda?</h2>
        <p>
          Se você observar que F1 mudou de 7.8 Hz para 8.0 Hz, isso significa apenas uma pequena variação natural na sintonia da cavidade Terra-ionosfera, possivelmente devido à iluminação solar alterando a altura da ionosfera. 
        </p>
        <p>
          Não significa que a "frequência da Terra" sofreu um aumento drástico. Também é incorreto atribuir automaticamente qualquer pequena variação F1 à atividade solar ou anomalias drásticas, pois essas flutuações decimais são o comportamento perfeitamente normal e esperado do fenômeno.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">4. Frequência não é intensidade</h2>
        <p>
          Este é o erro de interpretação mais comum. Uma coisa é a <strong>frequência</strong> (onde ocorre o pico no espectro, medido em Hertz). Outra bem diferente é a <strong>intensidade ou amplitude</strong> (quão forte é o sinal naquela frequência, que deveria idealmente ser medida em picotesla).
        </p>
        <p>
          Quando um espectrograma brilha intensamente na marca de 30 ou 40 Hz, as pessoas frequentemente dizem equivocadamente que "a frequência da Terra subiu para 40 Hz". O que ocorreu foi que a <strong>intensidade eletromagnética</strong> de banda larga naquela faixa de frequência atingiu um pico. A frequência fundamental (F1) continua perto de 7,8 Hz.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">5. O que significa "Intensidade Relativa" no nosso Observatório?</h2>
        <p>
          Em nosso painel principal, apresentamos a "Intensidade Relativa" de 0 a 100. É vital compreender as métricas do nosso <Link to="/metodologia">sistema atual</Link>:
        </p>
        <ul>
          <li>A métrica é uma escala de 0 a 100, <strong>derivada da escala de cor do espectrograma</strong> de nossa fonte.</li>
          <li><strong>Não é calibrada</strong> em unidades físicas reais como picotesla (pT).</li>
          <li>Não equivale rigorosamente à amplitude física real da onda.</li>
          <li>Não deve ser convertida para picotesla sob nenhuma hipótese.</li>
        </ul>

        <h2 className="text-2xl font-light mt-10 mb-4">6. Como interpretar o espectrograma?</h2>
        <p>
          O <Link to="/atual">espectrograma</Link> é um mapa visual de calor:
        </p>
        <ul>
          <li><strong>Eixo horizontal:</strong> Tempo (geralmente horas ou dias).</li>
          <li><strong>Eixo vertical:</strong> Frequência (geralmente de 0 a 40 Hz).</li>
          <li><strong>Cores:</strong> Representação visual da intensidade do sinal (onde branco/verde/vermelho forte representam maior potência detectada pela antena local).</li>
        </ul>
        <p>
          Importante: o brilho ou colorização não identifica automaticamente a causa física. Um clarão pode ser uma tempestade intensa na África, ou apenas ruído local de equipamento próximo à antena.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">7. Por que às vezes não existem novos dados?</h2>
        <p>
          Se a última atualização ocorreu há várias horas, significa que os dados na fonte oficial pausaram ou atrasaram. O Observatório trabalha exclusivamente com observações disponíveis na fonte de origem. Nós <strong>não fabricamos dados</strong> nem inserimos valores médios para preencher lacunas, a fim de preservar o rigor científico do histórico.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">8. O valor de olhar para o Histórico</h2>
        <p>
          Um ponto de dado isolado diz muito pouco sobre a saúde geofísica do planeta. Observar as tendências ao longo de 24 horas, 7 dias ou um mês no nosso <Link to="/historico">Histórico</Link> é o que revela as variações diurnas naturais e destaca anomalias verdadeiras.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">9. Atividade geomagnética (Índice Kp)</h2>
        <p>
          O <Link to="/geomagnetica">Índice Kp</Link> mede o nível de distúrbios geomagnéticos globais causados pelo vento solar. Ele serve como <strong>contexto geofísico independente</strong>. Embora o Kp afete as camadas ionosféricas, não determine diretamente que o valor F1 ou F2 subirá ou descerá apenas porque o Kp está alto.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">10. Atividade solar</h2>
        <p>
          O vento solar, fluxo de Raios X (GOES), Bz e o índice F10.7 (disponíveis no painel <Link to="/solar">Atividade Solar</Link>) afetam fortemente a ionosfera. Mas, mais uma vez, são variáveis de contexto. Evite transformar coincidência temporal (ex: "teve uma explosão solar e F1 caiu 0.1 Hz no mesmo momento") em prova irrefutável de causalidade.
        </p>

        <h2 className="text-2xl font-light mt-10 mb-4">11. Como ler o Dashboard em 30 segundos</h2>
        <ol>
          <li>Veja o <strong>horário</strong> da última observação disponível.</li>
          <li>Observe se as frequências (F1, F2, F3) estão próximas dos valores nominais.</li>
          <li>Consulte a <strong>intensidade relativa</strong>.</li>
          <li>Examine o <strong>espectrograma</strong> para visualizar se ocorreram rajadas de banda larga recentes.</li>
          <li>Compare o instante atual com o <strong>histórico das últimas 24h</strong>.</li>
          <li>Somente após esse entendimento da Schumann, consulte as variáveis de contexto como vento solar e Índice Kp.</li>
        </ol>

        <hr className="border-border my-10" />

        <h2 className="text-2xl font-light mb-6">Perguntas Frequentes (FAQ)</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg text-text-main font-medium mb-2">Qual é a Ressonância Schumann hoje?</h3>
            <p className="text-sm">
              Não existe um valor único para "hoje". Trata-se de um conjunto de modos de ressonância (como ~7.8 Hz, ~14 Hz, ~20 Hz) cujas potências eletromagnéticas e frequências exatas flutuam de hora em hora. Para ver os valores mais recentes, visite nosso painel de <Link to="/atual" className="text-gold">Ressonância Atual</Link>.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-text-main font-medium mb-2">A frequência da Terra está aumentando?</h3>
            <p className="text-sm">
              Não. A frequência do primeiro modo fundamental de ressonância da Terra continua estável em torno de 7,8 Hz. Flutuações pontuais de frações de Hertz são normais. Alegações de que a frequência básica do planeta aumentou para 30 ou 40 Hz nas últimas décadas não têm amparo científico observacional; elas geralmente resultam de uma má interpretação entre frequência e intensidade no espectrograma.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-text-main font-medium mb-2">7,83 Hz é uma frequência fixa?</h3>
            <p className="text-sm">
              Não. É um valor aproximado aceito como média, mas medições em tempo real variam dependendo das condições da ionosfera e da distribuição das tempestades elétricas no globo, podendo variar entre 7.6 a 8.0 Hz tipicamente.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-text-main font-medium mb-2">O que significa uma faixa branca no espectrograma?</h3>
            <p className="text-sm">
              Cores intensas (brilhantes, muitas vezes brancas ou vermelhas/verdes intensas dependendo do esquema de cor) representam um instante em que o sensor local mediu grande magnitude ou energia de campo eletromagnético (intensidade).
            </p>
          </div>
          <div>
            <h3 className="text-lg text-text-main font-medium mb-2">30 ou 40 Hz significa que a Ressonância Schumann aumentou?</h3>
            <p className="text-sm">
              Não. As faixas visíveis no espectrograma atingindo 30 ou 40 Hz significam que ocorreu uma descarga de "ruído" forte o suficiente que atingiu potências mensuráveis por todo o espectro. A Ressonância Schumann (os picos formados ao redor de 7.8, 14, e 20 Hz) continua existindo nas suas frequências originais.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-text-main font-medium mb-2">Os dados são em tempo real?</h3>
            <p className="text-sm">
              Os dados refletem o horário do registro extraído da fonte primária (geralmente uma base russa). Há sempre um grau de atraso entre o instante da captação física do sinal, o processamento da imagem do espectrograma pela estação de origem, e a atualização em nosso banco de dados.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center bg-primary/10 border border-primary/20 rounded-xl p-8">
          <h3 className="text-2xl text-text-main font-light mb-4">Acompanhe os Dados Agora</h3>
          <Link to="/" className="inline-block bg-primary text-primary-foreground font-medium px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors uppercase tracking-wider text-sm">
            VER A RESSONÂNCIA SCHUMANN HOJE
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
