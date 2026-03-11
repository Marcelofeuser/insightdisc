import { useEffect } from 'react';

function upsertMeta(selector, attrName, attrValue, content) {
  let node = document.head.querySelector(selector);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attrName, attrValue);
    document.head.appendChild(node);
  }
  node.setAttribute('content', content || '');
}

export function useMarketingMeta(meta = {}) {
  const title = meta?.title || 'InsightDISC';
  const description =
    meta?.description || 'InsightDISC - Plataforma de inteligencia comportamental DISC para pessoas, lideres e empresas.';

  useEffect(() => {
    document.title = title;
    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
  }, [title, description]);
}

