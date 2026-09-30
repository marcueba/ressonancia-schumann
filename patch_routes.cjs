const fs = require('fs');

// Patch App.tsx
let appContent = fs.readFileSync('src/App.tsx', 'utf8');
if (!appContent.includes('Articles')) {
  appContent = appContent.replace("import { HistoryPage } from './pages/History';", "import { HistoryPage } from './pages/History';\nimport { Articles } from './pages/Articles';\nimport { ArticleSchumann } from './pages/ArticleSchumann';");
  appContent = appContent.replace("<Route path=\"metodologia\" element={<Methodology />} />", "<Route path=\"metodologia\" element={<Methodology />} />\n          <Route path=\"artigos\" element={<Articles />} />\n          <Route path=\"artigos/o-que-e-ressonancia-schumann\" element={<ArticleSchumann />} />");
  fs.writeFileSync('src/App.tsx', appContent);
  console.log('App.tsx updated');
}

// Patch Sidebar.tsx
let sidebarContent = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');
if (!sidebarContent.includes('{ path: \'/artigos\', label: \'Artigos\'')) {
  sidebarContent = sidebarContent.replace("import { \n  Activity,", "import { \n  Activity,\n  BookOpen,");
  sidebarContent = sidebarContent.replace("{ path: '/metodologia', label: 'Metodologia', icon: Database },", "{ path: '/metodologia', label: 'Metodologia', icon: Database },\n  { path: '/artigos', label: 'Artigos', icon: BookOpen },");
  fs.writeFileSync('src/components/Sidebar.tsx', sidebarContent);
  console.log('Sidebar.tsx updated');
}

// Patch prerender.cjs to include the new routes
let prerenderContent = fs.readFileSync('scripts/prerender.cjs', 'utf8');
if (!prerenderContent.includes("'/artigos',")) {
  prerenderContent = prerenderContent.replace("'/metodologia',", "'/metodologia',\n  '/artigos',\n  '/artigos/o-que-e-ressonancia-schumann',");
  fs.writeFileSync('scripts/prerender.cjs', prerenderContent);
  console.log('prerender.cjs updated');
}

