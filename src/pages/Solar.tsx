import { useSEO } from '../hooks/useSEO';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { dataProvider } from '../data/dataProvider';
import { SolarData } from '../types';
import { Card } from '../components/ui/Card';
import { XRayChart } from '../components/XRayChart';
import { Sun } from 'lucide-react';
import { formatNoaaObservationTime } from '../utils/observationTime';
import { isPositiveFlux } from '../utils/xrayData';
import { SolarProductNote } from '../components/SolarProductNote';

function productFailure(value: unknown): string {
  const code = typeof value === 'string' ? value : undefined;
  if (code?.startsWith('http_error:')) return 'O serviço NOAA retornou erro HTTP.';
  return ({ timeout: 'A consulta NOAA excedeu o tempo limite.', transport_error: 'Falha de transporte ao consultar a NOAA.',
    invalid_json: 'A NOAA retornou JSON inválido.', invalid_schema: 'A estrutura retornada pela NOAA não corresponde ao produto esperado.',
    parser_error: 'Falha ao processar a resposta NOAA.', no_valid_data: 'O produto não contém valores válidos para exibição.',
    incomplete_data: 'O produto contém registros incompletos; consulte a ressalva no indicador.',
    ambiguous_event: 'Os relatos do evento não permitem determinar um representante sem ambiguidade.' } as Record<string, string>)[code || ''] || 'Produto temporariamente indisponível.';
}

