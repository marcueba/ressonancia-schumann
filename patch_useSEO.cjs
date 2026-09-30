const fs = require('fs');

let seoContent = fs.readFileSync('src/hooks/useSEO.ts', 'utf8');

if (!seoContent.includes('image?: string;')) {
  seoContent = seoContent.replace('noindex?: boolean;', 'noindex?: boolean;\n  image?: string;');
  seoContent = seoContent.replace(
    'export function useSEO({ title, description, path, noindex, isArticle, articleDate }: SEOProps) {',
    'export function useSEO({ title, description, path, noindex, isArticle, articleDate, image }: SEOProps) {'
  );
  seoContent = seoContent.replace(
    "const ogImage = 'https://ressonanciaschumann.com/og-image.png';",
    "const ogImage = image ? `https://ressonanciaschumann.com${image}` : 'https://ressonanciaschumann.com/og-image.jpg';"
  );
  // Also change the png in the image type to jpeg since I saved them as jpg
  seoContent = seoContent.replace(
    "setMeta('property=\"og:image:type\"', 'property', 'og:image:type', 'image/png');",
    "setMeta('property=\"og:image:type\"', 'property', 'og:image:type', 'image/jpeg');"
  );
  fs.writeFileSync('src/hooks/useSEO.ts', seoContent);
}
