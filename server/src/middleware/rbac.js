import { prisma } from '../lib/prisma.js';

export async function attachUser(req, _res, next) {
  if (!req.auth?.userId) return next();

  const user = await prisma.user.findUnique({ where: { id: req.auth.userId } });
  req.user = user || null;
  return next();
}

export function requireRole(...roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role || !allowed.has(role)) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }
    return next();
  };
}

export async function canAccessOrganization(userId, organizationId) {
  if (!userId || !organizationId) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) return false;
  if (user.role === 'ADMIN') return true;

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
  if (user.role === 'ADMIN') return true;

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
