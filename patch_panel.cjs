const fs = require('fs');
let text = fs.readFileSync('src/components/SchumannSpectrogramPanel.tsx', 'utf8');

// Timestamp Text
text = text.replace(
  '<span className="text-text-muted">Horário Extração:</span>',
  '<span className="text-text-muted">Horário observação derivada:</span>'
);

// Add Disclaimer about image timestamp
const appendNotice = `          <div className="mt-8 pt-4 border-t border-border space-y-2">
            <h4 className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Proveniência</h4>`;
const newNotice = `          <div className="mt-8 pt-4 border-t border-border space-y-2">
            <p className="text-[10px] text-text-muted leading-tight mb-4">
              * O timestamp da imagem de origem não é fornecido separadamente pela fonte.
            </p>
            <h4 className="text-[10px] uppercase tracking-widest text-text-muted mb-2">Proveniência</h4>`;
text = text.replace(appendNotice, newNotice);

// Refresh Logic
const useEffectOld = `  useEffect(() => {
    const timeBucket = Math.floor(Date.now() / (1000 * 300)); // 5 minutes bucket
    setImgUrl(\`/api/spectrogram/tomsk?t=\${timeBucket}\`);
    setHasError(false);
    setLoading(true);
  }, []);`;

const useEffectNew = `  useEffect(() => {
    const fetchImage = () => {
      const timeBucket = Math.floor(Date.now() / (1000 * 300)); // 5 minutes bucket
      setImgUrl(\`/api/spectrogram/tomsk?t=\${timeBucket}\`);
      setHasError(false);
      setLoading(true);
    };
    
    fetchImage();
    
    // Refresh a cada 5 minutos
    const interval = setInterval(fetchImage, 300000);
    return () => clearInterval(interval);
  }, []);`;
text = text.replace(useEffectOld, useEffectNew);

fs.writeFileSync('src/components/SchumannSpectrogramPanel.tsx', text);
