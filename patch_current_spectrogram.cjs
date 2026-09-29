const fs = require('fs');
let text = fs.readFileSync('src/pages/CurrentResonance.tsx', 'utf8');

const importSearch = "import { Activity, Info } from 'lucide-react';";
const importReplace = "import { Activity, Info } from 'lucide-react';\nimport { SchumannSpectrogramPanel } from '../components/SchumannSpectrogramPanel';";
text = text.replace(importSearch, importReplace);

const injectSearch = `      {data && data.derived_from_image && (
        <Card className="mt-6 bg-surface/50 border-primary/20">`;
const injectReplace = `      {data && (
        <div className="mt-6">
          <SchumannSpectrogramPanel 
            currentF1={data.fundamental.frequency}
            currentF2={data.mode2.frequency}
            currentF3={data.mode3.frequency}
            timestamp={data.timestamp}
          />
        </div>
      )}
      
      {data && data.derived_from_image && (
        <Card className="mt-6 bg-surface/50 border-primary/20">`;
text = text.replace(injectSearch, injectReplace);

fs.writeFileSync('src/pages/CurrentResonance.tsx', text);
