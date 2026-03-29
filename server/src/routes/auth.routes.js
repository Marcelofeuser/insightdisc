import { Router } from 'express';
import { z } from 'zod';
import {
  isTransientPrismaConnectionError,
  prisma,
  withPrismaRetry,
} from '../lib/prisma.js';
import { sanitizeLogText, sendSafeJsonError } from '../lib/http-security.js';
import { hashPassword, signJwt, verifyPassword } from '../lib/security.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requireSuperAdmin } from '../middleware/rbac.js';
import { env } from '../config/env.js';
import {
  DEFAULT_SUPER_ADMIN_PASSWORD,
  findSeedSuperAdminUser,
} from '../modules/auth/super-admin-bootstrap.js';
import { isSuperAdminUser } from '../modules/auth/super-admin-access.js';
import { getUserCreditsBalance } from '../modules/auth/user-credits.js';
import { markPromoAccountActivated } from '../modules/campaigns/campaign.service.js';

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const superAdminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  masterKey: z.string().min(1),
});

const SUPER_ADMIN_RATE_WINDOW_MS = 15 * 60 * 1000;
const SUPER_ADMIN_MAX_ATTEMPTS = 9999;
const superAdminAttempts = new Map();

function parseClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (forwarded) return forwarded;
  return String(req.ip || req.socket?.remoteAddress || 'unknown');
}

function maskEmailForLog(email = '') {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized.includes('@')) return '[missing-email]';

  const [localPart, domain = ''] = normalized.split('@');
  const safeLocal =
    localPart.length <= 2 ? `${localPart.charAt(0) || '*'}*` : `${localPart.slice(0, 2)}***`;
  return `${safeLocal}@${domain}`;
}

function logAuthEvent(scope, req, details = {}) {
  if (env.nodeEnv === 'test') return;

  // eslint-disable-next-line no-console
  console.info(`[${scope}]`, {
    origin: sanitizeLogText(req.headers.origin || 'direct', 96),
    ip: sanitizeLogText(parseClientIp(req), 96),
    ...details,
  });
}

function getRateLimitEntry(key) {
  const now = Date.now();
  const current = superAdminAttempts.get(key);
  if (!current || now > current.resetAt) {
    const fresh = { count: 0, resetAt: now + SUPER_ADMIN_RATE_WINDOW_MS };
    superAdminAttempts.set(key, fresh);
    return fresh;
  }
  return current;
}

function registerFailedSuperAdminAttempt(key) {
  const entry = getRateLimitEntry(key);
  entry.count += 1;
  superAdminAttempts.set(key, entry);
}

function clearSuperAdminAttempts(key) {
  superAdminAttempts.delete(key);
}

function resolvePrimaryOrganizationId(user = {}) {
  const ownerOrg = user?.organizationsOwned?.[0]?.id;
  if (ownerOrg) return ownerOrg;

  const membershipOrg = user?.memberships?.[0]?.organizationId;
  if (membershipOrg) return membershipOrg;

  return '';
}

function hasActivePaidPurchase(user = {}) {
  const paymentsCount = Number(user?.payments?.length || 0);
  const creditsBalance = getUserCreditsBalance(user);
  return paymentsCount > 0 || creditsBalance > 0;
}

function normalizeUserPayload(user = {}) {
  const role = String(user?.role || 'PRO').toUpperCase();
  const workspaceId = resolvePrimaryOrganizationId(user);
  const isCandidate = role === 'CANDIDATE';
  const isSuperAdmin = isSuperAdminUser(user);
  const isAdmin = role === 'ADMIN';
  const hasPaidPurchase = isSuperAdmin ? true : hasActivePaidPurchase(user);
  const creditsBalance = isSuperAdmin ? 999999 : getUserCreditsBalance(user);
  const isCustomerActive = isSuperAdmin || isAdmin || hasPaidPurchase;
  const lifecycleStatus = isSuperAdmin
    ? 'super_admin'
    : isCustomerActive
      ? 'customer_active'
      : isCandidate
        ? 'lead'
        : 'registered_no_purchase';

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    full_name: user.name,
    role,
    global_role: isSuperAdmin ? 'SUPER_ADMIN' : isAdmin ? 'PLATFORM_ADMIN' : null,
    tenant_role: isCandidate ? 'END_CUSTOMER' : workspaceId ? 'TENANT_ADMIN' : null,
    active_workspace_id: workspaceId || null,
    tenant_id: workspaceId || null,
    lifecycle_status: lifecycleStatus,
    has_paid_purchase: hasPaidPurchase,
    payments_count: isSuperAdmin ? Math.max(1, Number(user?.payments?.length || 0)) : Number(user?.payments?.length || 0),
    entitlements:
      isSuperAdmin
        ? ['*']
        : isAdmin || hasPaidPurchase
          ? ['report.pro', 'report.export.pdf', 'report.export.csv']
          : [],
    plan: isSuperAdmin ? 'enterprise' : isCustomerActive ? 'premium' : 'free',
    credits: creditsBalance,
  };
}

