import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { AlertCircle, ImageOff, ExternalLink } from 'lucide-react';

interface SchumannSpectrogramPanelProps {
  currentF1?: number | null;
  currentF2?: number | null;
  currentF3?: number | null;
  timestamp?: string;
}

export function SchumannSpectrogramPanel({ currentF1, currentF2, currentF3, timestamp }: SchumannSpectrogramPanelProps) {
  const [imgUrl, setImgUrl] = useState<string>('');
  const [hasError, setHasError] = useState(false);
  const [loading, setLoading] = useState(true);

  // We use our local proxy to avoid CORS/CORB issues and ensure image/jpeg content-type.
  // We append a timestamp rounded to 5 minutes to bust browser cache gracefully.
  useEffect(() => {
    const timeBucket = Math.floor(Date.now() / (1000 * 300)); // 5 minutes bucket
    setImgUrl(`/api/spectrogram/tomsk?t=${timeBucket}`);
    setHasError(false);
    setLoading(true);
  }, []);

  const handleImageError = () => {
    setHasError(true);
    setLoading(false);
  };

  const handleImageLoad = () => {
    setLoading(false);
  };

  const timeStr = timestamp 
    ? new Date(timestamp).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
    : 'Desconhecido';

  return (
    <Card className="overflow-hidden border border-border bg-background">
      <div className="p-4 border-b border-border bg-surface flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-medium tracking-wide text-text-main">ESPECTROGRAMA DE REFERÊNCIA</h2>
          <p className="text-xs text-text-muted mt-1">
            Visualização espectral utilizada na cadeia de origem das observações derivadas.
          </p>
        </div>
        <a 
          href="https://sos70.ru/provider.php?file=shm.jpg" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs flex items-center gap-1 text-primary hover:text-primary-hover transition-colors whitespace-nowrap"
        >
          <ExternalLink size={12} />
          Fonte original
        </a>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* Painel da Imagem */}
        <div className="relative flex-1 bg-black min-h-[300px] flex items-center justify-center p-2 border-b lg:border-b-0 lg:border-r border-border">
          {loading && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mb-2"></div>
              <span className="text-xs text-text-muted">Carregando espectrograma...</span>
            </div>
          )}
          
          {hasError ? (
            <div className="flex flex-col items-center justify-center text-text-muted p-8 text-center">
              <ImageOff size={48} className="mb-4 opacity-50" />
              <p className="text-sm font-medium">Espectrograma temporariamente indisponível.</p>
              <p className="text-xs mt-2 max-w-xs">A conexão com o observatório de Tomsk pode estar instável ou a imagem não pôde ser renderizada.</p>
            </div>
          ) : (
            <img 
              src={imgUrl}
              alt="Espectrograma ELF de referência da estação Tomsk / SOS-70"
              className={`max-w-full h-auto object-contain transition-opacity duration-500 ${loading ? 'opacity-0' : 'opacity-100'}`}
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          )}
        </div>

        {/* Painel de Contexto */}
        <div className="w-full lg:w-80 p-5 flex flex-col justify-between bg-surface-hover/20">
          <div>
            <h3 className="text-sm font-semibold tracking-wider text-text-main mb-4 uppercase">Frequências Derivadas</h3>
            
            <div className="space-y-3 mb-6">
              <div className="bg-surface rounded p-3 border border-border flex justify-between items-center">
                <span className="text-sm font-medium text-text-muted">F1 (Fundamental)</span>
                <span className="text-lg font-light text-primary">{currentF1 ? currentF1.toFixed(2) : '--'} Hz</span>
              </div>
              <div className="bg-surface rounded p-3 border border-border flex justify-between items-center">
                <span className="text-sm font-medium text-text-muted">F2 (Harmônica)</span>
                <span className="text-lg font-light text-text-main">{currentF2 ? currentF2.toFixed(2) : '--'} Hz</span>
              </div>
              <div className="bg-surface rounded p-3 border border-border flex justify-between items-center">
                <span className="text-sm font-medium text-text-muted">F3 (Harmônica)</span>
                <span className="text-lg font-light text-text-main">{currentF3 ? currentF3.toFixed(2) : '--'} Hz</span>
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
            <h4 className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Proveniência</h4>
            <div className="text-xs flex justify-between">
              <span className="text-text-muted">Instrumental:</span>
              <span className="font-medium text-text-main">Tomsk / SOS-70</span>
            </div>
            <div className="text-xs flex justify-between">
              <span className="text-text-muted">Derivação:</span>
              <span className="font-medium text-text-main truncate ml-2">JSON — Ressonância Schumann Hoje</span>
            </div>
            <div className="text-xs flex justify-between">
              <span className="text-text-muted">Processamento:</span>
              <span className="font-medium text-text-main">Externo</span>
            </div>
            <div className="text-xs flex justify-between">
              <span className="text-text-muted">Horário Extração:</span>
              <span className="font-medium text-primary">{timeStr}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
