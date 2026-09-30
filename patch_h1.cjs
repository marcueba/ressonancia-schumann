const fs = require('fs');

let db = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');
if (db.includes('<h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Observatório da Terra</h1>')) {
  db = db.replace(
    '<h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Observatório da Terra</h1>\n        <p className="text-text-muted">Monitoramento em tempo real da atividade eletromagnética, solar e geomagnética.</p>',
    '<h1 className="text-3xl font-light tracking-wide text-text-main mb-2">Ressonância Schumann Hoje</h1>\n        <p className="text-text-muted">Observatório de frequências, espectrograma e contexto geofísico.</p>'
  );
  fs.writeFileSync('src/pages/Dashboard.tsx', db);
}