router.post('/register', async (req, res) => {
  try {
    const input = registerSchema.parse(req.body || {});

    const exists = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (exists) {
      return res.status(409).json({ ok: false, error: 'Email já cadastrado.' });
    }

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          name: input.name,
          passwordHash: await hashPassword(input.password),
          credits: { create: { balance: 0 } },
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: `${input.name.trim()} Workspace`,
          companyName: input.name.trim(),
          logoUrl: '/brand/insightdisc-report-logo.png',
          brandPrimaryColor: '#0b1f3b',
          brandSecondaryColor: '#f7b500',
          reportFooterText: 'InsightDISC - Plataforma de Análise Comportamental',
          ownerId: createdUser.id,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: createdUser.id,
          role: 'OWNER',
        },
      });

      return tx.user.findUnique({
        where: { id: createdUser.id },
        include: {
          credits: true,
          memberships: true,
          organizationsOwned: true,
          payments: {
            where: { status: 'PAID' },
            select: { id: true },
            take: 1,
          },
        },
      });
    });

    if (!user) {
      return res.status(400).json({ ok: false, error: 'Falha ao criar usuário.' });
    }

    const token = signJwt({ sub: user.id, email: user.email, role: user.role });
    return res.status(201).json({
      ok: true,
      token,
      user: normalizeUserPayload(user),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendSafeJsonError(res, {
        status: 400,
        error: 'INVALID_REGISTER_PAYLOAD',
        message: 'Dados de cadastro inválidos.',
      });
    }

    return sendSafeJsonError(res, {
      status: 400,
      error: 'REGISTER_FAILED',
      message: 'Não foi possível concluir o cadastro.',
    });
  }
});

router.post('/login', async (req, res) => {
  try {
    const input = loginSchema.parse(req.body || {});
    const maskedEmail = maskEmailForLog(input.email);
    logAuthEvent('auth/login.request', req, {
      email: maskedEmail,
    });
    const user = await withPrismaRetry(
      () =>
        prisma.user.findUnique({
          where: { email: input.email.toLowerCase() },
          include: {
            credits: true,
            memberships: true,
            organizationsOwned: true,
            payments: {
              where: { status: 'PAID' },
              select: { id: true },
              take: 1,
            },
          },
        }),
      { retries: 1 },
    );
    if (!user) {
      logAuthEvent('auth/login.invalid_credentials', req, {
        email: maskedEmail,
        reason: 'user_not_found',
      });
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      logAuthEvent('auth/login.invalid_credentials', req, {
        email: maskedEmail,
        reason: 'password_mismatch',
      });
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });
    }

    try {
      await markPromoAccountActivated(user.id);
    } catch (activationError) {
      // eslint-disable-next-line no-console
      console.warn('[auth/login] promo account activation skipped:', activationError?.message || activationError);
    }

    const token = signJwt({ sub: user.id, email: user.email, role: user.role });
    logAuthEvent('auth/login.success', req, {
      email: maskedEmail,
      userId: sanitizeLogText(user.id, 96),
      role: sanitizeLogText(user.role || '', 48),
    });
    return res.status(200).json({
      ok: true,
      token,
      user: normalizeUserPayload(user),
    });
  } catch (error) {
    if (isTransientPrismaConnectionError(error)) {
      // eslint-disable-next-line no-console
      console.error('[auth/login] transient database error:', sanitizeLogText(error?.message || error));
      return sendSafeJsonError(res, {
        status: 503,
        error: 'AUTH_TEMPORARILY_UNAVAILABLE',
        message: 'Não foi possível autenticar no momento. Tente novamente em instantes.',
      });
    }

    if (error instanceof z.ZodError) {
      return sendSafeJsonError(res, {
        status: 400,
        error: 'INVALID_LOGIN_PAYLOAD',
        message: 'Informe e-mail e senha válidos.',
      });
    }

    // eslint-disable-next-line no-console
    console.error('[auth/login] failed:', sanitizeLogText(error?.message || error));
    return sendSafeJsonError(res, {
      status: 500,
      error: 'AUTH_SERVER_ERROR',
      message: 'Não foi possível concluir o login agora. Tente novamente.',
    });
  }
});

