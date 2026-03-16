function unique(items = []) {
  return [...new Set(items.map((item) => String(item || '').trim()).filter(Boolean))];
}

export function sanitizeLogText(value = '', maximumLength = 240) {
  let text = String(value ?? '').replace(/\s+/g, ' ').trim();

  const replacements = [
    [/(bearer\s+)[a-z0-9\-_.]+/gi, '$1[REDACTED]'],
    [/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi, '[REDACTED_EMAIL]'],
    [/\b(?:sk|rk|pk|AIza)[a-z0-9_\-]{8,}\b/gi, '[REDACTED_KEY]'],
    [/(password(?:Hash)?["'=:\s]+)([^,\s}]+)/gi, '$1[REDACTED]'],
    [/(token["'=:\s]+)([^,\s}]+)/gi, '$1[REDACTED]'],
    [/(api[_-]?key["'=:\s]+)([^,\s}]+)/gi, '$1[REDACTED]'],
    [/(secret["'=:\s]+)([^,\s}]+)/gi, '$1[REDACTED]'],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return text.slice(0, Math.max(32, Number(maximumLength || 240)));
}

export function getSafeErrorCode(error, fallback = 'INTERNAL_ERROR') {
  const name = String(error?.name || '').trim().toUpperCase();
  if (name === 'TOKENEXPIREDERROR') return 'TOKEN_EXPIRED';
  if (name === 'JSONWEBTOKENERROR' || name === 'NOTBEFOREERROR') return 'INVALID_TOKEN';

  const message = String(error?.message || '').trim().toUpperCase();
  if (!message) return fallback;
  if (message.includes('TOKEN_EXPIRED')) return 'TOKEN_EXPIRED';
  if (message.includes('INVALID_TOKEN')) return 'INVALID_TOKEN';
  if (message.includes('UNAUTHORIZED')) return 'UNAUTHORIZED';
  if (message.includes('FORBIDDEN')) return 'FORBIDDEN';
  if (message.includes('TOO_MANY_REQUESTS')) return 'TOO_MANY_REQUESTS';
  if (message.includes('INVALID_JSON')) return 'INVALID_JSON';
  return fallback;
}

export function normalizeOrigin(value = '') {
  try {
    return new URL(String(value || '').trim()).origin;
  } catch {
    return '';
  }
}

export function buildAllowedOrigins({ appUrl = '', extraOrigins = [], nodeEnv = 'development' } = {}) {
  const baseOrigins = [
    normalizeOrigin(appUrl),
    ...String(extraOrigins || '')
      .split(',')
      .map((item) => normalizeOrigin(item)),
  ];

  if (String(nodeEnv || '').trim().toLowerCase() !== 'production') {
    baseOrigins.push(
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173',
      'http://localhost:4000',
      'http://127.0.0.1:4000',
    );
  }

  return unique(baseOrigins);
}

export function isOriginAllowed(origin = '', allowedOrigins = []) {
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;
  return new Set(unique(allowedOrigins)).has(normalized);
}

export function sendSafeJsonError(
  res,
  {
    status = 500,
    error = 'INTERNAL_ERROR',
    message = 'Não foi possível processar a solicitação.',
    details,
  } = {},
) {
  const payload = {
    ok: false,
    error: String(error || 'INTERNAL_ERROR'),
  };

  if (message) {
    payload.message = String(message);
  }

  if (details && (!Array.isArray(details) || details.length > 0)) {
    payload.details = details;
  }

  return res.status(Number(status) || 500).json(payload);
}
