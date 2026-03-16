import { verifyJwt } from '../lib/security.js';
import { getSafeErrorCode, sendSafeJsonError } from '../lib/http-security.js';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';

function extractBearerToken(header = '') {
  if (!header) return '';
  const [scheme, token] = String(header).split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return '';
  return token || '';
}

export async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token && env.nodeEnv !== 'production' && env.allowDevEmailAuth) {
      const email = String(req.headers['x-insight-user-email'] || '').trim().toLowerCase();
      if (email) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          return sendSafeJsonError(res, {
            status: 401,
            error: 'UNAUTHORIZED',
            message: 'Autenticação necessária.',
          });
        }
        req.auth = {
          userId: user.id,
          email: user.email,
          role: user.role,
          scope: 'dev-email-header',
          source: 'dev-email-header',
        };
        return next();
      }
    }

    if (!token) {
      return sendSafeJsonError(res, {
        status: 401,
        error: 'UNAUTHORIZED',
        message: 'Autenticação necessária.',
      });
    }

    const payload = verifyJwt(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return sendSafeJsonError(res, {
        status: 401,
        error: 'INVALID_TOKEN',
        message: 'Token inválido ou expirado.',
      });
    }

    req.auth = {
      userId: user.id,
      email: user.email,
      role: user.role,
      scope: String(payload?.scope || 'app'),
      source: 'jwt',
    };
    return next();
  } catch (error) {
    const errorCode = getSafeErrorCode(error, 'INVALID_TOKEN');
    const message = errorCode === 'TOKEN_EXPIRED' ? 'Token expirado.' : 'Token inválido ou expirado.';
    return sendSafeJsonError(res, {
      status: 401,
      error: errorCode,
      message,
    });
  }
}
