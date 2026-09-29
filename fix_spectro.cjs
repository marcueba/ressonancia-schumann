const fs = require('fs');
let content = fs.readFileSync('src/components/SchumannSpectrogramPanel.tsx', 'utf8');

const oldExtraction = `<div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-sm font-medium text-text-muted">F1</span>
                <span className="text-lg font-mono text-primary">{current.fundamental.frequency?.toFixed(2) || '--'} Hz</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-sm font-medium text-text-muted">F2</span>
                <span className="text-lg font-mono text-accent">{current.mode2?.frequency?.toFixed(2) || '--'} Hz</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-sm font-medium text-text-muted">F3</span>
                <span className="text-lg font-mono text-gold">{current.mode3?.frequency?.toFixed(2) || '--'} Hz</span>
              </div>
            </div>`;

const newExtraction = `<div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-sm font-medium text-text-muted">F1</span>
                <span className="text-lg font-mono text-primary">{current.fundamental.frequency?.toFixed(2) || '--'} Hz</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-sm font-medium text-text-muted">F2</span>
                <span className="text-lg font-mono text-accent">{current.mode2?.frequency?.toFixed(2) || '--'} Hz</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-sm font-medium text-text-muted">F3</span>
                <span className="text-lg font-mono text-gold">{current.mode3?.frequency?.toFixed(2) || '--'} Hz</span>
              </div>
              {current.relativeIntensity && (
                <div className="flex justify-between items-center pb-2 border-b border-white/5 mt-4 pt-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-text-muted uppercase">Intensidade F1</span>
                    <span className="text-[10px] text-text-muted">relativa</span>
                  </div>
                  <span className="text-lg font-mono text-violet">{current.relativeIntensity.value.toFixed(1)} / 100</span>
                </div>
              )}
            </div>`;

if (!content.includes('Intensidade F1')) {
    content = content.replace(oldExtraction, newExtraction);
    fs.writeFileSync('src/components/SchumannSpectrogramPanel.tsx', content);
}