export function Solar() {
  useSEO({ title: "Atividade Solar Hoje | Vento Solar, Bz, F10.7 e Raios X", description: "Acompanhe a atividade solar atual. Monitoramento do vento solar, campo magnético interplanetário (Bz), fluxo solar F10.7 e erupções de Raios X (GOES).", path: "/solar" });

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

  const regionsPartial = data.productMetadata?.regions?.state === 'partial';
  const flareAbsent = data.productMetadata?.flares?.state === 'absent';

  return (
    <div className="min-w-0 space-y-6 animate-in fade-in duration-700 [overflow-wrap:anywhere]">
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Atividade Solar</h1>
        <p className="text-text-muted max-w-3xl leading-relaxed">
          A atividade solar e o clima espacial influenciam o ambiente eletromagnético e ionosférico da Terra. Esses dados são apresentados aqui como contexto para a análise das condições geofísicas, não como uma observação direta da Ressonância de Schumann.
        </p>
        <div className="mt-4">
          <Link to="/geomagnetica" className="text-gold hover:text-gold-muted text-sm uppercase tracking-widest">→ Ver Atividade Geomagnética (Kp)</Link>
        </div>
      </div>

      {data.productErrors && Object.keys(data.productErrors).length > 0 && (
        <div role="status" className="text-sm text-text-muted border border-border rounded-lg p-4">
          <p>Há produtos NOAA parciais ou indisponíveis; os valores válidos continuam apresentados.</p>
          <ul className="mt-2 space-y-1">{Object.entries(data.productErrors).map(([product, code]) => <li key={product}>
            {({ f107: 'F10.7', regions: 'Regiões com manchas informadas', flares: 'Eventos catalogados de raios X', wind: 'Vento solar', imf: 'Campo interplanetário', windSpeed: 'Velocidade do vento', density: 'Densidade de prótons', bz: 'IMF Bz', bt: 'IMF Bt', xray: 'GOES X-Ray' } as Record<string, string>)[product] || product}: {productFailure(code)}
          </li>)}</ul>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <Sun className="w-10 h-10 text-gold mb-6 opacity-80" />
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Fluxo de rádio solar F10.7</div>
          <div className="text-5xl font-light text-text-main mb-4">{data.solarFlux != null ? `${data.solarFlux} sfu` : <span className="text-xl text-rose-400">F10.7 indisponível</span>}</div>
          {data.solarFlux === null && <p className="text-xs text-text-muted">{productFailure(data.productErrors?.f107)}</p>}
          <p className="text-xs text-text-muted mt-2">Fluxo de rádio solar em 10,7 cm (F10.7), reportado pela NOAA em sfu.</p>
          <SolarProductNote metadata={data.productMetadata?.f107} fallbackTime={data.solarFluxTimestamp} />
        </Card>

        <Card className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Regiões com manchas informadas</div>
          {regionsPartial && data.sunspots != null && <p className="text-sm text-text-muted mb-1">Pelo menos</p>}
          <div className="text-3xl md:text-5xl font-light text-text-main mb-4">{data.sunspots != null ? data.sunspots : <span className="text-xl text-rose-400">Contagem não determinada</span>}</div>
          <p className="text-xs text-text-muted mt-2">Contagem de regiões nos registros da data indicada; não é o número de manchas individuais nem o índice de manchas.</p>
          <SolarProductNote metadata={data.productMetadata?.regions} partialLabel="Contagem parcial — total não determinado." />
        </Card>

        <Card className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <div className="text-sm tracking-widest text-text-muted uppercase mb-2">Último flare catalogado</div>
          <div className="text-3xl md:text-4xl font-light text-primary mb-4">{data.flares || <span className="text-xl text-text-muted">{flareAbsent ? 'Nenhum XRA no conjunto informado' : 'Evento não determinado'}</span>}</div>
          <p className="text-xs text-text-muted mt-2">Evento XRA selecionado pelo início válido, com a classe de máximo reportada no catálogo. Não é a maior erupção nem a última amostra GOES.</p>
          <SolarProductNote metadata={data.productMetadata?.flares} />
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
            <SolarProductNote metadata={data.productMetadata?.windSpeed} fallbackTime={data.solarWindSpeedTimestamp} />
          </Card>

          <Card className="flex flex-col items-center justify-center py-6 px-4 text-center">
            <div className="text-xs tracking-widest text-text-muted uppercase mb-2">Densidade de Prótons</div>
            <div className="text-3xl font-light text-text-main mb-1">{data.protonDensity != null ? data.protonDensity : '--'} <span className="text-base text-text-muted">p/cm³</span></div>
            <SolarProductNote metadata={data.productMetadata?.density} fallbackTime={data.protonDensityTimestamp} />
          </Card>

          <Card className="flex flex-col items-center justify-center py-6 px-4 text-center">
            <div className="text-xs tracking-widest text-text-muted uppercase mb-2">IMF Bz</div>
            <div className="text-3xl font-light text-text-main mb-1">{data.bz != null ? data.bz : '--'} <span className="text-base text-text-muted">nT</span></div>
            <SolarProductNote metadata={data.productMetadata?.bz} fallbackTime={data.bzTimestamp} />
          </Card>

          <Card className="flex flex-col items-center justify-center py-6 px-4 text-center">
            <div className="text-xs tracking-widest text-text-muted uppercase mb-2">IMF Bt (Total)</div>
            <div className="text-3xl font-light text-text-main mb-1">{data.bt != null ? data.bt : '--'} <span className="text-base text-text-muted">nT</span></div>
            <SolarProductNote metadata={data.productMetadata?.bt} fallbackTime={data.btTimestamp} />
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

        {data.currentXRay && isPositiveFlux(data.currentXRay.flux) && (
          <Card className="flex flex-col items-center justify-center py-6 px-4 text-center mb-8 max-w-sm mx-auto border-primary/20">
            <div className="text-xs tracking-widest text-text-muted uppercase mb-2">Última amostra válida GOES</div>
            <div className="text-4xl font-light text-primary mb-1">{data.currentXRay.flareClass}</div>
            <p className="text-sm text-text-muted mt-2">
              Fluxo: {data.currentXRay.flux.toExponential(2)} W/m²
            </p>
            <p className="text-[10px] text-text-muted mt-2 border-t border-border/50 pt-2 w-full">
              Satélite: GOES-{data.currentXRay.satellite} ({data.currentXRay.energy})<br/>
              Atualizado: {formatNoaaObservationTime(data.currentXRay.timestamp, 'America/Sao_Paulo')}
            </p>
          </Card>
        )}

        <div className="bg-surface border border-border/50 rounded-lg p-4">
          <div className="text-xs tracking-widest text-text-muted uppercase mb-4 text-center">Fluxo de Raios X (24 Horas)</div>
          <XRayChart data={data.xrayHistory || []} unavailableReason={data.productErrors?.xray ? productFailure(data.productErrors.xray) : undefined} />
          <p className="text-xs text-text-muted mt-3">Fluxos ausentes, não positivos ou inválidos permanecem como lacunas; a linha não é suavizada. Horários do gráfico em São Paulo.</p>
        </div>
      </div>


      
      <div className="mt-4 flex flex-col gap-1">
        <p className="text-sm text-text-muted font-medium">
          Fonte: <a href="https://www.swpc.noaa.gov/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">NOAA Space Weather Prediction Center (SWPC)</a>
        </p>
        <p className="text-xs text-text-muted">
          Último horário conhecido entre os produtos disponíveis: {formatNoaaObservationTime(data.timestamp, 'UTC')}
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
