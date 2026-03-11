const STORAGE_PREFIX = 'insightdisc:behavior-history:';

function makeKey(scope = 'global') {
  return `${STORAGE_PREFIX}${String(scope || 'global').trim().toLowerCase()}`;
}

function safeJsonParse(raw = '[]') {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readBehaviorHistory(scope = 'global') {
  if (typeof window === 'undefined') return [];
  return safeJsonParse(window.localStorage.getItem(makeKey(scope)) || '[]');
}

export function recordBehaviorHistoryEntry(scope = 'global', entry = {}) {
  if (typeof window === 'undefined') return [];
  const current = readBehaviorHistory(scope);
  const normalized = {
    id: String(entry?.id || `${Date.now()}`).trim(),
    date: entry?.date || new Date().toISOString(),
    profileCode: String(entry?.profileCode || '').toUpperCase(),
    scores: entry?.scores || {},
  };

  const next = [...current.filter((item) => item.id !== normalized.id), normalized]
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime())
    .slice(-120);
  window.localStorage.setItem(makeKey(scope), JSON.stringify(next));
  return next;
}