router.post('/super-admin-login', async (req, res) => {
  try {
    if (!env.hasSuperAdminKey) {
      logAuthEvent('auth/super-admin-login.disabled', req, {
        reason: 'missing_master_key',
      });
      return res.status(503).json({ ok: false, error: 'SUPER_ADMIN_DISABLED' });
    }

    const input = superAdminLoginSchema.parse(req.body || {});
    const maskedEmail = maskEmailForLog(input.email);
    logAuthEvent('auth/super-admin-login.request', req, {
      email: maskedEmail,
      hasMasterKey: Boolean(String(input.masterKey || '').trim()),
    });
    const key = `${parseClientIp(req)}:${String(input.email || '').toLowerCase()}`;
    const entry = getRateLimitEntry(key);
if (process.env.NODE_ENV !== 'development' && entry.count >= SUPER_ADMIN_MAX_ATTEMPTS) {    
      logAuthEvent('auth/super-admin-login.rate_limited', req, {
        email: maskedEmail,
        attempts: entry.count,
      });
      return res.status(429).json({
        ok: false,
        error: 'TOO_MANY_ATTEMPTS',
      });
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await withPrismaRetry(
      () =>
        prisma.user.findUnique({
          where: { email: normalizedEmail },
          include: {
            credits: true,
            memberships: true,
            organizationsOwned: true,
            payments: {
              where: { status: 'PAID' },
              select: { id: true },
              take: 1,
            },
          },
        }),
      { retries: 1 },
    );

    if (!user) {
      registerFailedSuperAdminAttempt(key);
      logAuthEvent('auth/super-admin-login.invalid_credentials', req, {
        email: maskedEmail,
        reason: 'user_not_found',
      });
      const seededSuperAdmin = await findSeedSuperAdminUser(prisma);
      const seededRole = String(seededSuperAdmin?.role || '').toUpperCase();
      if (!seededSuperAdmin || seededRole !== 'SUPER_ADMIN') {
        return res.status(404).json({ ok: false, error: 'SUPER_ADMIN_NOT_FOUND' });
      }
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    }

    if (env.nodeEnv === 'production' && input.password === DEFAULT_SUPER_ADMIN_PASSWORD) {
      registerFailedSuperAdminAttempt(key);
      logAuthEvent('auth/super-admin-login.weak_password', req, {
        email: maskedEmail,
      });
      return res.status(403).json({ ok: false, error: 'WEAK_SUPER_ADMIN_PASSWORD' });
    }

    const validPassword = await verifyPassword(input.password, user.passwordHash);
    if (!validPassword) {
      registerFailedSuperAdminAttempt(key);
      logAuthEvent('auth/super-admin-login.invalid_credentials', req, {
        email: maskedEmail,
        reason: 'password_mismatch',
      });
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    }

    if (String(user.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      registerFailedSuperAdminAttempt(key);
      logAuthEvent('auth/super-admin-login.forbidden', req, {
        email: maskedEmail,
        role: sanitizeLogText(user.role || '', 48),
      });
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }

    if (input.masterKey !== env.superAdminMasterKey) {
      registerFailedSuperAdminAttempt(key);
      logAuthEvent('auth/super-admin-login.invalid_master_key', req, {
        email: maskedEmail,
      });
      return res.status(403).json({ ok: false, error: 'INVALID_MASTER_KEY' });
    }

    clearSuperAdminAttempts(key);

    const token = signJwt(
      { sub: user.id, email: user.email, role: user.role, scope: 'super_admin' },
      { expiresIn: '8h' },
    );

    logAuthEvent('auth/super-admin-login.success', req, {
      email: maskedEmail,
      userId: sanitizeLogText(user.id, 96),
      role: sanitizeLogText(user.role || '', 48),
    });
    return res.status(200).json({
      ok: true,
      token,
      user: normalizeUserPayload(user),
    });
  } catch (error) {
    if (isTransientPrismaConnectionError(error)) {
      // eslint-disable-next-line no-console
      console.error('[auth/super-admin-login] transient database error:', sanitizeLogText(error?.message || error));
      return sendSafeJsonError(res, {
        status: 503,
        error: 'AUTH_TEMPORARILY_UNAVAILABLE',
        message: 'Não foi possível autenticar no momento. Tente novamente em instantes.',
      });
    }

    if (error instanceof z.ZodError) {
      return sendSafeJsonError(res, {
        status: 400,
        error: 'INVALID_LOGIN_PAYLOAD',
        message: 'Informe e-mail, senha e chave administrativa válidos.',
      });
    }

    // eslint-disable-next-line no-console
    console.error('[auth/super-admin-login] failed:', sanitizeLogText(error?.message || error));
    return sendSafeJsonError(res, {
      status: 500,
      error: 'AUTH_SERVER_ERROR',
      message: 'Não foi possível concluir o login do super admin agora. Tente novamente.',
    });
  }
});

router.get('/validate-token', requireAuth, async (req, res) => {
  return res.status(200).json({
    ok: true,
    valid: true,
    userId: req.auth?.userId || null,
    role: req.auth?.role || null,
  });
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      include: {
        credits: true,
        memberships: true,
        organizationsOwned: true,
        payments: {
          where: { status: 'PAID' },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return sendSafeJsonError(res, {
        status: 401,
        error: 'UNAUTHORIZED',
        message: 'Autenticação necessária.',
      });
    }

    return res.status(200).json({ ok: true, user: normalizeUserPayload(user) });
  } catch (error) {
    return sendSafeJsonError(res, {
      status: 400,
      error: 'SESSION_LOAD_FAILED',
      message: 'Falha ao carregar sessão.',
    });
  }
});

router.get('/super-admin/me', requireAuth, attachUser, requireSuperAdmin, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      include: {
        credits: true,
        memberships: true,
        organizationsOwned: true,
        payments: {
          where: { status: 'PAID' },
          select: { id: true },
          take: 1,
        },
      },
    });

    if (!user) {
      return sendSafeJsonError(res, {
        status: 401,
        error: 'UNAUTHORIZED',
        message: 'Autenticação necessária.',
      });
    }

    return res.status(200).json({ ok: true, user: normalizeUserPayload(user) });
  } catch (error) {
    return sendSafeJsonError(res, {
      status: 400,
      error: 'SUPER_ADMIN_SESSION_LOAD_FAILED',
      message: 'Falha ao carregar sessão super admin.',
    });
  }
});

