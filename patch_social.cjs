const fs = require('fs');

function addShareToArticle(file, title, url) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('SocialShare')) {
    content = content.replace("import { Link } from 'react-router-dom';", "import { Link } from 'react-router-dom';\nimport { SocialShare } from '../components/SocialShare';");
    const shareHtml = `
        <SocialShare 
          title="${title}"
          url="https://ressonanciaschumann.com${url}" 
        />
      </article>`;
    content = content.replace('</article>', shareHtml);
    fs.writeFileSync(file, content);
  }
}

addShareToArticle('src/pages/ArticleSchumann.tsx', 'O que é a Ressonância Schumann?', '/artigos/o-que-e-ressonancia-schumann');
addShareToArticle('src/pages/ArticleSchumannToday.tsx', 'Ressonância Schumann Hoje: Como Interpretar os Dados', '/artigos/ressonancia-schumann-hoje');
addShareToArticle('src/pages/ArticleHeartbeat.tsx', 'Batimento Cardíaco da Terra: O que é a Ressonância Schumann?', '/artigos/batimento-cardiaco-da-terra');

// Add to Dashboard (after the cards/layout)
let db = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
if (!db.includes('SocialShare')) {
  db = db.replace("import { Activity, Radio, AlertCircle } from 'lucide-react';", "import { Activity, Radio, AlertCircle } from 'lucide-react';\nimport { SocialShare } from '../components/SocialShare';");
  const shareHtml = `      <SocialShare 
        title="Ressonância Schumann Hoje | Observatório da Terra"
        url="https://ressonanciaschumann.com/" 
      />
    </div>
  );
}`;
  db = db.replace('    </div>\n  );\n}', shareHtml);
  fs.writeFileSync('src/pages/Dashboard.tsx', db);
}

