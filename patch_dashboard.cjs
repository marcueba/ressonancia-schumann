const fs = require('fs');

let db = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

if (!db.includes('ShareCardModal')) {
  // Add imports
  db = db.replace(
    "import { SocialShare } from '../components/SocialShare';",
    "import { SocialShare } from '../components/SocialShare';\nimport { ShareCardModal } from '../components/ShareCardModal';\nimport { useState } from 'react';\nimport { Share2 } from 'lucide-react';"
  );
  
  // Add state
  db = db.replace(
    'export function Dashboard() {',
    'export function Dashboard() {\n  const [isShareModalOpen, setIsShareModalOpen] = useState(false);'
  );

  // Add Button next to "Ressonância Atual" header
  const headerHtml = `
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Ressonância Atual</h1>
          <p className="text-text-muted">Monitoramento da cavidade Terra-ionosfera</p>
        </div>
        <button 
          onClick={() => setIsShareModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border hover:border-gold/50 text-gold text-sm font-medium rounded-lg transition-colors uppercase tracking-widest whitespace-nowrap"
        >
          <Share2 className="w-4 h-4" />
          <span>Criar Share Card</span>
        </button>
      </div>`;
  
  db = db.replace(
    `      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Ressonância Atual</h1>
        <p className="text-text-muted">Monitoramento da cavidade Terra-ionosfera</p>
      </div>`,
    headerHtml
  );

  // Add Modal at the end
  const modalHtml = `
      <ShareCardModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)}
        data={{
          f1: currentData?.f1 ?? null,
          f2: currentData?.f2 ?? null,
          f3: currentData?.f3 ?? null,
          intensity: currentData?.amplitude_relative ?? null,
          timestamp: currentData?.timestamp ?? null
        }}
      />
    </div>
  );
}`;
  
  db = db.replace('    </div>\n  );\n}', modalHtml);
  fs.writeFileSync('src/pages/Dashboard.tsx', db);
}
