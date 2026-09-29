const fs = require('fs');
let content = fs.readFileSync('server/providers/SchumannProviders.ts', 'utf8');

const oldCode = `          collected_at: new Date().toISOString()
        };`;
        
const newCode = `          collected_at: new Date().toISOString(),
          relativeIntensity: json.fundamental?.intensidade ? {
            value: json.fundamental.intensidade,
            scale: "0-100",
            calibrated: false,
            source: "spectrogram_color_scale"
          } : undefined
        };`;

if (!content.includes('relativeIntensity: json.fundamental?.intensidade')) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync('server/providers/SchumannProviders.ts', content);
}
