const GIFT_STORAGE_KEY = 'insightdisc_gift_orders';

function safeJsonParse(rawValue, fallback) {
  try {
    return JSON.parse(rawValue);
  } catch {
    return fallback;
  }
}

function hasWindow() {
  return typeof window !== 'undefined';
}

function sanitizeText(value) {
  return String(value || '').trim();
}

export function createGiftToken() {
  const random = Math.random().toString(36).slice(2, 10);
  return `gift_${Date.now().toString(36)}_${random}`;
}

export function normalizeGiftPayload(payload = {}) {
  return {
    senderName: sanitizeText(payload.senderName),
    senderEmail: sanitizeText(payload.senderEmail),
    recipientName: sanitizeText(payload.recipientName),
    recipientEmail: sanitizeText(payload.recipientEmail),
    message: sanitizeText(payload.message),
  };
}

export function buildGiftLink({ token, payload = {}, origin = '' } = {}) {
  const cleanToken = sanitizeText(token);
  if (!cleanToken) return '';

  const cleanPayload = normalizeGiftPayload(payload);
  const baseOrigin = origin || (hasWindow() ? window.location.origin : '');

  if (!baseOrigin) {
    const params = new URLSearchParams();
    if (cleanPayload.senderName) params.set('from', cleanPayload.senderName);
    if (cleanPayload.senderEmail) params.set('senderEmail', cleanPayload.senderEmail);
    if (cleanPayload.recipientName) params.set('to', cleanPayload.recipientName);
    if (cleanPayload.recipientEmail) params.set('recipientEmail', cleanPayload.recipientEmail);
    if (cleanPayload.message) params.set('msg', cleanPayload.message);
    const qs = params.toString();
    return `/gift/${encodeURIComponent(cleanToken)}${qs ? `?${qs}` : ''}`;
  }

  const url = new URL(`${baseOrigin}/gift/${encodeURIComponent(cleanToken)}`);
  if (cleanPayload.senderName) url.searchParams.set('from', cleanPayload.senderName);
  if (cleanPayload.senderEmail) url.searchParams.set('senderEmail', cleanPayload.senderEmail);
  if (cleanPayload.recipientName) url.searchParams.set('to', cleanPayload.recipientName);
  if (cleanPayload.recipientEmail) url.searchParams.set('recipientEmail', cleanPayload.recipientEmail);
  if (cleanPayload.message) url.searchParams.set('msg', cleanPayload.message);
  return url.toString();
}

export function getGiftOrders() {
  if (!hasWindow()) return [];
  const raw = window.localStorage.getItem(GIFT_STORAGE_KEY);
  const parsed = safeJsonParse(raw || '[]', []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveGiftOrder(entry = {}) {
  if (!hasWindow()) return null;
  const token = sanitizeText(entry.token);
  if (!token) return null;

  const payload = normalizeGiftPayload(entry.payload || {});
  const existing = getGiftOrders();
  const now = new Date().toISOString();
  const nextEntry = {
    token,
    payload,
    status: sanitizeText(entry.status) || 'pending',
    createdAt: sanitizeText(entry.createdAt) || now,
    updatedAt: now,
    sessionId: sanitizeText(entry.sessionId),
  };

  const next = [nextEntry, ...existing.filter((item) => item?.token !== token)].slice(0, 200);
  window.localStorage.setItem(GIFT_STORAGE_KEY, JSON.stringify(next));
  return nextEntry;
}

export function findGiftOrder(token) {
  const cleanToken = sanitizeText(token);
  if (!cleanToken) return null;
  return getGiftOrders().find((item) => item?.token === cleanToken) || null;
}

export function markGiftOrderPaid(token, sessionId = '') {
  const current = findGiftOrder(token);
  if (!current) return null;
  return saveGiftOrder({
    token: current.token,
    payload: current.payload,
    createdAt: current.createdAt,
    status: 'paid',
    sessionId: sanitizeText(sessionId) || current.sessionId,
  });
}

export function resolveGiftPayload({ token, searchParams } = {}) {
  const stored = findGiftOrder(token);
  const queryValue = (name) => sanitizeText(searchParams?.get?.(name));

  const payload = normalizeGiftPayload({
    senderName: queryValue('from') || stored?.payload?.senderName,
    senderEmail: queryValue('senderEmail') || stored?.payload?.senderEmail,
    recipientName: queryValue('to') || stored?.payload?.recipientName,
    recipientEmail: queryValue('recipientEmail') || stored?.payload?.recipientEmail,
    message: queryValue('msg') || stored?.payload?.message,
  });

  return {
    token: sanitizeText(token),
    payload,
    status: stored?.status || '',
  };
}
