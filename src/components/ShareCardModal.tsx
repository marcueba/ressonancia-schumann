import { useState, useRef } from 'react';
import { X, Download, Share2, Loader2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { cn } from '../utils/cn';

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

export function ShareCardModal({ isOpen, onClose, data }: ShareCardModalProps) {
  const [format, setFormat] = useState<'feed' | 'story'>('feed');
  const [isGenerating, setIsGenerating] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const obsDate = data.timestamp ? new Date(data.timestamp) : null;
  const dateStr = obsDate 
    ? obsDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace(' DE ', ' ')
    : '—';
  const timeStr = obsDate 
    ? obsDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : '—';

  const formatConfig = {
    feed: { width: 1080, height: 1350, scale: 0.35, wrapperClass: 'aspect-[4/5]' },
    story: { width: 1080, height: 1920, scale: 0.25, wrapperClass: 'aspect-[9/16]' }
  };

  const handleGenerateImage = async (action: 'download' | 'share') => {
    if (!cardRef.current) return;
    setIsGenerating(true);
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 1,
        width: formatConfig[format].width,
        height: formatConfig[format].height,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          position: 'static',
        }
      });
      
      const fileName = `ressonancia-schumann-\${obsDate ? obsDate.toISOString().split('T')[0] : 'atual'}-\${format}.png`;

      if (action === 'share' && navigator.share) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], fileName, { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: 'Ressonância Schumann Hoje',
              text: 'Dados atuais do Observatório da Terra'
            });
            return;
          }
        } catch (e) {
          console.error('Error sharing file', e);
        }
      }
      
      // Fallback to download
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatValue = (val: number | null) => val !== null ? val.toFixed(1) : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
        
        {/* Header / Close for mobile */}
        <button onClick={onClose} className="absolute right-4 top-4 z-10 p-2 bg-background/50 rounded-full hover:bg-background/80 transition-colors" aria-label="Fechar">
          <X className="w-5 h-5 text-text-muted" />
        </button>

        {/* Left Side: Preview */}
        <div className="flex-1 bg-[#050B14] flex items-center justify-center p-4 md:p-8 overflow-y-auto min-h-[40vh]">
          {/* We scale the preview down to fit, but generate the real size behind the scenes */}
          <div className={cn("relative w-full max-w-sm flex items-center justify-center", formatConfig[format].wrapperClass)}>
            
            {/* The actual hidden element for rendering */}
            <div className="overflow-hidden hidden absolute top-0 left-0">
              <div 
                ref={cardRef} 
                className="bg-[#0f172a] relative flex flex-col justify-between"
                style={{
                  width: formatConfig[format].width,
                  height: formatConfig[format].height,
                  padding: '80px',
                  backgroundImage: 'radial-gradient(circle at top right, rgba(234, 179, 8, 0.1), transparent 40%), radial-gradient(circle at bottom left, rgba(234, 179, 8, 0.05), transparent 40%)'
                }}
              >
                <div>
                  <div style={{ color: '#eab308', letterSpacing: '0.3em', fontSize: '24px', fontWeight: 600, marginBottom: '60px' }}>
                    OBSERVATÓRIO DA TERRA
                  </div>
                  <h1 style={{ color: '#f8fafc', fontSize: '90px', fontWeight: 300, lineHeight: 1.1, marginBottom: '20px', textTransform: 'uppercase' }}>
                    RESSONÂNCIA<br/>SCHUMANN HOJE
                  </h1>
                  <div style={{ color: '#94a3b8', fontSize: '32px', letterSpacing: '0.1em', fontWeight: 400 }}>
                    {dateStr}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px', marginTop: 'auto', marginBottom: '80px' }}>
                  <div style={{ borderTop: '2px solid rgba(234, 179, 8, 0.3)', paddingTop: '20px' }}>
                    <div style={{ color: '#eab308', fontSize: '24px', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '10px' }}>F1</div>
                    <div style={{ color: '#f8fafc', fontSize: '72px', fontWeight: 300 }}>{formatValue(data.f1)} <span style={{ fontSize: '32px', color: '#64748b' }}>Hz</span></div>
                  </div>
                  <div style={{ borderTop: '2px solid rgba(234, 179, 8, 0.3)', paddingTop: '20px' }}>
                    <div style={{ color: '#eab308', fontSize: '24px', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '10px' }}>F2</div>
                    <div style={{ color: '#f8fafc', fontSize: '72px', fontWeight: 300 }}>{formatValue(data.f2)} <span style={{ fontSize: '32px', color: '#64748b' }}>Hz</span></div>
                  </div>
                  <div style={{ borderTop: '2px solid rgba(234, 179, 8, 0.3)', paddingTop: '20px' }}>
                    <div style={{ color: '#eab308', fontSize: '24px', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '10px' }}>F3</div>
                    <div style={{ color: '#f8fafc', fontSize: '72px', fontWeight: 300 }}>{formatValue(data.f3)} <span style={{ fontSize: '32px', color: '#64748b' }}>Hz</span></div>
                  </div>
                </div>

                {data.intensity !== null && (
                  <div style={{ borderTop: '2px solid rgba(234, 179, 8, 0.3)', paddingTop: '30px', marginBottom: '80px' }}>
                    <div style={{ color: '#eab308', fontSize: '24px', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '10px' }}>INTENSIDADE RELATIVA</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                      <div style={{ color: '#f8fafc', fontSize: '90px', fontWeight: 300 }}>{formatValue(data.intensity)}</div>
                      <div style={{ color: '#64748b', fontSize: '40px', fontWeight: 300 }}>/ 100</div>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '24px', marginTop: '10px' }}>Escala relativa • não calibrada em pT</div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '40px' }}>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '20px', marginBottom: '8px' }}>Última observação disponível</div>
                    <div style={{ color: '#f8fafc', fontSize: '32px', fontWeight: 600 }}>{timeStr}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#eab308', fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>ressonanciaschumann.com</div>
                    <div style={{ color: '#64748b', fontSize: '18px' }}>Dados derivados de espectrograma.<br/>Consulte metodologia e fontes.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Scale preview */}
            <div 
              className="absolute top-0 left-0 bg-[#0f172a] flex flex-col justify-between pointer-events-none origin-top-left border border-border rounded-lg overflow-hidden shadow-xl"
              style={{
                width: formatConfig[format].width,
                height: formatConfig[format].height,
                padding: '80px',
                transform: `scale(\${formatConfig[format].scale})`,
                backgroundImage: 'radial-gradient(circle at top right, rgba(234, 179, 8, 0.1), transparent 40%), radial-gradient(circle at bottom left, rgba(234, 179, 8, 0.05), transparent 40%)'
              }}
              aria-hidden="true"
            >
                <div>
                  <div style={{ color: '#eab308', letterSpacing: '0.3em', fontSize: '24px', fontWeight: 600, marginBottom: '60px' }}>
                    OBSERVATÓRIO DA TERRA
                  </div>
                  <h1 style={{ color: '#f8fafc', fontSize: '90px', fontWeight: 300, lineHeight: 1.1, marginBottom: '20px', textTransform: 'uppercase' }}>
                    RESSONÂNCIA<br/>SCHUMANN HOJE
                  </h1>
                  <div style={{ color: '#94a3b8', fontSize: '32px', letterSpacing: '0.1em', fontWeight: 400 }}>
                    {dateStr}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '40px', marginTop: 'auto', marginBottom: '80px' }}>
                  <div style={{ borderTop: '2px solid rgba(234, 179, 8, 0.3)', paddingTop: '20px' }}>
                    <div style={{ color: '#eab308', fontSize: '24px', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '10px' }}>F1</div>
                    <div style={{ color: '#f8fafc', fontSize: '72px', fontWeight: 300 }}>{formatValue(data.f1)} <span style={{ fontSize: '32px', color: '#64748b' }}>Hz</span></div>
                  </div>
                  <div style={{ borderTop: '2px solid rgba(234, 179, 8, 0.3)', paddingTop: '20px' }}>
                    <div style={{ color: '#eab308', fontSize: '24px', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '10px' }}>F2</div>
                    <div style={{ color: '#f8fafc', fontSize: '72px', fontWeight: 300 }}>{formatValue(data.f2)} <span style={{ fontSize: '32px', color: '#64748b' }}>Hz</span></div>
                  </div>
                  <div style={{ borderTop: '2px solid rgba(234, 179, 8, 0.3)', paddingTop: '20px' }}>
                    <div style={{ color: '#eab308', fontSize: '24px', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '10px' }}>F3</div>
                    <div style={{ color: '#f8fafc', fontSize: '72px', fontWeight: 300 }}>{formatValue(data.f3)} <span style={{ fontSize: '32px', color: '#64748b' }}>Hz</span></div>
                  </div>
                </div>

                {data.intensity !== null && (
                  <div style={{ borderTop: '2px solid rgba(234, 179, 8, 0.3)', paddingTop: '30px', marginBottom: '80px' }}>
                    <div style={{ color: '#eab308', fontSize: '24px', fontWeight: 600, letterSpacing: '0.1em', marginBottom: '10px' }}>INTENSIDADE RELATIVA</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}>
                      <div style={{ color: '#f8fafc', fontSize: '90px', fontWeight: 300 }}>{formatValue(data.intensity)}</div>
                      <div style={{ color: '#64748b', fontSize: '40px', fontWeight: 300 }}>/ 100</div>
                    </div>
                    <div style={{ color: '#94a3b8', fontSize: '24px', marginTop: '10px' }}>Escala relativa • não calibrada em pT</div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '40px' }}>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '20px', marginBottom: '8px' }}>Última observação disponível</div>
                    <div style={{ color: '#f8fafc', fontSize: '32px', fontWeight: 600 }}>{timeStr}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#eab308', fontSize: '24px', fontWeight: 600, marginBottom: '8px' }}>ressonanciaschumann.com</div>
                    <div style={{ color: '#64748b', fontSize: '18px' }}>Dados derivados de espectrograma.<br/>Consulte metodologia e fontes.</div>
                  </div>
                </div>
            </div>
          </div>
        </div>

        {/* Right Side: Controls */}
        <div className="w-full md:w-80 p-6 flex flex-col">
          <h2 id="modal-title" className="text-xl font-medium text-text-main mb-6">Criar Share Card</h2>
          
          <div className="mb-8">
            <label className="text-sm text-text-muted mb-3 block uppercase tracking-wider">Formato</label>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setFormat('feed')}
                className={cn(
                  "py-3 px-4 rounded-xl border text-sm font-medium transition-colors text-center",
                  format === 'feed' 
                    ? "bg-gold/10 border-gold text-gold" 
                    : "border-border text-text-muted hover:border-text-muted/50"
                )}
              >
                Feed 4:5
              </button>
              <button 
                onClick={() => setFormat('story')}
                className={cn(
                  "py-3 px-4 rounded-xl border text-sm font-medium transition-colors text-center",
                  format === 'story' 
                    ? "bg-gold/10 border-gold text-gold" 
                    : "border-border text-text-muted hover:border-text-muted/50"
                )}
              >
                Story 9:16
              </button>
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <button
              onClick={() => handleGenerateImage('download')}
              disabled={isGenerating}
              className="w-full py-3 px-4 rounded-xl border border-gold text-gold hover:bg-gold/10 transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
              <span>Baixar Imagem</span>
            </button>
            
            {!!navigator.share && (
              <button
                onClick={() => handleGenerateImage('share')}
                disabled={isGenerating}
                className="w-full py-3 px-4 rounded-xl bg-gold text-background hover:bg-gold-muted transition-colors flex items-center justify-center gap-2 font-medium disabled:opacity-50"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                <span>Compartilhar</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
