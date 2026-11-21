import { Card } from './ui/Card';
import { AlertCircle, ImageOff, ExternalLink } from 'lucide-react';
import { formatObservationTime } from '../utils/observationTime';
import { displayFrequency } from '../utils/schumannState';
import { getSchumannAvailability } from '../../shared/schumann';
import { TomskSpectrogramImage, TomskUpdateNotice, useTomskSpectrogram } from './TomskSpectrogram';

interface SchumannSpectrogramPanelProps {
  currentF1?: number | null;
  currentF2?: number | null;
  currentF3?: number | null;
  timestamp?: string | null;
  sourceUpdatedAt?: string | null;
  historical?: boolean;
}

export function SchumannSpectrogramPanel({ currentF1, currentF2, currentF3, timestamp, sourceUpdatedAt, historical }: SchumannSpectrogramPanelProps) {
  const tomsk = useTomskSpectrogram();

  const timeStr = formatObservationTime(timestamp, 'America/Sao_Paulo');
  const hasFrequencies = getSchumannAvailability([currentF1, currentF2, currentF3]) !== 'unavailable';

  return (
    <Card data-tomsk-spectrogram className="min-w-0 overflow-hidden p-0 border border-border bg-background [overflow-wrap:anywhere]">
      <div className="min-w-0 p-4 border-b border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="min-w-0 break-words text-xl font-medium tracking-wide text-text-main">ESPECTROGRAMA DE REFERÊNCIA</h2>
          <p className="text-xs text-text-muted mt-1">
            Visualização espectral utilizada na cadeia de origem das observações derivadas.
          </p>
        </div>
        <a 
          href="https://sos70.ru/provider.php?file=shm.jpg" 
          target="_blank" 
          rel="noopener noreferrer"
          className="min-w-0 max-w-full break-words text-xs flex items-center gap-1 text-primary hover:text-primary-hover transition-colors"
        >
          <ExternalLink size={12} className="shrink-0" />
          Fonte original
        </a>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Painel da Imagem */}
        <div className="flex min-h-[300px] min-w-0 flex-1 flex-col items-center justify-center gap-2 border-b border-border bg-black p-2 lg:border-b-0 lg:border-r">
          {tomsk.imgUrl ? <TomskSpectrogramImage imgUrl={tomsk.imgUrl} hasError={tomsk.hasError} /> : tomsk.hasError ? (
            <div role="alert" className="flex flex-col items-center justify-center p-8 text-center text-text-muted">
              <ImageOff size={48} className="mb-4 opacity-50" />
              <p className="text-sm font-medium">Espectrograma temporariamente indisponível.</p>
              <p className="mt-2 max-w-xs text-xs">Não foi possível carregar a imagem. Os valores numéricos são consultados separadamente.</p>
            </div>
          ) : (
            <div role="status" className="flex flex-col items-center justify-center">
              <div className="mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-primary" aria-hidden="true" />
              <span className="text-xs text-text-muted">Carregando espectrograma...</span>
            </div>
          )}
          <TomskUpdateNotice {...tomsk} />
        </div>

        {/* Painel de Contexto */}
        <div className="min-w-0 w-full lg:w-80 p-5 flex flex-col justify-between bg-surface-hover/20">
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-text-main mb-4 uppercase">Frequências Derivadas</h3>
            <p className="text-xs text-amber-400 mb-3">{!hasFrequencies ? 'Nenhuma frequência válida disponível.' : historical ? 'Leitura histórica fornecida pela fonte.' : 'Valores derivados do JSON externo.'}</p>
            
            <div className="space-y-3 mb-6">
              <div className="bg-surface rounded p-3 border border-border flex justify-between items-center">
                <span className="text-sm font-medium text-text-muted">F1 (Fundamental)</span>
                <span className="text-lg font-light text-primary">{displayFrequency(currentF1, 2)} Hz</span>
              </div>
              <div className="bg-surface rounded p-3 border border-border flex justify-between items-center">
                <span className="text-sm font-medium text-text-muted">F2 (Harmônica)</span>
                <span className="text-lg font-light text-text-main">{displayFrequency(currentF2, 2)} Hz</span>
              </div>
              <div className="bg-surface rounded p-3 border border-border flex justify-between items-center">
                <span className="text-sm font-medium text-text-muted">F3 (Harmônica)</span>
                <span className="text-lg font-light text-text-main">{displayFrequency(currentF3, 2)} Hz</span>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex gap-2 text-text-muted">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p>
                  <strong className="text-text-main">Aviso Científico:</strong> Imagem de referência da fonte. 
                  As cores do espectrograma não são convertidas por este observatório em unidades físicas de amplitude.
                </p>
              </div>
              <div className="flex gap-2 text-text-muted">
                <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p>
                  As frequências F1, F2 e F3 apresentadas pelo observatório são dados derivados e não medições instrumentais realizadas por este site.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-border space-y-2">
            <p className="text-[10px] text-text-muted leading-tight mb-4">
              * O horário da imagem não é informado separadamente pela fonte. A atualização do documento JSON não comprova o horário da imagem nem a existência de uma medição.
            </p>
            <h4 className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Proveniência</h4>
            <div className="min-w-0 text-xs flex flex-col gap-1 sm:flex-row sm:justify-between">
              <span className="text-text-muted">Instrumental:</span>
              <span className="min-w-0 break-words font-medium text-text-main">Tomsk / SOS-70</span>
            </div>
            <div className="min-w-0 text-xs flex flex-col gap-1 sm:flex-row sm:justify-between">
              <span className="text-text-muted">Derivação:</span>
              <span className="min-w-0 break-words font-medium text-text-main sm:ml-2">JSON — Ressonância Schumann Hoje</span>
            </div>
            <div className="min-w-0 text-xs flex flex-col gap-1 sm:flex-row sm:justify-between">
              <span className="text-text-muted">Processamento:</span>
              <span className="min-w-0 break-words font-medium text-text-main">Externo</span>
            </div>
            {hasFrequencies && <div className="text-xs flex flex-col gap-1">
              <span className="text-text-muted">{timestamp ? 'Horário estimado da leitura derivada:' : 'Horário da medição não informado pela fonte.'}</span>
              {timestamp && <span className="font-medium text-primary">{timeStr}</span>}
            </div>}
            {sourceUpdatedAt && <div className="text-xs flex flex-col gap-1">
              <span className="text-text-muted">Atualização do documento da fonte:</span>
              <span className="font-medium text-text-main">{formatObservationTime(sourceUpdatedAt, 'America/Sao_Paulo')}</span>
            </div>}
          </div>
        </div>
      </div>
    </Card>
  );
}
