export function trackEvent(eventName, payload = {}) {
  const name = String(eventName || '').trim();
  if (!name || typeof window === 'undefined') return;

  const eventPayload = {
    event: name,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  if (Array.isArray(window.dataLayer)) {
    window.dataLayer.push(eventPayload);
  }

  window.dispatchEvent(
    new CustomEvent('insightdisc:analytics', {
      detail: eventPayload,
    })
  );

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('[analytics]', eventPayload);
  }
}
