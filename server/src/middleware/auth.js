import { verifyJwt } from '../lib/security.js';
import { getSafeErrorCode, sendSafeJsonError } from '../lib/http-security.js';
import { isTransientPrismaConnectionError, prisma, withPrismaRetry } from '../lib/prisma.js';
import { env } from '../config/env.js';

function extractBearerToken(header = '') {
  if (!header) return '';
  const [scheme, token] = String(header).split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return '';
  return token || '';
}

async function resolveAuthContext(req) {
  const token = extractBearerToken(req.headers.authorization);
  if (!token && env.nodeEnv !== 'production' && env.allowDevEmailAuth) {
    const email = String(req.headers['x-insight-user-email'] || '').trim().toLowerCase();
    if (!email) return null;

    const user = await withPrismaRetry(
      () =>
        prisma.user.findUnique({
          where: { email },
          select: { id: true, email: true, role: true },
        }),
      { retries: 1 }
    );
    if (!user) {
      const error = new Error('UNAUTHORIZED');
      error.statusCode = 401;
      throw error;
    }

    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      scope: 'dev-email-header',
      source: 'dev-email-header',
    };
  }

  if (!token) return null;

  const payload = verifyJwt(token);
  const user = await withPrismaRetry(
    () =>
      prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, role: true },
      }),
    { retries: 1 }
  );
  if (!user) {
    const error = new Error('INVALID_TOKEN');
    error.statusCode = 401;
    throw error;
  }

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    scope: String(payload?.scope || 'app'),
    source: 'jwt',
  };
}

export async function requireAuth(req, res, next) {
  try {
    const auth = await resolveAuthContext(req);
    if (!auth) {
      return sendSafeJsonError(res, {
        status: 401,
        error: 'UNAUTHORIZED',
        message: 'Autenticação necessária.',
      });
    }

    req.auth = auth;
    return next();
  } catch (error) {
    if (isTransientPrismaConnectionError(error)) {
      return sendSafeJsonError(res, {
        status: 503,
        error: 'AUTH_SERVICE_UNAVAILABLE',
        message: 'Serviço de autenticação temporariamente indisponível.',
      });
    }

    const errorCode = getSafeErrorCode(error, 'INVALID_TOKEN');
    const message = errorCode === 'TOKEN_EXPIRED' ? 'Token expirado.' : 'Token inválido ou expirado.';
    return sendSafeJsonError(res, {
      status: 401,
      error: errorCode,
      message,
    });
  }
}

export async function optionalAuth(req, res, next) {
  try {
    const auth = await resolveAuthContext(req);
    if (auth) {
      req.auth = auth;
    }
    return next();
  } catch (error) {
    if (isTransientPrismaConnectionError(error)) {
      return sendSafeJsonError(res, {
        status: 503,
        error: 'AUTH_SERVICE_UNAVAILABLE',
        message: 'Serviço de autenticação temporariamente indisponível.',
      });
    }

    const errorCode = getSafeErrorCode(error, 'INVALID_TOKEN');
    const message = errorCode === 'TOKEN_EXPIRED' ? 'Token expirado.' : 'Token inválido ou expirado.';
    return sendSafeJsonError(res, {
      status: 401,
      error: errorCode,
      message,
    });
  }
}
