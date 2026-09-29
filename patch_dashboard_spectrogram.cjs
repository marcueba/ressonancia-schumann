const fs = require('fs');

let text = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const importSearch = "import { SchumannTimelineChart } from '../components/SchumannTimelineChart';";
const importReplace = "import { SchumannTimelineChart } from '../components/SchumannTimelineChart';\nimport { SchumannSpectrogramPanel } from '../components/SchumannSpectrogramPanel';";
text = text.replace(importSearch, importReplace);

const panelSearch = `        />
      </div>
      
      <div className="space-y-4 mt-8 mb-8">`;
const panelReplace = `        />
      </div>

      <div className="mt-8 mb-8">
        <SchumannSpectrogramPanel 
          currentF1={currentData?.fundamental?.frequency}
          currentF2={currentData?.mode2?.frequency}
          currentF3={currentData?.mode3?.frequency}
          timestamp={currentData?.timestamp}
        />
      </div>
      
      <div className="space-y-4 mt-8 mb-8">`;
text = text.replace(panelSearch, panelReplace);

fs.writeFileSync('src/pages/Dashboard.tsx', text);
