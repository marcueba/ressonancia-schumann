import { useSEO } from '../hooks/useSEO';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';

export function Methodology() {
  useSEO({ title: "Metodologia Científica | Observatório da Terra", description: "Conheça a proveniência dos dados, contexto geofísico, referência científica metodológica e as limitações do Observatório da Terra.", path: "/metodologia" });

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-4">Metodologia e Proveniência</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          Esta página documenta com precisão científica a origem e a forma de processamento dos dados apresentados no Observatório da Terra. O sistema é organizado em três camadas distintas: Observação Schumann Atual, Contexto Geofísico e Referência Científica.
        </p>
      </div>

      <section className="space-y-6">
        <h2 className="text-xl font-medium tracking-wide text-text-main border-b border-border pb-2">A. Observação Schumann Atual</h2>
        <Card className="p-6">
          <div className="space-y-4 text-sm text-text-muted">
            <p>
              Os valores das frequências F1, F2 e F3 atualmente apresentados neste projeto <strong>não são medições instrumentais realizadas diretamente por nosso sistema</strong>. Eles são valores <em>derivados de espectrograma</em> fornecidos por uma fonte secundária externa.
            </p>
            <p>
              F1, F2 e F3 representam as frequências observadas dos três primeiros modos da Ressonância de Schumann na cavidade Terra-Ionosfera. É importante ressaltar que os valores de F1 (~7.8Hz), F2 (~14Hz) e F3 (~20Hz) não são constantes universais fixas; eles sofrem pequenas variações naturais observáveis continuamente.
            </p>
            <div className="p-4 bg-surface-hover/50 border border-border rounded-md mt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-main mb-3">Cadeia Real de Proveniência</h3>
              <ol className="list-decimal list-inside space-y-2 ml-1 text-text-muted">
                <li><span className="font-medium text-text-main">Tomsk (SOSRFF):</span> Observação original do campo ELF (<a href="http://sosrff.tsu.ru/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Space Observing System, Universidade de Tomsk</a>).</li>
                <li><span className="font-medium text-text-main">Representação em Espectrograma:</span> Dados transformados visualmente pela fonte russa.</li>
                <li><span className="font-medium text-text-main">Fonte Secundária:</span> Extração automatizada e processamento da imagem em formato JSON (Dataset JSON — Ressonância Schumann Hoje).</li>
                <li><span className="font-medium text-text-main">Collector (Nosso Backend):</span> Captura pontual e tratamento contra anomalias.</li>
                <li><span className="font-medium text-text-main">Supabase:</span> Armazenamento em banco de dados estruturado com validação de timestamps unívocos.</li>
                <li><span className="font-medium text-text-main">Interface:</span> Gráficos e painéis apresentados neste observatório.</li>
              </ol>
            </div>
            
            <div className="p-4 mt-4 text-sm text-text-muted bg-surface-hover/30 rounded-md border border-border">
              <span className="font-medium text-text-main">Fonte dos dados derivados:</span> <a href="https://ressonanciaschumannhoje.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ressonância Schumann Hoje</a>, a partir do espectrograma público do Space Observing System (SOS-70), Universidade Estatal de Tomsk.
            </div>
            <p className="text-xs mt-2 italic">
              A arquitetura atual permite futuramente incorporar séries temporais ELF instrumentais brutas e processamento próprio (Evolução Metodológica).
            </p>
          </div>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-medium tracking-wide text-text-main border-b border-border pb-2">B. Contexto Geofísico</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <CardTitle as="h3" className="mb-2">Geomagnetismo (NOAA/SWPC)</CardTitle>
            <p className="text-sm text-text-muted leading-relaxed">
              O índice Kp (planetário) mede o grau de perturbação no campo magnético da Terra provocado pelo vento solar. Os dados são provenientes do <strong><a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Space Weather Prediction Center (NOAA/SWPC)</a></strong>.
            </p>
          </Card>
          
          <Card className="p-6">
            <CardTitle as="h3" className="mb-2">Atividade Solar (NOAA)</CardTitle>
            <p className="text-sm text-text-muted leading-relaxed">
              O fluxo solar F10.7 e o número de manchas solares são indicadores da atividade solar e ajudam a contextualizar condições que podem influenciar a ionosfera.
            </p>
          </Card>
        </div>
        <div className="bg-amber-900/10 border border-amber-900/20 rounded-md p-4 mt-2">
          <p className="text-sm text-amber-500 font-medium mb-1">Cuidado Epistemológico</p>
          <p className="text-xs text-text-muted">
            Estes indicadores não são medições de Ressonância Schumann. São usados como "Contexto Geofísico" e <strong>sua apresentação conjunta no Dashboard não demonstra causalidade</strong> nem implica automaticamente que a atividade solar aumenta a amplitude ou a frequência da Ressonância de Schumann em um evento pontual.
          </p>
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-medium tracking-wide text-text-main border-b border-border pb-2">C. Referência Científica Metodológica</h2>
        <Card className="p-6">
          <div className="space-y-4 text-sm text-text-muted">
            <p>
              Como norte metodológico para o futuro da plataforma, utilizamos os parâmetros do estudo publicado pelos pesquisadores da <strong>Sierra Nevada ELF Station (Universidade de Granada)</strong>:
            </p>
            <div className="p-3 bg-surface border border-border rounded text-xs mb-2">
              <p className="font-medium text-text-main">Referência:</p>
              <p>Salinas et al. "Schumann resonance data processing programs and four-year measurements from Sierra Nevada ELF station"</p>
              <p><em>Computers & Geosciences 165 (2022) 105148. <a href="https://doi.org/10.1016/j.cageo.2022.105148" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">DOI: 10.1016/j.cageo.2022.105148</a></em></p>
            </div>
            <p>
              <strong>Nota:</strong> A estação de Sierra Nevada <em>não é</em> a fonte dos dados atuais exibidos no Dashboard. O estudo é citado estritamente como nossa base conceitual e científica para demonstrar como medições ELF instrumentais puras podem ser processadas adequadamente.
            </p>
            <div className="mt-4">
              <h4 className="font-medium text-text-main mb-2">Pipeline Científico Publicado (Referência)</h4>
              <ul className="list-disc list-inside space-y-1 ml-1 text-xs">
                <li>Captação do sinal temporal ELF puro via instrumentação magnética.</li>
                <li>Processamento e geração do Espectro de Potência (PSD).</li>
                <li>Tratamento sistemático e remoção de ruído antropogênico (rede elétrica 50/60Hz e transientes).</li>
                <li>Ajuste matemático das curvas espectrais através de funções de Fitting Lorentziano.</li>
                <li>Extração rigorosa da <strong>Frequência</strong> Central, <strong>Amplitude</strong> e <strong>Largura de Banda</strong> de cada modo.</li>
              </ul>
              <p className="text-[11px] mt-2 italic">Nosso sistema atual ainda não executa este nível de pipeline instrumental.</p>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-6">
        <h2 className="text-xl font-medium tracking-wide text-text-main border-b border-border pb-2">Limitações do Sistema</h2>
        <Card className="p-6">
          <ul className="list-disc list-inside space-y-2 text-sm text-text-muted">
            <li><strong>Dependência Externa:</strong> O sistema depende do funcionamento ativo da fonte externa em Tomsk e das APIs processadoras secundárias.</li>
            <li><strong>Dados Derivados:</strong> As frequências exibidas resultam do processamento computacional da imagem de um espectrograma em vez de processamento matemático de uma série temporal ELF bruta.</li>
            <li><strong>Lacunas Instrumentais:</strong> Os dados armazenados neste momento não dispõem de aferição de Amplitude validadas nem de Largura da Ressonância (Q-factor).</li>
            <li><strong>Falta de Orientação do Campo:</strong> Os dados atualmente disponíveis no observatório não preservam informação separada das orientações NS/EW.</li>
            <li><strong>Sincronia Temporal (Timestamps):</strong> Podem ocorrer diferenças de timestamp de dezenas de minutos entre os dados Schumann, Solares e Geomagnéticos. Eles não descrevem necessariamente um snapshot perfeitamente cravado do mesmo instante global.</li>
            <li><strong>Inferência Causal:</strong> O observatório cataloga e consolida fenômenos, mas não se destina a realizar estatísticas preditivas, nem valida isoladamente relação causal entre anomalias ELF, biologia e clima espacial.</li>
          </ul>
        </Card>
      </section>
    </div>
  );
}
