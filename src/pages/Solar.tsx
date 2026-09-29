import { useSEO } from '../hooks/useSEO';
import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { SolarData } from '../types';
import { Card } from '../components/ui/Card';
import { XRayChart } from '../components/XRayChart';
import { Sun } from 'lucide-react';

export function Solar() {
  useSEO({ title: "Atividade Solar | Observatório da Terra", description: "Acompanhe indicadores de atividade solar utilizados como contexto para o monitoramento da Ressonância de Schumann, com dados do NOAA SWPC.", path: "/solar" });

  const [data, setData] = useState<SolarData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    dataProvider.getSolarData()
      .then(res => {
        if (res) {
          setData(res);
        } else {
          setError(true);
        }
      })
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <div className="p-8 text-text-muted">Carregando...</div>;
  }

  if (error || !data) {
    return <div className="p-8 text-rose-400">Não foi possível atualizar os dados neste momento.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Atividade Solar</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          A atividade solar e o clima espacial influenciam o ambiente eletromagnético e ionosférico da Terra. Esses dados são apresentados aqui como contexto para a análise das condições geofísicas, não como uma observação direta da Ressonância de Schumann.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <Sun className="w-10 h-10 text-gold mb-6 opacity-80" />
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Fluxo de rádio solar F10.7</div>
          <div className="text-5xl font-light text-text-main mb-4">{data.solarFlux != null && `${data.solarFlux} sfu`}</div>
          <p className="text-xs text-text-muted mt-2">Fluxo de rádio solar medido em 10,7 cm (F10.7), utilizado como indicador de atividade solar.</p>
        </Card>

        <Card className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Regiões Solares Ativas</div>
          <div className="text-3xl md:text-5xl font-light text-text-main mb-4">{data.sunspots != null ? data.sunspots : <span className="text-xl text-rose-400">Dados ausentes na fonte</span>}</div>
          <p className="text-xs text-text-muted mt-2">Quantidade de regiões ativas observadas atualmente.</p>
        </Card>

        <Card className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Flares Recentes</div>
          <div className="text-3xl md:text-4xl font-light text-primary mb-4">{data.flares || <span className="text-xl text-rose-400">Dados ausentes na fonte</span>}</div>
          <p className="text-xs text-text-muted mt-2">Maior ou mais recente evento de Raio-X monitorado.</p>
        </Card>
      </div>
      <div className="mt-12 mb-6">
        <h2 className="text-xl font-medium tracking-wide text-text-main border-b border-border pb-2">VENTO SOLAR</h2>
        <p className="text-sm text-text-muted mt-3 mb-6">
          O vento solar é um fluxo constante de plasma (principalmente elétrons e prótons) emitido pelo Sol. A velocidade e a densidade descrevem propriedades diferentes deste plasma. O campo magnético interplanetário (IMF) é o campo magnético transportado pelo vento solar por todo o sistema solar, sendo <strong>Bz</strong> e <strong>Bt</strong> componentes direcionais e totais desse campo, medidas em nanoTeslas (nT).
          <br /><br />
          <strong>Nota:</strong> Esses parâmetros são apresentados como contexto heliogeofísico. Sua proximidade temporal com uma observação Schumann não implica relação causal.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="flex flex-col items-center justify-center py-6 px-4 text-center">
            <div className="text-xs tracking-widest text-text-muted uppercase mb-2">Velocidade</div>
            <div className="text-3xl font-light text-text-main mb-1">{data.solarWindSpeed != null ? data.solarWindSpeed : '--'} <span className="text-base text-text-muted">km/s</span></div>
            <p className="text-[10px] text-text-muted mt-2">
              {data.solarWindTimestamp ? `Atualizado: ${new Date(data.solarWindTimestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}` : '--'}
            </p>
          </Card>

          <Card className="flex flex-col items-center justify-center py-6 px-4 text-center">
            <div className="text-xs tracking-widest text-text-muted uppercase mb-2">Densidade de Prótons</div>
            <div className="text-3xl font-light text-text-main mb-1">{data.protonDensity != null ? data.protonDensity : '--'} <span className="text-base text-text-muted">p/cm³</span></div>
            <p className="text-[10px] text-text-muted mt-2">
              {data.solarWindTimestamp ? `Atualizado: ${new Date(data.solarWindTimestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}` : '--'}
            </p>
          </Card>

          <Card className="flex flex-col items-center justify-center py-6 px-4 text-center">
            <div className="text-xs tracking-widest text-text-muted uppercase mb-2">IMF Bz</div>
            <div className="text-3xl font-light text-text-main mb-1">{data.bz != null ? data.bz : '--'} <span className="text-base text-text-muted">nT</span></div>
            <p className="text-[10px] text-text-muted mt-2">
              {data.imfTimestamp ? `Atualizado: ${new Date(data.imfTimestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}` : '--'}
            </p>
          </Card>

          <Card className="flex flex-col items-center justify-center py-6 px-4 text-center">
            <div className="text-xs tracking-widest text-text-muted uppercase mb-2">IMF Bt (Total)</div>
            <div className="text-3xl font-light text-text-main mb-1">{data.bt != null ? data.bt : '--'} <span className="text-base text-text-muted">nT</span></div>
            <p className="text-[10px] text-text-muted mt-2">
              {data.imfTimestamp ? `Atualizado: ${new Date(data.imfTimestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}` : '--'}
            </p>
          </Card>
        </div>
      </div>

      <div className="mt-12 mb-6">
        <h2 className="text-xl font-medium tracking-wide text-text-main border-b border-border pb-2">RAIOS X SOLARES — GOES</h2>
        <p className="text-sm text-text-muted mt-3 mb-6">
          O fluxo de raios X medido pelos satélites GOES é utilizado para monitorar a atividade solar e classificar flares nas classes A, B, C, M e X. 
          <br /><br />
          <strong>Nota:</strong> Os dados solares são apresentados como contexto heliogeofísico e não constituem medições da Ressonância Schumann.
        </p>

        {data.currentXRay && (
          <Card className="flex flex-col items-center justify-center py-6 px-4 text-center mb-8 max-w-sm mx-auto border-primary/20">
            <div className="text-xs tracking-widest text-text-muted uppercase mb-2">Classe Atual</div>
            <div className="text-4xl font-light text-primary mb-1">{data.currentXRay.flareClass}</div>
            <p className="text-sm text-text-muted mt-2">
              Fluxo: {data.currentXRay.flux.toExponential(2)} W/m²
            </p>
            <p className="text-[10px] text-text-muted mt-2 border-t border-border/50 pt-2 w-full">
              Satélite: GOES-{data.currentXRay.satellite} ({data.currentXRay.energy})<br/>
              Atualizado: {new Date(data.currentXRay.timestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })}
            </p>
          </Card>
        )}

        <div className="bg-surface border border-border/50 rounded-lg p-4">
          <div className="text-xs tracking-widest text-text-muted uppercase mb-4 text-center">Fluxo de Raios X (24 Horas)</div>
          <XRayChart data={data.xrayHistory || []} />
        </div>
      </div>


      
      <div className="mt-4 flex flex-col gap-1">
        <p className="text-sm text-text-muted font-medium">
          Fonte: <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">NOAA Space Weather Prediction Center (SWPC)</a>
        </p>
        <p className="text-xs text-text-muted">
          {data.timestamp 
            ? `Última atualização: ${new Date(data.timestamp).toLocaleTimeString('pt-BR', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })} UTC` 
            : 'Última atualização: não disponível'}
        </p>
      </div>

      <div className="bg-surface-hover/20 border border-border/50 rounded-lg p-6 mt-6">
        <p className="text-sm text-text-muted text-center italic">
          Os dados solares apresentados nesta página são contexto de atividade solar. Não constituem observações diretas da Ressonância de Schumann.
        </p>
      </div>
    </div>
  );
}
