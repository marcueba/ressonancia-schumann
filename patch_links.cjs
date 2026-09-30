const fs = require('fs');

function patch(file, search, replace) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes(replace)) {
    content = content.replace(search, replace);
    fs.writeFileSync(file, content);
  }
}

// Methodology -> Dados Atuais
patch('src/pages/Methodology.tsx', 
  '<p className="text-text-muted leading-relaxed">', 
  '<Link to="/atual" className="text-gold hover:text-gold-muted text-sm uppercase tracking-widest block mb-4">→ Ver Dados Atuais</Link>\n        <p className="text-text-muted leading-relaxed">'
);
patch('src/pages/Methodology.tsx', "import { useSEO } from '../hooks/useSEO';", "import { useSEO } from '../hooks/useSEO';\nimport { Link } from 'react-router-dom';");

// ERI -> Metodologia
patch('src/pages/ERI.tsx',
  '</div>\n      \n      <div className="bg-surface-hover/20',
  '</div>\n      <div className="text-center mt-8">\n        <Link to="/metodologia" className="text-gold hover:text-gold-muted text-sm uppercase tracking-widest">→ Leia a Metodologia</Link>\n      </div>\n      <div className="bg-surface-hover/20'
);
patch('src/pages/ERI.tsx', "import { useSEO } from '../hooks/useSEO';", "import { useSEO } from '../hooks/useSEO';\nimport { Link } from 'react-router-dom';");

// Solar -> Geomagnetismo
patch('src/pages/Solar.tsx',
  '</p>\n      </div>\n\n      <div',
  '</p>\n        <div className="mt-4">\n          <Link to="/geomagnetica" className="text-gold hover:text-gold-muted text-sm uppercase tracking-widest">→ Ver Atividade Geomagnética (Kp)</Link>\n        </div>\n      </div>\n\n      <div'
);
patch('src/pages/Solar.tsx', "import { useSEO } from '../hooks/useSEO';", "import { useSEO } from '../hooks/useSEO';\nimport { Link } from 'react-router-dom';");

