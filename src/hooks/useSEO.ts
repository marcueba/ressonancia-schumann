import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  path?: string;
  noindex?: boolean;
}

export function useSEO({ title, description, path, noindex }: SEOProps) {
  useEffect(() => {
    // 1. Update Title
    document.title = title;

    // Helper to update or create a meta tag
    const setMeta = (selector: string, nameAttr: string, nameValue: string, content: string) => {
      let el = document.querySelector(`meta[${selector}]`);
      if (content) {
        if (!el) {
          el = document.createElement('meta');
          el.setAttribute(nameAttr, nameValue);
          document.head.appendChild(el);
        }
        el.setAttribute('content', content);
      } else if (el) {
        el.remove();
      }
    };

    // 2. Standard Meta
    setMeta('name="description"', 'name', 'description', description);

    // 3. Robots
    if (noindex) {
      setMeta('name="robots"', 'name', 'robots', 'noindex, follow');
      const existingCanonical = document.querySelector('link[rel="canonical"]');
      if (existingCanonical) existingCanonical.remove();
    } else {
      let metaRobots = document.querySelector('meta[name="robots"]');
      if (metaRobots) metaRobots.remove();

      // Update canonical
      if (path !== undefined) {
        const canonicalUrl = `https://ressonanciaschumann.com${path}`;
        let linkCanonical = document.querySelector('link[rel="canonical"]');
        if (!linkCanonical) {
          linkCanonical = document.createElement('link');
          linkCanonical.setAttribute('rel', 'canonical');
          document.head.appendChild(linkCanonical);
        }
        linkCanonical.setAttribute('href', canonicalUrl);
      }
    }

    // 4. Open Graph & Twitter
    const canonicalUrl = path ? `https://ressonanciaschumann.com${path}` : '';
    const ogImage = 'https://ressonanciaschumann.com/og-image.png';

    if (!noindex) {
      setMeta('property="og:title"', 'property', 'og:title', title);
      setMeta('property="og:description"', 'property', 'og:description', description);
      setMeta('property="og:url"', 'property', 'og:url', canonicalUrl);
      setMeta('property="og:type"', 'property', 'og:type', 'website');
      setMeta('property="og:site_name"', 'property', 'og:site_name', 'Observatório da Terra');
      setMeta('property="og:locale"', 'property', 'og:locale', 'pt_BR');
      setMeta('property="og:image"', 'property', 'og:image', ogImage);
      setMeta('property="og:image:width"', 'property', 'og:image:width', '1200');
      setMeta('property="og:image:height"', 'property', 'og:image:height', '630');
      setMeta('property="og:image:type"', 'property', 'og:image:type', 'image/png');
      setMeta('property="og:image:alt"', 'property', 'og:image:alt', 'Ressonância Schumann — Observatório da Terra');

      setMeta('name="twitter:card"', 'name', 'twitter:card', 'summary_large_image');
      setMeta('name="twitter:title"', 'name', 'twitter:title', title);
      setMeta('name="twitter:description"', 'name', 'twitter:description', description);
      setMeta('name="twitter:image"', 'name', 'twitter:image', ogImage);
      setMeta('name="twitter:image:alt"', 'name', 'twitter:image:alt', 'Ressonância Schumann — Observatório da Terra');
    } else {
      // Remove OG tags for 404
      ['og:title', 'og:description', 'og:url', 'og:type', 'og:site_name', 'og:locale', 'og:image', 'og:image:width', 'og:image:height', 'og:image:type', 'og:image:alt'].forEach(prop => {
        const el = document.querySelector(`meta[property="${prop}"]`);
        if (el) el.remove();
      });
      ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt'].forEach(name => {
        const el = document.querySelector(`meta[name="${name}"]`);
        if (el) el.remove();
      });
    }

    // 5. JSON-LD
    const updateJsonLd = (id: string, data: any) => {
      let script = document.getElementById(id);
      if (data) {
        if (!script) {
          script = document.createElement('script');
          script.id = id;
          script.type = 'application/ld+json';
          document.head.appendChild(script);
        }
        script.textContent = JSON.stringify(data);
      } else if (script) {
        script.remove();
      }
    };

    if (!noindex && path !== undefined) {
      const isHome = path === '/';

      if (isHome) {
        updateJsonLd('jsonld-website', {
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Observatório da Terra",
          "url": "https://ressonanciaschumann.com/",
          "description": description
        });
        updateJsonLd('jsonld-webpage', null);
        updateJsonLd('jsonld-breadcrumb', null);
      } else {
        updateJsonLd('jsonld-website', null);
        updateJsonLd('jsonld-webpage', {
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": title,
          "description": description,
          "url": canonicalUrl,
          "isPartOf": {
            "@type": "WebSite",
            "name": "Observatório da Terra",
            "url": "https://ressonanciaschumann.com/"
          }
        });

        let pageName = title.split('|')[0].trim();
        updateJsonLd('jsonld-breadcrumb', {
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Observatório da Terra",
              "item": "https://ressonanciaschumann.com/"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": pageName,
              "item": canonicalUrl
            }
          ]
        });
      }
    } else {
      // 404 or no path
      updateJsonLd('jsonld-website', null);
      updateJsonLd('jsonld-webpage', null);
      updateJsonLd('jsonld-breadcrumb', null);
    }

  }, [title, description, path, noindex]);
}
