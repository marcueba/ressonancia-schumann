const fs = require('fs');
let text = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

text = text.replace(/currentData\?/g, 'schumann?.data?');

fs.writeFileSync('src/pages/Dashboard.tsx', text);
