const fs = require('fs');

function addImage(file, imgPath) {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('image: "')) {
    content = content.replace('articleDate:', `image: "${imgPath}",\n    articleDate:`);
    fs.writeFileSync(file, content);
  }
}

addImage('src/pages/ArticleSchumann.tsx', '/og-article-1.jpg');
addImage('src/pages/ArticleSchumannToday.tsx', '/og-article-2.jpg');
addImage('src/pages/ArticleHeartbeat.tsx', '/og-article-3.jpg');

