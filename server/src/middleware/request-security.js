import { sendSafeJsonError } from '../lib/http-security.js';

function nowMs() {
  return Date.now();
}

export function getClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '')
    .split(',')[0]
    .trim();
  if (forwarded) return forwarded;

  return String(req.ip || req.socket?.remoteAddress || 'unknown').trim() || 'unknown';
}

export function createIpRateLimiter({
  windowMs = 60_000,
  maxRequests = 60,
  keyPrefix = 'default',
  message = 'Muitas requisições. Tente novamente em instantes.',
  errorCode = 'TOO_MANY_REQUESTS',
  skip,
} = {}) {
  const store = new Map();

  function pruneExpiredEntries(currentTime) {
    for (const [key, entry] of store.entries()) {
      if (currentTime > entry.resetAt) {
        store.delete(key);
      }
    }
  }

  return function rateLimitMiddleware(req, res, next) {
    if (String(req.method || '').toUpperCase() === 'OPTIONS') {
      return next();
    }

    if (typeof skip === 'function' && skip(req)) {
      return next();
    }

    const currentTime = nowMs();
    if (store.size > 5000) {
      pruneExpiredEntries(currentTime);
    }

    const key = `${keyPrefix}:${getClientIp(req)}`;
    const current = store.get(key);
    const entry =
      !current || currentTime > current.resetAt
        ? { count: 0, resetAt: currentTime + Number(windowMs || 60_000) }
        : current;

    entry.count += 1;
    store.set(key, entry);

    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - currentTime) / 1000));
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, Number(maxRequests) - entry.count)));
    res.setHeader('X-RateLimit-Reset', String(entry.resetAt));

    if (entry.count > Number(maxRequests || 0)) {
      res.setHeader('Retry-After', String(retryAfter));
      return sendSafeJsonError(res, {
        status: 429,
        error: errorCode,
        message,
      });
    }

    return next();
  };
}

export function createConcurrencyLimiter({
  maxConcurrent = 4,
  maxQueue = 100,
  errorCode = 'SERVER_BUSY',
  message = 'Servidor temporariamente ocupado. Tente novamente em instantes.',
} = {}) {
  let activeCount = 0;
  const queue = [];

  function releaseNext() {
    const nextEntry = queue.shift();
    if (!nextEntry) return;

    const { req, res, next } = nextEntry;
    if (req.destroyed || res.writableEnded) {
      releaseNext();
      return;
    }

    activeCount += 1;
    let released = false;

    const release = () => {
      if (released) return;
      released = true;
      activeCount = Math.max(0, activeCount - 1);
      releaseNext();
    };

    res.on('finish', release);
    res.on('close', release);
    res.on('error', release);
    next();
  }

  return function concurrencyLimiter(req, res, next) {
    if (activeCount < Number(maxConcurrent || 1)) {
      activeCount += 1;
      let released = false;

      const release = () => {
        if (released) return;
        released = true;
        activeCount = Math.max(0, activeCount - 1);
        releaseNext();
      };

      res.on('finish', release);
      res.on('close', release);
      res.on('error', release);
      return next();
    }

    if (queue.length >= Number(maxQueue || 0)) {
      return sendSafeJsonError(res, {
        status: 503,
        error: errorCode,
        message,
      });
    }

    queue.push({ req, res, next });
    return undefined;
  };
}