router.post('/logout', requireAuth, (_req, res) =>
  res.status(200).json({
    ok: true,
    loggedOut: true,
  }),
);

router.post('/reset-password', requireAuth, attachUser, async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email().optional(),
      currentPassword: z.string().min(1).optional(),
      newPassword: z.string().min(8),
    });
    const input = schema.parse(req.body || {});

    const sessionUser = req.user;
    if (!sessionUser) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const requestedEmail = String(input.email || sessionUser.email || '')
      .trim()
      .toLowerCase();
    const sessionEmail = String(sessionUser.email || '').trim().toLowerCase();
    const isSelfReset = requestedEmail === sessionEmail;
    const canResetAnyUser = isSuperAdminUser(sessionUser);

    if (!isSelfReset && !canResetAnyUser) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }

    if (isSelfReset && !canResetAnyUser) {
      const validCurrentPassword = await verifyPassword(
        String(input.currentPassword || ''),
        sessionUser.passwordHash,
      );
      if (!validCurrentPassword) {
        return res.status(401).json({ ok: false, error: 'CURRENT_PASSWORD_INVALID' });
      }
    }

    const user = await prisma.user.findUnique({ where: { email: requestedEmail } });
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Usuário não encontrado.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.newPassword) },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return sendSafeJsonError(res, {
        status: 400,
        error: 'INVALID_RESET_PASSWORD_PAYLOAD',
        message: 'Dados de reset de senha inválidos.',
      });
    }

    return sendSafeJsonError(res, {
      status: 400,
      error: 'RESET_PASSWORD_FAILED',
      message: 'Falha no reset de senha.',
    });
  }
});

export default router;
