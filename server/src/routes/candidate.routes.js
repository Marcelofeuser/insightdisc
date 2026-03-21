import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { getPublicAppBaseUrl } from '../lib/request-base-url.js';
import { hashPassword, sha256, signJwt, verifyJwt, verifyPassword } from '../lib/security.js';
import { signPublicReportToken } from '../lib/public-report-token.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requireRole } from '../middleware/rbac.js';
import { isSuperAdminUser } from '../modules/auth/super-admin-access.js';
import { markPromoAccountActivated } from '../modules/campaigns/campaign.service.js';
import { normalizeReportType, resolveStoredReportType } from '../modules/report/report-type.js';

const router = Router();
const PUBLIC_REPORT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 14;

function normalizeReason(reason) {
  const key = String(reason || '').toUpperCase();
  if (key === 'TOKEN_REQUIRED') return 'TOKEN_REQUIRED';
  if (key.includes('EXPIRED')) return 'EXPIRED';
  if (key.includes('USED')) return 'USED';
  if (key.includes('NOT_FOUND')) return 'NOT_FOUND';
  return key || 'INVALID';
}

function statusCodeByReason(reason) {
  if (reason === 'TOKEN_REQUIRED') return 400;
  if (reason === 'EXPIRED') return 410;
  if (reason === 'USED') return 409;
  if (reason === 'NOT_FOUND') return 404;
  return 400;
}

function hasEligiblePortalSaveAccess(user = {}) {
  const plan = String(user.plan || user.workspace_plan || user.subscription_plan || '')
    .trim()
    .toLowerCase();
  const hasPaidPlan = ['premium', 'pro', 'professional', 'business', 'enterprise'].includes(plan);
  const hasPaidPurchase =
    Boolean(user.has_paid_purchase) ||
    Boolean(user.hasPaidPurchase) ||
    Number(user.payments_count || user.paymentsCount || 0) > 0;
  const entitlements = Array.isArray(user.entitlements)
    ? user.entitlements
    : Array.isArray(user.permissions)
      ? user.permissions
      : [];
  const hasEligibleVoucher = entitlements.some((item) =>
    ['report.pro', 'report.export.pdf'].includes(String(item || '').trim().toLowerCase()),
  );
  const role = String(user.role || '').trim().toUpperCase();

  return role === 'SUPER_ADMIN' || hasPaidPlan || hasPaidPurchase || hasEligibleVoucher;
}

function issuePublicReportAccess({
  assessmentId,
  accountId = '',
  organizationId = '',
  reportType,
  appBaseUrl = '',
  ttlSeconds = PUBLIC_REPORT_TOKEN_TTL_SECONDS,
} = {}) {
  const normalizedAssessmentId = String(assessmentId || '').trim();
  const normalizedAccountId = String(accountId || organizationId || '').trim();
  const normalizedReportType = normalizeReportType(reportType);
  const normalizedBaseUrl = String(appBaseUrl || '').trim().replace(/\/+$/, '');
  const token = signPublicReportToken(
    {
      assessmentId: normalizedAssessmentId,
      id: normalizedAssessmentId,
      assessment_id: normalizedAssessmentId,
      accountId: normalizedAccountId,
      organizationId: normalizedAccountId,
      account_id: normalizedAccountId,
      reportType: normalizedReportType,
    },
    ttlSeconds,
  );
  const publicReportPath = `/c/report?token=${encodeURIComponent(token)}`;
  const publicPdfPath = `/api/report/pdf?token=${encodeURIComponent(token)}`;

  return {
    token,
    reportType: normalizedReportType,
    publicReportPath,
    publicPdfPath,
    publicReportUrl: normalizedBaseUrl ? `${normalizedBaseUrl}${publicReportPath}` : publicReportPath,
    publicPdfUrl: normalizedBaseUrl ? `${normalizedBaseUrl}${publicPdfPath}` : publicPdfPath,
  };
}

async function getInviteByToken(token, options = {}) {
  const allowUsed = Boolean(options.allowUsed);
  const rawToken = String(token || '').trim();
  if (!rawToken) return { valid: false, reason: 'TOKEN_REQUIRED' };

  const tokenHash = sha256(rawToken);
  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    include: { assessment: true },
  });

  if (!invite || invite.status === 'REVOKED') {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  if (invite.expiresAt.getTime() <= Date.now() || invite.status === 'EXPIRED') {
    return { valid: false, reason: 'EXPIRED' };
  }

  const alreadyUsed = Boolean(invite.usedAt) || invite.status === 'USED';
  if (alreadyUsed && !allowUsed) {
    return { valid: false, reason: 'USED' };
  }

  return { valid: true, invite, tokenHash, alreadyUsed };
}

