import { verifyJwt } from '../lib/security.js';
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
    if (!token && env.nodeEnv !== 'production') {
      const email = String(req.headers['x-insight-user-email'] || '').trim().toLowerCase();
      if (email) {
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: email.split('@')[0] || 'dev-user',
              passwordHash: 'dev-auth-placeholder',
              credits: { create: { balance: 0 } },
            },
          });
        }
        req.auth = { userId: user.id, email: user.email, source: 'dev-email-header' };
        return next();
      }
    }

    if (!token) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const payload = verifyJwt(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    req.auth = { userId: user.id, email: user.email };
    return next();
  } catch (error) {
    return res.status(401).json({ ok: false, error: error?.message || 'Unauthorized' });
  }
}
