const fs = require('fs');

const useSeoPath = 'src/hooks/useSEO.ts';
let content = fs.readFileSync(useSeoPath, 'utf8');

// Add isArticle
content = content.replace('noindex?: boolean;', 'noindex?: boolean;\n  isArticle?: boolean;\n  articleDate?: string;');
content = content.replace('export function useSEO({ title, description, path, noindex }: SEOProps) {', 'export function useSEO({ title, description, path, noindex, isArticle, articleDate }: SEOProps) {');
content = content.replace("setMeta('property=\"og:type\"', 'property', 'og:type', 'website');", "setMeta('property=\"og:type\"', 'property', 'og:type', isArticle ? 'article' : 'website');");

// Article JSON-LD
const articleJsonLd = `
      if (isArticle) {
        updateJsonLd('jsonld-article', {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": title,
          "description": description,
          "author": {
            "@type": "Organization",
            "name": "Observatório da Terra",
            "url": "https://ressonanciaschumann.com/"
          },
          "publisher": {
            "@type": "Organization",
            "name": "Observatório da Terra",
            "logo": {
              "@type": "ImageObject",
              "url": "https://ressonanciaschumann.com/favicon.svg"
            }
          },
          "datePublished": articleDate || new Date().toISOString(),
          "dateModified": articleDate || new Date().toISOString(),
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalUrl
          },
          "image": ogImage
        });
      } else {
        updateJsonLd('jsonld-article', null);
      }
`;

content = content.replace("updateJsonLd('jsonld-breadcrumb', {", articleJsonLd + "\n        updateJsonLd('jsonld-breadcrumb', {");
content = content.replace("updateJsonLd('jsonld-breadcrumb', null);", "updateJsonLd('jsonld-article', null);\n      updateJsonLd('jsonld-breadcrumb', null);");

fs.writeFileSync(useSeoPath, content);
