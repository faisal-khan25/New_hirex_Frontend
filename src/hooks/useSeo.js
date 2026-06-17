import { useEffect } from 'react';

/**
 * useSEO — dynamically updates <title>, meta description,
 * Open Graph, and Twitter Card tags for each page.
 *
 * Usage:
 *   useSEO({
 *     title:       'Browse Jobs — HireX',
 *     description: 'Find your dream job on HireX.',
 *     image:       'https://hirex.in/og-jobs.png',  // optional
 *     url:         'https://hirex.in/jobs',          // optional
 *   });
 */
export default function useSEO({ title, description, image, url } = {}) {
  useEffect(() => {
    const SITE = 'HireX';
    const DEFAULT_IMAGE = 'https://hirex.in/og-default.png';
    const DEFAULT_URL   = typeof window !== 'undefined' ? window.location.href : 'https://hirex.in';

    const fullTitle = title ? `${title} — ${SITE}` : `${SITE} — India's #1 Job Platform`;
    const desc      = description || `${SITE} connects professionals with top companies across India.`;
    const img       = image || DEFAULT_IMAGE;
    const canonical = url || DEFAULT_URL;

    // ── <title> ──────────────────────────────────────────────────
    document.title = fullTitle;

    // ── Helper: set or create a <meta> tag ───────────────────────
    const setMeta = (selector, attr, value) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        // Determine whether to use name= or property= from the selector
        if (selector.includes('property=')) {
          el.setAttribute('property', selector.match(/property="([^"]+)"/)[1]);
        } else {
          el.setAttribute('name', selector.match(/name="([^"]+)"/)[1]);
        }
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    // ── Standard meta ────────────────────────────────────────────
    setMeta('meta[name="description"]',               'content', desc);

    // ── Open Graph ───────────────────────────────────────────────
    setMeta('meta[property="og:title"]',              'content', fullTitle);
    setMeta('meta[property="og:description"]',        'content', desc);
    setMeta('meta[property="og:image"]',              'content', img);
    setMeta('meta[property="og:url"]',                'content', canonical);

    // ── Twitter Card ─────────────────────────────────────────────
    setMeta('meta[name="twitter:title"]',             'content', fullTitle);
    setMeta('meta[name="twitter:description"]',       'content', desc);
    setMeta('meta[name="twitter:image"]',             'content', img);

    // ── Canonical link ───────────────────────────────────────────
    let canonicalEl = document.querySelector('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonical);

  }, [title, description, image, url]);
}
