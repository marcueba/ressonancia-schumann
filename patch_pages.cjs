const fs = require('fs');

const pages = [
  {
    path: 'src/pages/Dashboard.tsx',
    oldTitle: /title:\s*".*?"/,
    oldDesc: /description:\s*".*?"/,
    newTitle: 'title: "Ressonância Schumann Hoje | Dados, Gráficos e Monitoramento"',
    newDesc: 'description: "Acompanhe a Ressonância Schumann hoje com frequências F1, F2 e F3, espectrograma, histórico observacional e contexto geomagnético e solar."'
  },
  {
    path: 'src/pages/CurrentResonance.tsx',
    oldTitle: /title:\s*".*?"/,
    oldDesc: /description:\s*".*?"/,
    newTitle: 'title: "Dados Atuais da Ressonância Schumann | Frequências Hoje"',
    newDesc: 'description: "Últimas observações da Ressonância Schumann hoje. Monitoramento das frequências F1, F2, F3 e intensidade relativa derivadas do espectrograma."'
  },
  {
    path: 'src/pages/History.tsx',
    oldTitle: /title:\s*".*?"/,
    oldDesc: /description:\s*".*?"/,
    newTitle: 'title: "Histórico da Ressonância Schumann | Frequências F1, F2 e F3"',
    newDesc: 'description: "Consulte o histórico observacional da Ressonância Schumann. Gráficos de variação temporal para as frequências F1, F2 e F3 nas últimas 24h, 7 dias ou mais."'
  },
  {
    path: 'src/pages/Stations.tsx',
    oldTitle: /title:\s*".*?"/,
    oldDesc: /description:\s*".*?"/,
    newTitle: 'title: "Estações de Monitoramento ELF | Ressonância Schumann"',
    newDesc: 'description: "Conheça o status e a localização das estações de monitoramento ELF (Extremely Low Frequency) utilizadas para coleta de dados da Ressonância Schumann."'
  },
  {
    path: 'src/pages/Geomagnetic.tsx',
    oldTitle: /title:\s*".*?"/,
    oldDesc: /description:\s*".*?"/,
    newTitle: 'title: "Índice Kp Hoje | Atividade Geomagnética e Tempestades Solares"',
    newDesc: 'description: "Monitore a atividade geomagnética global através do Índice Kp. Acompanhe tempestades magnéticas que podem interagir com a cavidade Terra-ionosfera."'
  },
  {
    path: 'src/pages/Solar.tsx',
    oldTitle: /title:\s*".*?"/,
    oldDesc: /description:\s*".*?"/,
    newTitle: 'title: "Atividade Solar Hoje | Vento Solar, Bz, F10.7 e Raios X"',
    newDesc: 'description: "Acompanhe a atividade solar atual. Monitoramento do vento solar, campo magnético interplanetário (Bz), fluxo solar F10.7 e erupções de Raios X (GOES)."'
  },
  {
    path: 'src/pages/ERI.tsx',
    oldTitle: /title:\s*".*?"/,
    oldDesc: /description:\s*".*?"/,
    newTitle: 'title: "Earth Resonance Index (ERI) | Ressonância Schumann"',
    newDesc: 'description: "O Earth Resonance Index é um indicador estatístico experimental em desenvolvimento para avaliar desvios da Ressonância Schumann."'
  },
  {
    path: 'src/pages/Methodology.tsx',
    oldTitle: /title:\s*".*?"/,
    oldDesc: /description:\s*".*?"/,
    newTitle: 'title: "Como Medimos a Ressonância Schumann | Metodologia e Fontes"',
    newDesc: 'description: "Entenda a metodologia técnica, as fontes de dados e as limitações na coleta e processamento das medições da Ressonância Schumann apresentadas no observatório."'
  }
];

for (const page of pages) {
  if (fs.existsSync(page.path)) {
    let content = fs.readFileSync(page.path, 'utf8');
    content = content.replace(page.oldTitle, page.newTitle);
    content = content.replace(page.oldDesc, page.newDesc);
    fs.writeFileSync(page.path, content);
    console.log(`Updated ${page.path}`);
  }
}
