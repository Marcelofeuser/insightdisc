import { prisma } from '../lib/prisma.js';
import { isSuperAdminUser } from '../modules/auth/super-admin-access.js';

export async function attachUser(req, _res, next) {
  if (!req.auth?.userId) return next();

  const user = await prisma.user.findUnique({
    where: { id: req.auth.userId },
    include: {
      credits: {
        select: { balance: true },
        take: 1,
      },
      payments: {
        where: { status: 'PAID' },
        select: { id: true, status: true },
        take: 1,
      },
    },
  });
  req.user = user || null;
  return next();
}

export function requireRole(...roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    if (isSuperAdminUser(req.user || req.auth || {})) {
      return next();
    }
    const role = String(req.user?.role || '').toUpperCase();
    if (!role || !allowed.has(role)) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
    return next();
  };
}

export function requireSuperAdmin(req, res, next) {
  const authUser = {
    role: req.user?.role || req.auth?.role,
    global_role: req.user?.global_role || req.auth?.global_role,
    globalRole: req.user?.globalRole || req.auth?.globalRole,
  };
  const role = String(authUser?.role || '').toUpperCase();
  const scope = String(req.auth?.scope || '').toLowerCase();
  if (!isSuperAdminUser(authUser) && role !== 'SUPER_ADMIN' && scope !== 'super_admin') {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  return next();
}

export function isActiveCustomer(user = {}) {
  const role = String(user?.role || '').toUpperCase();
  if (isSuperAdminUser(user) || role === 'ADMIN') return true;
  if (role === 'CANDIDATE') return false;

  const creditsBalance = Number(user?.credits?.[0]?.balance || 0);
  const paidPayments = Number(user?.payments?.length || 0);
  return creditsBalance > 0 || paidPayments > 0;
}

export function requireActiveCustomer(req, res, next) {
  if (isActiveCustomer(req.user || {})) {
    return next();
  }

  return res.status(402).json({
    ok: false,
    error: 'PAYWALL_REQUIRED',
    message: 'Conta sem compra ativa. Compre créditos para desbloquear recursos premium.',
  });
}

export async function canAccessOrganization(userId, organizationId) {
  if (!userId || !organizationId) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;

  const membership = await prisma.organizationMember.findFirst({
    where: { organizationId, userId },
  });
  if (membership) return true;

  const ownerOrg = await prisma.organization.findFirst({
    where: { id: organizationId, ownerId: userId },
  });
  return Boolean(ownerOrg);
}

export async function canManageOrganization(userId, organizationId) {
  if (!userId || !organizationId) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) return false;
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') return true;

  const ownerOrg = await prisma.organization.findFirst({
    where: { id: organizationId, ownerId: userId },
    select: { id: true },
  });
  if (ownerOrg) return true;

  const privilegedMembership = await prisma.organizationMember.findFirst({
    where: {
      organizationId,
      userId,
      role: { in: ['OWNER', 'ADMIN'] },
    },
    select: { id: true },
  });

  return Boolean(privilegedMembership);
}
