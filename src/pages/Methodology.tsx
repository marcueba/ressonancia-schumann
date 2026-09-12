import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';

export function Methodology() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">De onde vêm os dados?</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          As informações apresentadas nesta plataforma são provenientes de estações de monitoramento eletromagnético e de fontes científicas de atividade solar e geomagnética. A arquitetura foi preparada para garantir transparência e respeitar direitos de redistribuição.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>SOSRFF (Tomsk)</CardTitle>
            <CardDescription>Sistema de Observação Espacial de Tomsk</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-text-muted uppercase tracking-wider text-xs">Tipo de dado</span>
              <span>Imagens de Espectrograma</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-text-muted uppercase tracking-wider text-xs">Licença</span>
              <span>Domínio Público / Educacional</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-text-muted uppercase tracking-wider text-xs">Link da fonte</span>
              <a href="http://sosrff.tsu.ru" target="_blank" rel="noreferrer" className="text-primary hover:underline">sosrff.tsu.ru</a>
            </div>
            <div className="text-sm text-text-muted mt-2">
              A estação de Tomsk é uma referência global educacional. Entretanto, ela fornece apenas imagens (espectrogramas visuais) e não oferece uma API de dados numéricos (Hz/pT) estruturados. Portanto, não alimenta numericamente o observatório atual sem o uso de visão computacional.
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>NOAA SWPC</CardTitle>
            <CardDescription>Space Weather Prediction Center</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-text-muted uppercase tracking-wider text-xs">Tipo de dado</span>
              <span>Atividade Geomagnética (Kp)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-text-muted uppercase tracking-wider text-xs">Licença</span>
              <span>Domínio Público (EUA)</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-text-muted uppercase tracking-wider text-xs">Link da fonte</span>
              <a href="#" className="text-primary hover:underline">swpc.noaa.gov</a>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>NASA SDO</CardTitle>
            <CardDescription>Solar Dynamics Observatory</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-text-muted uppercase tracking-wider text-xs">Tipo de dado</span>
              <span>Fluxo Solar e Manchas</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-text-muted uppercase tracking-wider text-xs">Licença</span>
              <span>Domínio Público</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-text-muted uppercase tracking-wider text-xs">Link da fonte</span>
              <a href="#" className="text-primary hover:underline">sdo.gsfc.nasa.gov</a>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sierra Nevada ELF Station</CardTitle>
            <CardDescription>Universidade de Granada (UGR)</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-text-muted uppercase tracking-wider text-xs">Status no Projeto</span>
              <span className="text-amber-400">Validada / Desativada Temporariamente</span>
            </div>
            <div className="text-sm text-text-muted mt-2">
              Os pesquisadores publicaram dados e métodos científicos de altíssima qualidade (Zenodo 6348690, RAW com licença CC BY 4.0; Digibug 71563 Processado com CC BY-NC-ND). No entanto, como os dados estão agrupados em arquivos ZIP indivisíveis de até 26GB e os portais impossibilitam download seletivo por HTTP Range, a fonte não está em uso operacional automático nesta versão web.
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SunGeo</CardTitle>
            <CardDescription>Agregação de Dados Espaciais</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-text-muted uppercase tracking-wider text-xs">Tipo de dado</span>
              <span>Fonte agregada/contextual (Score)</span>
            </div>
            <div className="text-sm text-text-muted mt-2">
              O Score fornecido pela API SunGeo atua como um índice de intensidade eletromagnética, não sendo equivalente à medição da frequência fundamental das Ressonâncias de Schumann (Hz).
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>BGS (British Geological Survey)</CardTitle>
            <CardDescription>NERC (Reino Unido)</CardDescription>
          </CardHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-text-muted uppercase tracking-wider text-xs">Status no Projeto</span>
              <span className="text-amber-400">Investigação de Viabilidade</span>
            </div>
            <div className="text-sm text-text-muted mt-2">
              Os dados de indução eletromagnética da base Eskdalemuir são uma fonte científica futura valiosa. Os experimentos provaram que o canal sísmico comum (GB.ESK.00.HHZ) não deve ser utilizado como medição ELF/Schumann por captar estritamente vibrações mecânicas/antropogênicas em vez do campo eletromagnético.
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