function extractBearerToken(header = '') {
  if (!header) return '';
  const [scheme, token] = String(header).split(' ');
  if (scheme?.toLowerCase() !== 'bearer') return '';
  return token || '';
}

async function resolveAuthenticatedUser(req) {
  const bearer = extractBearerToken(req.headers.authorization || '');
  if (bearer) {
    try {
      const payload = verifyJwt(bearer);
      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (user) {
        return { user, token: bearer };
      }
    } catch {
      // keep public compatibility
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    const headerEmail = String(req.headers['x-insight-user-email'] || '').trim().toLowerCase();
    if (headerEmail) {
      const user = await prisma.user.findUnique({ where: { email: headerEmail } });
      if (user) {
        return { user, token: '' };
      }
    }
  }

  return { user: null, token: '' };
}

async function canSaveAssessmentToPortal({ user, assessment }) {
  if (!user || !assessment) return false;

  if (isSuperAdminUser(user)) return true;

  const role = String(user.role || '').toUpperCase();
  if (!assessment.organizationId) return false;

  const [ownedOrganization, membership] = await Promise.all([
    prisma.organization.findFirst({
      where: {
        id: assessment.organizationId,
        ownerId: user.id,
      },
      select: { id: true },
    }),
    prisma.organizationMember.findFirst({
      where: {
        organizationId: assessment.organizationId,
        userId: user.id,
      },
      select: { id: true },
    }),
  ]);

  if (!ownedOrganization && !membership) return false;

  // Candidate users from the same tenant still need respondent email match.
  if (role === 'CANDIDATE') return false;

  return true;
}

router.post('/register', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2),
    });

    const input = schema.parse(req.body || {});
    const normalizedEmail = input.email.toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(409).json({ ok: false, reason: 'EMAIL_EXISTS' });
    }

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: input.name,
        role: 'CANDIDATE',
        passwordHash: await hashPassword(input.password),
        credits: { create: { balance: 0 } },
      },
    });

    const token = signJwt({ sub: user.id, email: user.email, role: user.role });
    return res.status(201).json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'CANDIDATE_REGISTER_FAILED' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(8),
    });

    const input = schema.parse(req.body || {});
    const normalizedEmail = input.email.toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ ok: false, reason: 'INVALID_CREDENTIALS' });
    }

    const validPassword = await verifyPassword(input.password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ ok: false, reason: 'INVALID_CREDENTIALS' });
    }

    try {
      await markPromoAccountActivated(user.id);
    } catch (activationError) {
      // eslint-disable-next-line no-console
      console.warn('[candidate/login] promo account activation skipped:', activationError?.message || activationError);
    }

    const token = signJwt({ sub: user.id, email: user.email, role: user.role });
    return res.status(200).json({
      ok: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'CANDIDATE_LOGIN_FAILED' });
  }
});

async function claimReport(req, res) {
  try {
    const schema = z.object({
      token: z.string().min(1),
      assessmentId: z.string().min(1).optional(),
      email: z.string().email().optional(),
      password: z.string().min(8).optional(),
      name: z.string().min(2).optional(),
    });

    const input = schema.parse(req.body || {});
    const authContext = await resolveAuthenticatedUser(req);
    const authenticatedUser = authContext.user;
    const inviteResult = await getInviteByToken(input.token, { allowUsed: true });

    if (!inviteResult.valid) {
      const reason = normalizeReason(inviteResult.reason);
      return res.status(statusCodeByReason(reason)).json({ ok: false, reason });
    }

    const assessment = inviteResult.invite.assessment;
    if (!assessment) {
      return res.status(404).json({ ok: false, reason: 'ASSESSMENT_NOT_FOUND' });
    }

    if (input.assessmentId && input.assessmentId !== assessment.id) {
      return res.status(400).json({ ok: false, reason: 'ASSESSMENT_ID_MISMATCH' });
    }

    let user = authenticatedUser;
    let issuedToken = authContext.token;

    if (!user) {
      return res.status(403).json({
        ok: false,
        reason: 'PORTAL_SAVE_NOT_ELIGIBLE',
        message:
          'Salvar uma cópia no portal está disponível apenas para contas autenticadas com plano pago ou permissão elegível.',
      });
    }

    if (!hasEligiblePortalSaveAccess(user)) {
      return res.status(403).json({
        ok: false,
        reason: 'PORTAL_SAVE_NOT_ELIGIBLE',
        message:
          'Salvar uma cópia no portal está disponível apenas para contas autenticadas com plano pago ou permissão elegível.',
      });
    }

    const expectedEmail = String(assessment.candidateEmail || '').trim().toLowerCase();
    const userEmail = String(user.email || '').trim().toLowerCase();
    const emailMatches = !expectedEmail || expectedEmail === userEmail;
    const workspaceAuthorized = await canSaveAssessmentToPortal({ user, assessment });

    if (!emailMatches && !workspaceAuthorized) {
      return res.status(403).json({
        ok: false,
        reason: 'UNAUTHORIZED_WORKSPACE_SAVE',
        message: 'Este relatório só pode ser salvo por um usuário autorizado deste workspace.',
      });
    }

    if (assessment.candidateUserId && assessment.candidateUserId !== user.id && !workspaceAuthorized) {
      return res.status(409).json({ ok: false, reason: 'REPORT_ALREADY_CLAIMED' });
    }

    const updateData = {};
    if (!assessment.candidateUserId && emailMatches) {
      updateData.candidateUserId = user.id;
    }
    if (!assessment.candidateEmail) {
      updateData.candidateEmail = user.email;
    }
    if (!assessment.candidateName && (input.name || user.name)) {
      updateData.candidateName = input.name || user.name;
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.assessment.update({
        where: { id: assessment.id },
        data: updateData,
      });
    }

    const token = issuedToken || signJwt({ sub: user.id, email: user.email, role: user.role });

    return res.status(200).json({
      ok: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      assessmentId: assessment.id,
      associationMode: workspaceAuthorized && !emailMatches ? 'workspace_authorized' : 'respondent_match',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        ok: false,
        reason: 'CLAIM_PAYLOAD_INVALID',
        message: 'Dados inválidos para salvar o relatório no portal.',
      });
    }

    return res.status(500).json({
      ok: false,
      reason: 'CLAIM_FAILED',
      message: 'Não foi possível salvar o relatório no portal agora. Tente novamente em instantes.',
    });
  }
}

