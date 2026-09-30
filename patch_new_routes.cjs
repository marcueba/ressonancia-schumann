const fs = require('fs');

// Patch App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
if (!appContent.includes('ArticleSchumannToday')) {
  appContent = appContent.replace(
    "import { ArticleSchumann } from './pages/ArticleSchumann';",
    "import { ArticleSchumann } from './pages/ArticleSchumann';\nimport { ArticleSchumannToday } from './pages/ArticleSchumannToday';\nimport { ArticleHeartbeat } from './pages/ArticleHeartbeat';"
  );
  appContent = appContent.replace(
    '<Route path="artigos/o-que-e-ressonancia-schumann" element={<ArticleSchumann />} />',
    '<Route path="artigos/o-que-e-ressonancia-schumann" element={<ArticleSchumann />} />\n          <Route path="artigos/ressonancia-schumann-hoje" element={<ArticleSchumannToday />} />\n          <Route path="artigos/batimento-cardiaco-da-terra" element={<ArticleHeartbeat />} />'
  );
  fs.writeFileSync('src/App.tsx', appContent);
}

// Patch prerender.cjs
let prerenderContent = fs.readFileSync('scripts/prerender.cjs', 'utf8');
if (!prerenderContent.includes("'/artigos/ressonancia-schumann-hoje',")) {
  prerenderContent = prerenderContent.replace(
    "'/artigos/o-que-e-ressonancia-schumann',",
    "'/artigos/o-que-e-ressonancia-schumann',\n  '/artigos/ressonancia-schumann-hoje',\n  '/artigos/batimento-cardiaco-da-terra',"
  );
  fs.writeFileSync('scripts/prerender.cjs', prerenderContent);
}

// Patch sitemap.xml
let sitemap = fs.readFileSync('public/sitemap.xml', 'utf8');
if (!sitemap.includes('artigos/ressonancia-schumann-hoje')) {
  sitemap = sitemap.replace(
    '<url><loc>https://ressonanciaschumann.com/artigos/o-que-e-ressonancia-schumann</loc></url>',
    '<url><loc>https://ressonanciaschumann.com/artigos/o-que-e-ressonancia-schumann</loc></url>\n  <url><loc>https://ressonanciaschumann.com/artigos/ressonancia-schumann-hoje</loc></url>\n  <url><loc>https://ressonanciaschumann.com/artigos/batimento-cardiaco-da-terra</loc></url>'
  );
  fs.writeFileSync('public/sitemap.xml', sitemap);
}

