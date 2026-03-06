import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword, signJwt, verifyPassword } from '../lib/security.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requireSuperAdmin } from '../middleware/rbac.js';
import { env } from '../config/env.js';
import { findSeedSuperAdminUser } from '../modules/auth/super-admin-bootstrap.js';

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
const SUPER_ADMIN_MAX_ATTEMPTS = 7;
const superAdminAttempts = new Map();

function parseClientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  if (forwarded) return forwarded;
  return String(req.ip || req.socket?.remoteAddress || 'unknown');
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

function normalizeUserPayload(user = {}) {
  const role = String(user?.role || 'PRO').toUpperCase();
  const workspaceId = resolvePrimaryOrganizationId(user);
  const isCandidate = role === 'CANDIDATE';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN';

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
    entitlements: isCandidate ? [] : ['report.pro', 'report.export.pdf', 'report.export.csv'],
    plan: isCandidate ? 'free' : isSuperAdmin ? 'enterprise' : 'premium',
    credits: Number(user?.credits?.[0]?.balance || 0),
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
    return res.status(400).json({ ok: false, error: error?.message || 'Falha no cadastro.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const input = loginSchema.parse(req.body || {});
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        credits: true,
        memberships: true,
        organizationsOwned: true,
      },
    });
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas.' });
    }

    const token = signJwt({ sub: user.id, email: user.email, role: user.role });
    return res.status(200).json({
      ok: true,
      token,
      user: normalizeUserPayload(user),
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha no login.' });
  }
});

router.post('/super-admin-login', async (req, res) => {
  try {
    if (!env.hasSuperAdminKey) {
      return res.status(503).json({ ok: false, error: 'SUPER_ADMIN_DISABLED' });
    }

    const input = superAdminLoginSchema.parse(req.body || {});
    const key = `${parseClientIp(req)}:${String(input.email || '').toLowerCase()}`;
    const entry = getRateLimitEntry(key);
    if (entry.count >= SUPER_ADMIN_MAX_ATTEMPTS) {
      return res.status(429).json({
        ok: false,
        error: 'TOO_MANY_ATTEMPTS',
      });
    }

    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        credits: true,
        memberships: true,
        organizationsOwned: true,
      },
    });

    if (!user) {
      registerFailedSuperAdminAttempt(key);
      const seededSuperAdmin = await findSeedSuperAdminUser(prisma);
      const seededRole = String(seededSuperAdmin?.role || '').toUpperCase();
      if (!seededSuperAdmin || seededRole !== 'SUPER_ADMIN') {
        return res.status(404).json({ ok: false, error: 'SUPER_ADMIN_NOT_FOUND' });
      }
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    }

    const validPassword = await verifyPassword(input.password, user.passwordHash);
    if (!validPassword) {
      registerFailedSuperAdminAttempt(key);
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    }

    if (String(user.role || '').toUpperCase() !== 'SUPER_ADMIN') {
      registerFailedSuperAdminAttempt(key);
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }

    if (input.masterKey !== env.superAdminMasterKey) {
      registerFailedSuperAdminAttempt(key);
      return res.status(403).json({ ok: false, error: 'INVALID_MASTER_KEY' });
    }

    clearSuperAdminAttempts(key);

    const token = signJwt(
      { sub: user.id, email: user.email, role: user.role, scope: 'super_admin' },
      { expiresIn: '8h' },
    );

    return res.status(200).json({
      ok: true,
      token,
      user: normalizeUserPayload(user),
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha no login do super admin.' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      include: {
        credits: true,
        memberships: true,
        organizationsOwned: true,
      },
    });

    if (!user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    return res.status(200).json({ ok: true, user: normalizeUserPayload(user) });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha ao carregar sessão.' });
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
      },
    });

    if (!user) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    return res.status(200).json({ ok: true, user: normalizeUserPayload(user) });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha ao carregar sessão super admin.' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const schema = z.object({ email: z.string().email(), newPassword: z.string().min(8) });
    const input = schema.parse(req.body || {});

    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
    if (!user) {
      return res.status(404).json({ ok: false, error: 'Usuário não encontrado.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.newPassword) },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha no reset de senha.' });
  }
});

export default router;