router.post('/claim', claimReport);
router.post('/claim-report', claimReport);

async function listCandidateReports(req, res) {
  try {
    const role = String(req.user?.role || '').toUpperCase();
    const isSuperAdmin = isSuperAdminUser(req.user || {});
    const userEmail = String(req.user?.email || '').trim().toLowerCase();

    let where = {};
    if (isSuperAdmin) {
      where = {};
    } else if (role === 'CANDIDATE' || role === 'USER') {
      where = {
        OR: [
          { candidateUserId: req.user.id },
          ...(userEmail ? [{ candidateEmail: userEmail }] : []),
        ],
      };
    } else {
      const [ownedOrganizations, memberships] = await Promise.all([
        prisma.organization.findMany({
          where: { ownerId: req.user.id },
          select: { id: true },
        }),
        prisma.organizationMember.findMany({
          where: { userId: req.user.id },
          select: { organizationId: true },
        }),
      ]);

      const allowedOrganizationIds = Array.from(
        new Set([
          ...ownedOrganizations.map((item) => item.id),
          ...memberships.map((item) => item.organizationId),
        ]),
      ).filter(Boolean);

      if (!allowedOrganizationIds.length) {
        return res.status(200).json({ ok: true, reports: [] });
      }

      where = {
        organizationId: {
          in: allowedOrganizationIds,
        },
      };
    }

    const assessments = await prisma.assessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { report: true },
      take: 100,
    });
    const appBaseUrl = getPublicAppBaseUrl(req);

    return res.status(200).json({
      ok: true,
      reports: assessments
        .filter((assessment) => Boolean(assessment.report))
        .map((assessment) => {
          const publicAccess = issuePublicReportAccess({
            assessmentId: assessment.id,
            accountId: assessment.organizationId,
            reportType: resolveStoredReportType(assessment, 'business'),
            appBaseUrl,
          });

          return {
            assessmentId: assessment.id,
            candidateName: assessment.candidateName,
            candidateEmail: assessment.candidateEmail,
            createdAt: assessment.createdAt,
            completedAt: assessment.completedAt,
            reportId: assessment.report?.id || null,
            pdfUrl: publicAccess.publicPdfUrl,
            reportType: publicAccess.reportType,
            publicToken: publicAccess.token,
            publicReportUrl: publicAccess.publicReportUrl,
            publicPdfUrl: publicAccess.publicPdfUrl,
            discProfile: assessment.report?.discProfile || null,
          };
        }),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'CANDIDATE_REPORTS_FAILED' });
  }
}

router.get(
  '/me/reports',
  requireAuth,
  attachUser,
  requireRole('CANDIDATE', 'USER', 'ADMIN', 'PRO', 'SUPER_ADMIN'),
  listCandidateReports,
);
router.get(
  '/reports',
  requireAuth,
  attachUser,
  requireRole('CANDIDATE', 'USER', 'ADMIN', 'PRO', 'SUPER_ADMIN'),
  listCandidateReports,
);

export default router;
