import { prisma, withPrismaRetry } from '../lib/prisma.js'
import { getUserCreditsBalance } from '../modules/auth/user-credits.js'
import { normalizePlan, isPaidPlan } from '../lib/plan-normalize.js'

async function loadUserWithRelations(userId) {
  if (!userId) return null

  const user = await withPrismaRetry(
    () =>
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          plan: true,
          createdAt: true,
        },
      }),
    { retries: 1 }
  )

  if (!user) return null

  const latestCredit = await withPrismaRetry(
    () =>
      prisma.credit.findUnique({
        where: { userId },
        select: { balance: true }
      }),
    { retries: 1 }
  )

  const normalizedPlan = normalizePlan(user?.plan) || ''
  const shouldCheckPaidPayment = !normalizedPlan || normalizedPlan === 'personal'
  const latestPaidPayment = shouldCheckPaidPayment
    ? await withPrismaRetry(
        () =>
          prisma.payment.findFirst({
            where: {
              userId,
              status: 'PAID'
            },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              status: true
            }
          }),
        { retries: 1 }
      )
    : null

  return {
    ...user,
    credits: latestCredit ? [latestCredit] : [],
    payments: latestPaidPayment ? [latestPaidPayment] : []
  }
}

function normalizeRole(value) {
  return String(value || '').trim().toUpperCase()
}

function hasPaidPayment(user = {}) {
  const payments = Array.isArray(user?.payments) ? user.payments : []
  return payments.some((payment) => normalizeRole(payment?.status) === 'PAID')
}

function isPrivilegedRole(user = {}) {
  const role = normalizeRole(user?.role)
  return role === 'SUPER_ADMIN' || role === 'ADMIN' || role === 'PRO'
}

async function ensureRequestUser(req) {
  if (req.user?.id) return req.user

  const authUserId =
    req.auth?.userId ||
    req.auth?.id ||
    req.userId ||
    null

  if (!authUserId) return null

  req.user = await loadUserWithRelations(authUserId)
  return req.user
}

async function resolveOrganizationAccess(userId, organizationId) {
  const normalizedUserId = String(userId || '').trim()
  const normalizedOrganizationId = String(organizationId || '').trim()

  if (!normalizedUserId || !normalizedOrganizationId) {
    return { canAccess: false, canManage: false }
  }

  const user = await prisma.user.findUnique({
    where: { id: normalizedUserId },
    select: { id: true, role: true },
  })

  if (!user) {
    return { canAccess: false, canManage: false }
  }

  if (normalizeRole(user.role) === 'SUPER_ADMIN') {
    return { canAccess: true, canManage: true }
  }

  const organization = await prisma.organization.findUnique({
    where: { id: normalizedOrganizationId },
    select: { id: true, ownerId: true },
  })

  if (!organization) {
    return { canAccess: false, canManage: false }
  }

  if (organization.ownerId === normalizedUserId) {
    return { canAccess: true, canManage: true }
  }

  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: normalizedOrganizationId,
        userId: normalizedUserId,
      },
    },
    select: { role: true },
  })

  if (!membership) {
    return { canAccess: false, canManage: false }
  }

  const membershipRole = normalizeRole(membership.role)
  return {
    canAccess: true,
    canManage: membershipRole === 'OWNER' || membershipRole === 'ADMIN',
  }
}

function isActiveCustomerProfile(user = {}) {
  if (!user?.id) return false
  if (isPrivilegedRole(user)) return true
  const normalizedPlan = normalizeRole(user?.plan)
  if (isPaidPlan(user?.plan)) {
    return true
  }
  if (getUserCreditsBalance(user) > 0) return true
  if (hasPaidPayment(user)) return true
  return false
}

export async function attachUser(req, res, next) {
  try {
    if (req.user?.id) return next()

    const authUserId =
      req.auth?.userId ||
      req.auth?.id ||
      req.userId ||
      null

    if (!authUserId) {
      req.user = null
      return next()
    }

    req.user = await loadUserWithRelations(authUserId)
    return next()
  } catch (error) {
    console.error('[RBAC] erro ao anexar usuário:', error)
    req.user = null
    return next()
  }
}

export function requireAuth(req, res, next) {
  const authUserId =
    req.user?.id ||
    req.auth?.userId ||
    req.auth?.id ||
    req.userId

  if (!authUserId) {
    return res.status(401).json({
      ok: false,
      error: 'AUTH_REQUIRED',
      message: 'Autenticação necessária.'
    })
  }

  return next()
}

export function requireRoles(...allowedRoles) {
  return async function (req, res, next) {
    try {
      if (!req.user?.id) {
        const authUserId =
          req.auth?.userId ||
          req.auth?.id ||
          req.userId ||
          null

        if (authUserId) {
          req.user = await loadUserWithRelations(authUserId)
        }
      }

      const userRole = String(req.user?.role || '').trim().toUpperCase()
      if (userRole === 'SUPER_ADMIN') {
        return next()
      }

      const normalizedAllowed = allowedRoles.map((role) =>
        String(role || '').trim().toUpperCase()
      )

      if (!userRole || !normalizedAllowed.includes(userRole)) {
        return res.status(403).json({
          ok: false,
          error: 'FORBIDDEN',
          message: 'Acesso negado.'
        })
      }

      return next()
    } catch (error) {
      console.error('[RBAC] erro ao validar papel:', error)
      return res.status(500).json({
        ok: false,
        error: 'RBAC_ERROR',
        message: 'Falha ao validar permissões.'
      })
    }
  }
}

export function requireRole(...allowedRoles) {
  return requireRoles(...allowedRoles)
}

export async function canAccessOrganization(userId, organizationId) {
  const access = await resolveOrganizationAccess(userId, organizationId)
  return access.canAccess
}

export async function canManageOrganization(userId, organizationId) {
  const access = await resolveOrganizationAccess(userId, organizationId)
  return access.canManage
}

export async function requireActiveCustomer(req, res, next) {
  try {
    const user = await ensureRequestUser(req)
    if (isActiveCustomerProfile(user || {})) {
      return next()
    }

    return res.status(403).json({
      ok: false,
      error: 'PREMIUM_REQUIRED',
      message: 'Plano premium necessário.'
    })
  } catch (error) {
    console.error('[RBAC] erro ao validar cliente ativo:', error)
    return res.status(500).json({
      ok: false,
      error: 'RBAC_ERROR',
      message: 'Falha ao validar acesso premium.'
    })
  }
}

export function requirePremiumFeature(errorCode = 'PREMIUM_REQUIRED') {
  return async function (req, res, next) {
    try {
      const user = await ensureRequestUser(req)
      if (isActiveCustomerProfile(user || {})) {
        return next()
      }

      return res.status(403).json({
        ok: false,
        error: String(errorCode || 'PREMIUM_REQUIRED'),
        message: 'Plano premium necessário.'
      })
    } catch (error) {
      console.error('[RBAC] erro ao validar recurso premium:', error)
      return res.status(500).json({
        ok: false,
        error: 'RBAC_ERROR',
        message: 'Falha ao validar acesso premium.'
      })
    }
  }
}

export const requireSuperAdmin = requireRoles('SUPER_ADMIN')
