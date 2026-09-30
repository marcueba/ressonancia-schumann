const fs = require('fs');

let content = fs.readFileSync('scripts/prerender.cjs', 'utf8');
if (!content.includes('fs.mkdirSync(dir, { recursive: true });')) {
  content = content.replace(
    'fs.writeFileSync(filePath, html);',
    "const dir = path.dirname(filePath);\n    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });\n    fs.writeFileSync(filePath, html);"
  );
  fs.writeFileSync('scripts/prerender.cjs', content);
}
