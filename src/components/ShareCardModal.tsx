import { useState, useRef, useEffect } from 'react';
import { X, Download, Share2, Loader2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { cn } from '../utils/cn';
import { formatObservationTime, parseObservationTime } from '../utils/observationTime';

interface ShareCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    f1: number | null;
    f2: number | null;
    f3: number | null;
    intensity: number | null;
    timestamp: string | null;
  };
}

const formats = {
  feed: { width: 1080, height: 1350 },
  story: { width: 1080, height: 1920 },
};
const formatValue = (value: number | null) => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(1) : '—';

export function ShareCardModal({ isOpen, onClose, data }: ShareCardModalProps) {
  const [format, setFormat] = useState<'feed' | 'story'>('feed');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scale, setScale] = useState(0.2);
  const previewAreaRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const size = formats[format];

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !previewAreaRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(Math.max(0.01, Math.min(width / size.width, height / size.height, 1)));
    });
    observer.observe(previewAreaRef.current);
    return () => observer.disconnect();
  }, [isOpen, size.width, size.height]);

  if (!isOpen) return null;
  const obsDate = parseObservationTime(data.timestamp);
  const dateStr = obsDate
    ? obsDate.toLocaleDateString('pt-BR', { timeZone: 'UTC', day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()
    : 'DATA DA OBSERVAÇÃO INDISPONÍVEL';
  const observationTime = formatObservationTime(data.timestamp, 'UTC');

  const handleGenerateImage = async (action: 'download' | 'share') => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      await document.fonts.ready;
      // Export the visible card at its native size; only the preview transform is removed.
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        pixelRatio: 1,
        width: size.width,
        height: size.height,
        style: { transform: 'none', transformOrigin: 'top left', position: 'static' },
      });
      const fileName = `ressonancia-schumann-${obsDate ? obsDate.toISOString().split('T')[0] : 'sem-data'}-${format}.png`;
      if (action === 'share' && navigator.share) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Ressonância Schumann', text: 'Última observação disponível — dados derivados de espectrograma' });
            return;
          }
        } catch (error) { console.error('Error sharing file', error); }
      }
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (error) { console.error('Failed to generate image', error); }
    finally { setIsGenerating(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-4xl flex flex-col md:flex-row overflow-hidden shadow-2xl relative" style={{ height: 'min(900px, calc(100dvh - 32px))' }}>
        <button ref={closeButtonRef} onClick={onClose} className="absolute right-4 top-4 z-10 p-2 bg-background/50 rounded-full hover:bg-background/80 transition-colors" aria-label="Fechar">
          <X className="w-5 h-5 text-text-muted" />
        </button>

        <div ref={previewAreaRef} className="flex-1 min-w-0 min-h-0 bg-[#050B14] flex items-center justify-center p-4 md:p-6">
          <div data-share-preview className="relative shrink-0" style={{ width: size.width * scale, height: size.height * scale }}>
            <div ref={cardRef} data-share-card className="absolute top-0 left-0 flex flex-col justify-between" style={{
              width: size.width, height: size.height, boxSizing: 'border-box', padding: 80,
              transform: `scale(${scale})`, transformOrigin: 'top left', backgroundColor: '#0f172a',
              backgroundImage: 'radial-gradient(circle at top right, rgba(234, 179, 8, 0.1), transparent 40%), radial-gradient(circle at bottom left, rgba(234, 179, 8, 0.05), transparent 40%)',
              fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', lineHeight: 1.2,
            }}>
              <div>
                <div style={{ color: '#eab308', letterSpacing: '0.3em', fontSize: 24, fontWeight: 600, marginBottom: 60 }}>OBSERVATÓRIO DA TERRA</div>
                <div style={{ color: '#f8fafc', fontSize: 90, fontWeight: 300, lineHeight: 1.1, marginBottom: 20 }}>RESSONÂNCIA<br />SCHUMANN</div>
                <div style={{ color: '#94a3b8', fontSize: 32, letterSpacing: '0.1em' }}>{dateStr}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40, marginTop: 'auto', marginBottom: 64 }}>
                {(['f1', 'f2', 'f3'] as const).map(mode => (
                  <div key={mode} style={{ borderTop: '2px solid rgba(234, 179, 8, 0.3)', paddingTop: 20 }}>
                    <div style={{ color: '#eab308', fontSize: 24, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 10 }}>{mode.toUpperCase()}</div>
                    <div style={{ color: '#f8fafc', fontSize: 72, fontWeight: 300 }}>{formatValue(data[mode])} <span style={{ fontSize: 32, color: '#64748b' }}>Hz</span></div>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '2px solid rgba(234, 179, 8, 0.3)', paddingTop: 30, marginBottom: 64 }}>
                <div style={{ color: '#eab308', fontSize: 24, fontWeight: 600, letterSpacing: '0.1em', marginBottom: 10 }}>INTENSIDADE RELATIVA</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
                  <div style={{ color: '#f8fafc', fontSize: 90, fontWeight: 300 }}>{formatValue(data.intensity)}</div>
                  <div style={{ color: '#64748b', fontSize: 40 }}>/ 100</div>
                </div>
                <div style={{ color: '#94a3b8', fontSize: 24, marginTop: 10 }}>Escala relativa • não calibrada em pT</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 32, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 32 }}>
                <div style={{ maxWidth: 440 }}>
                  <div style={{ color: '#94a3b8', fontSize: 20, marginBottom: 8 }}>Última observação disponível</div>
                  <div style={{ color: '#f8fafc', fontSize: 28, fontWeight: 600 }}>{observationTime}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#eab308', fontSize: 24, fontWeight: 600, marginBottom: 8 }}>ressonanciaschumann.com</div>
                  <div style={{ color: '#64748b', fontSize: 18 }}>Dados derivados de espectrograma.<br />Consulte metodologia e fontes.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 shrink-0 p-4 md:p-6 flex flex-col overflow-y-auto">
          <h2 id="modal-title" className="text-xl font-medium text-text-main mb-4 pr-8">Criar Share Card</h2>
          <div className="mb-4">
            <label className="text-sm text-text-muted mb-3 block uppercase tracking-wider">Formato</label>
            <div className="grid grid-cols-2 gap-3">
              {(['feed', 'story'] as const).map(option => (
                <button key={option} disabled={isGenerating} onClick={() => setFormat(option)} className={cn('py-3 px-4 rounded-xl border text-sm font-medium transition-colors text-center disabled:opacity-50', format === option ? 'bg-gold/10 border-gold text-gold' : 'border-border text-text-muted hover:border-text-muted/50')}>
                  {option === 'feed' ? 'Feed 4:5' : 'Story 9:16'}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-auto space-y-3">
            <button onClick={() => handleGenerateImage('download')} disabled={isGenerating} className="w-full py-3 px-4 rounded-xl border border-gold text-gold hover:bg-gold/10 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50">
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}<span>Baixar Imagem</span>
            </button>
            {!!navigator.share && (
              <button onClick={() => handleGenerateImage('share')} disabled={isGenerating} className="w-full py-3 px-4 rounded-xl bg-gold text-background hover:bg-gold-muted transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50">
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}<span>Compartilhar</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
