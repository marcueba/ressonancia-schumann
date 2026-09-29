const fs = require('fs');
let text = fs.readFileSync('server/providers/NoaaProvider.ts', 'utf8');

text = text.replace(/flux: null as any,/g, 'flux: null,');

fs.writeFileSync('server/providers/NoaaProvider.ts', text);
