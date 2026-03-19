import { Router } from 'express';
import { z } from 'zod';
import { sendSafeJsonError } from '../lib/http-security.js';
import { prisma } from '../lib/prisma.js';
import { signPublicReportToken, verifyPublicReportToken } from '../lib/public-report-token.js';
import { getRequestBaseUrl } from '../lib/request-base-url.js';
import { generateRandomToken, sha256 } from '../lib/security.js';
import { calculateDiscFromAnswers } from '../modules/disc/calculate-disc.js';
import { normalizeBrandingFromOrganization } from '../modules/branding/branding-service.js';
import { buildPremiumReportModel } from '../modules/report/build-report.js';
import { generatePremiumPdf } from '../modules/report/generate-pdf.js';
import {
  REPORT_TYPE,
  normalizeReportType as normalizeCanonicalReportType,
  resolveStoredReportType,
} from '../modules/report/report-type.js';
import { isSuperAdminUser } from '../modules/auth/super-admin-access.js';
import { getUserCreditsBalance } from '../modules/auth/user-credits.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import {
  attachUser,
  canAccessOrganization,
  requireActiveCustomer,
  requireRole,
} from '../middleware/rbac.js';
import { requireReportExport } from '../middleware/require-report-export.js';

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

function normalizeReportType(value) {
  return normalizeCanonicalReportType(value, REPORT_TYPE.BUSINESS);
}

function resolveAssessmentProfile(report = {}) {
  return (
    report?.discProfile?.profile?.key ||
    report?.discProfile?.profileKey ||
    report?.discProfile?.profile?.title ||
    'DISC'
  );
}

function firstNonEmptyText(...values) {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
}

function resolveAssessmentParticipantName(assessment = {}) {
  const reportParticipant = assessment?.report?.discProfile?.participant || {};
  return firstNonEmptyText(
    assessment?.candidateName,
    assessment?.respondent_name,
    assessment?.respondentName,
    reportParticipant?.name,
    reportParticipant?.candidateName,
    reportParticipant?.respondent_name,
    assessment?.candidateEmail,
    assessment?.email,
  );
}

function hasBinaryPdfPayload(buffer) {
  return Boolean(buffer) && Number(buffer?.length || 0) > 0;
}

function looksLikePublicReportToken(token = '') {
  return String(token || '').trim().split('.').length === 3;
}

function resolveAssessmentDiscResult(assessment = {}) {
  return assessment?.report?.discProfile || assessment?.results || assessment?.disc_results || {};
}

function resolveAssessmentReportType(assessment = {}, fallback = REPORT_TYPE.BUSINESS) {
  return resolveStoredReportType(assessment, fallback);
}

function issuePublicReportAccess({
  assessmentId,
  accountId = '',
  organizationId = '',
  reportType = REPORT_TYPE.BUSINESS,
  baseUrl = '',
  ttlSeconds = PUBLIC_REPORT_TOKEN_TTL_SECONDS,
} = {}) {
  const normalizedAssessmentId = String(assessmentId || '').trim();
  const normalizedAccountId = String(accountId || organizationId || '').trim();
  const normalizedReportType = normalizeReportType(reportType);
  const normalizedBaseUrl = String(baseUrl || '').trim().replace(/\/+$/, '');
  const token = signPublicReportToken(
    {
      assessmentId: normalizedAssessmentId,
      accountId: normalizedAccountId,
      organizationId: normalizedAccountId,
      reportType: normalizedReportType,
    },
    ttlSeconds,
  );
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  const publicReportPath = `/c/report?token=${encodeURIComponent(token)}`;
  const publicPdfPath = `/api/report/pdf?token=${encodeURIComponent(token)}`;

  return {
    token,
    reportType: normalizedReportType,
    expiresAt,
    publicReportPath,
    publicPdfPath,
    publicReportUrl: normalizedBaseUrl ? `${normalizedBaseUrl}${publicReportPath}` : publicReportPath,
    publicPdfUrl: normalizedBaseUrl ? `${normalizedBaseUrl}${publicPdfPath}` : publicPdfPath,
  };
}

async function resolveAnyReportAccessToken(token) {
  const rawToken = String(token || '').trim();
  if (!rawToken) {
    return { ok: false, reason: 'TOKEN_REQUIRED' };
  }

  if (looksLikePublicReportToken(rawToken)) {
    try {
      const payload = verifyPublicReportToken(rawToken);
      const assessmentId = String(payload?.assessmentId || '').trim();
      if (!assessmentId) {
        return { ok: false, reason: 'PUBLIC_REPORT_ASSESSMENT_REQUIRED' };
      }

      return {
        ok: true,
        kind: 'public',
        assessmentId,
        accountId: String(payload?.accountId || payload?.organizationId || '').trim(),
        reportType: normalizeReportType(payload?.reportType),
        payload,
      };
    } catch (error) {
      return {
        ok: false,
        reason: 'PUBLIC_REPORT_TOKEN_INVALID',
        message: error?.message || 'Token inválido.',
      };
    }
  }

  const inviteResult = await getValidInviteByToken(rawToken, { allowUsed: true });
  if (!inviteResult.valid) {
    return { ok: false, reason: normalizeReason(inviteResult.reason) };
  }

  return {
    ok: true,
    kind: 'invite',
    assessmentId: inviteResult.invite.assessmentId,
    inviteResult,
  };
}

function buildPdfFailure(error, fallbackReason = 'REPORT_PDF_FAILED') {
  const code = String(error?.code || error?.message || '').trim().toUpperCase();

  if (code.includes('PARTICIPANT.NAME')) {
    return {
      status: 400,
      reason: 'PARTICIPANT_NAME_MISSING',
      message: 'Não foi possível gerar o PDF porque a avaliação não possui nome de participante válido.',
    };
  }

  if (code.includes('BRANDING')) {
    return {
      status: 400,
      reason: 'BRANDING_INCOMPLETE',
      message: 'Não foi possível gerar o PDF porque o branding do workspace está incompleto.',
    };
  }

  if (code.includes('NOT_FOUND')) {
    return {
      status: 404,
      reason: 'NOT_FOUND',
      message: 'Não foi possível localizar a avaliação solicitada para gerar o PDF.',
    };
  }

  return {
    status: Number(error?.statusCode) || 400,
    reason: fallbackReason,
    message: 'Não foi possível gerar o PDF agora. Tente novamente em instantes.',
    detail: code || fallbackReason,
  };
}

async function canAccessAssessmentRecord(user, authUserId, assessment = {}) {
  if (!assessment?.id || !authUserId) return false;
  if (isSuperAdminUser(user || {})) return true;

  const currentEmail = String(user?.email || '').trim().toLowerCase();
  const candidateEmail = String(assessment?.candidateEmail || '').trim().toLowerCase();
  if (assessment?.candidateUserId && assessment.candidateUserId === authUserId) return true;
  if (!assessment?.candidateUserId && currentEmail && candidateEmail && currentEmail === candidateEmail) {
    return true;
  }

  return canAccessOrganization(authUserId, assessment.organizationId);
}

async function getValidInviteByToken(token, options = {}) {
  const allowUsed = Boolean(options.allowUsed);
  const rawToken = String(token || '').trim();
  if (!rawToken) {
    return { valid: false, reason: 'TOKEN_REQUIRED' };
  }

  const tokenHash = sha256(rawToken);
  const invite = await prisma.invite.findUnique({
    where: { tokenHash },
    include: { assessment: true },
  });

  if (!invite) {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  if (invite.expiresAt.getTime() <= Date.now() || invite.status === 'EXPIRED') {
    return { valid: false, reason: 'EXPIRED' };
  }

  const alreadyUsed = Boolean(invite.usedAt) || invite.status === 'USED';
  if (alreadyUsed && !allowUsed) {
    return { valid: false, reason: 'USED' };
  }

  if (invite.status === 'REVOKED') {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  if (!allowUsed && invite.status !== 'ACTIVE') {
    return { valid: false, reason: 'NOT_FOUND' };
  }

  return { valid: true, invite, tokenHash, alreadyUsed };
}

async function resolveOrganizationForUser(userId) {
  const owned = await prisma.organization.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  if (owned?.id) return owned.id;

  const membership = await prisma.organizationMember.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { organizationId: true },
  });
  if (membership?.organizationId) return membership.organizationId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const organization = await prisma.organization.create({
    data: {
      ownerId: user.id,
      name: `${user.name || 'Workspace'} Workspace`,
    },
    select: { id: true },
  });

  await prisma.organizationMember.create({
    data: {
      organizationId: organization.id,
      userId: user.id,
      role: 'OWNER',
    },
  });

  return organization.id;
}

async function ensureOrganizationBrandingDefaults(organizationId) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      companyName: true,
      logoUrl: true,
      brandPrimaryColor: true,
      brandSecondaryColor: true,
      reportFooterText: true,
    },
  });

  if (!organization) return;

  const nextData = {};
  if (!String(organization.companyName || '').trim()) {
    nextData.companyName = String(organization.name || 'InsightDISC').trim();
  }
  if (!String(organization.logoUrl || '').trim()) {
    nextData.logoUrl = '/brand/insightdisc-report-logo.png';
  }
  if (!String(organization.brandPrimaryColor || '').trim()) {
    nextData.brandPrimaryColor = '#0b1f3b';
  }
  if (!String(organization.brandSecondaryColor || '').trim()) {
    nextData.brandSecondaryColor = '#f7b500';
  }
  if (!String(organization.reportFooterText || '').trim()) {
    nextData.reportFooterText = 'InsightDISC - Plataforma de Análise Comportamental';
  }

  if (Object.keys(nextData).length === 0) return;
  await prisma.organization.update({
    where: { id: organizationId },
    data: nextData,
  });
}

router.post('/self/start', requireAuth, attachUser, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        credits: {
          select: { balance: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    }

    if (String(user.role || '').toUpperCase() === 'CANDIDATE') {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }

    const isSuperAdmin = isSuperAdminUser(user);
    const balance = getUserCreditsBalance(user);
    if (!isSuperAdmin && balance < 1) {
      return res.status(402).json({
        ok: false,
        error: 'INSUFFICIENT_CREDITS',
        message: 'Sem créditos disponíveis para iniciar autoavaliação.',
      });
    }

    const organizationId = await resolveOrganizationForUser(user.id);
    await ensureOrganizationBrandingDefaults(organizationId);
    const token = generateRandomToken(24);
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

    const assessment = await prisma.$transaction(async (tx) => {
      const created = await tx.assessment.create({
        data: {
          organizationId,
          createdBy: user.id,
          candidateUserId: user.id,
          candidateName: user.name,
          candidateEmail: user.email,
          status: 'IN_PROGRESS',
          accessTokenHash: tokenHash,
        },
      });

      await tx.invite.create({
        data: {
          assessmentId: created.id,
          tokenHash,
          expiresAt,
          status: 'ACTIVE',
        },
      });

      return created;
    });

    return res.status(201).json({
      ok: true,
      assessmentId: assessment.id,
      token,
      inviteUrl: `/c/assessment?token=${encodeURIComponent(token)}&self=1`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    const message = String(error?.message || 'SELF_START_FAILED').toUpperCase();
    if (message.includes('USER_NOT_FOUND')) {
      return res.status(404).json({ ok: false, error: 'USER_NOT_FOUND' });
    }
    return sendSafeJsonError(res, {
      status: error instanceof z.ZodError ? 400 : 500,
      error: error instanceof z.ZodError ? 'INVALID_SELF_START_PAYLOAD' : 'SELF_START_FAILED',
      message: 'Falha ao iniciar autoavaliação.',
    });
  }
});

router.get('/credits', requireAuth, attachUser, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.userId },
      select: {
        id: true,
        role: true,
        credits: {
          select: { balance: true },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
    }

    const isSuperAdmin = isSuperAdminUser(user);
    const credits = isSuperAdmin ? 999999 : getUserCreditsBalance(user);
    return res.status(200).json({
      ok: true,
      credits: Number(credits || 0),
      isSuperAdmin,
    });
  } catch (error) {
    return sendSafeJsonError(res, {
      status: 500,
      error: 'ASSESSMENT_CREDITS_FAILED',
      message: 'Falha ao carregar créditos.',
    });
  }
});

router.get('/validate-token', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    if (!token) {
      return res.status(400).json({ valid: false, reason: 'TOKEN_REQUIRED' });
    }

    const result = await getValidInviteByToken(token);
    if (!result.valid) {
      const reason = normalizeReason(result.reason);
      return res.status(statusCodeByReason(reason)).json({ valid: false, reason });
    }

    return res.status(200).json({
      valid: true,
      reason: 'VALID',
      assessment: {
        id: result.invite.assessment.id,
        status: result.invite.assessment.status,
        candidateEmail: result.invite.assessment.candidateEmail,
        candidateName: result.invite.assessment.candidateName,
      },
      expiresAt: result.invite.expiresAt,
    });
  } catch (error) {
    return sendSafeJsonError(res, {
      status: 500,
      error: 'VALIDATION_ERROR',
      message: 'Falha ao validar token.',
      details: { valid: false, reason: 'VALIDATION_ERROR' },
    });
  }
});

router.get('/report-by-token', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    const access = await resolveAnyReportAccessToken(token);

    if (!access.ok) {
      const reason = normalizeReason(access.reason);
      const status =
        access.reason === 'PUBLIC_REPORT_TOKEN_INVALID'
          ? 401
          : statusCodeByReason(reason);
      return res.status(status).json({
        ok: false,
        reason: access.reason,
        ...(access.message ? { message: access.message } : {}),
      });
    }

    const assessment = await prisma.assessment.findFirst({
      where:
        access.kind === 'public' && access.accountId
          ? {
              id: access.assessmentId,
              organizationId: access.accountId,
            }
          : { id: access.assessmentId },
      include: { report: true, response: true, organization: true, quickContext: true },
    });

    if (!assessment) {
      return res.status(404).json({ ok: false, reason: 'NOT_FOUND' });
    }

    const responseAnswers = Array.isArray(assessment?.response?.answersJson)
      ? assessment.response.answersJson
      : [];

    const companyName = String(assessment?.organization?.companyName || '').trim();
    const logoUrl = String(assessment?.organization?.logoUrl || '').trim();
    if (!companyName || !logoUrl) {
      return res.status(400).json({
        ok: false,
        reason: 'BRANDING_INCOMPLETE',
        error: 'Branding incompleto para geracao white-label',
      });
    }

    const participantName = resolveAssessmentParticipantName(assessment);
    if (!participantName) {
      return res.status(400).json({
        ok: false,
        reason: 'PARTICIPANT_NAME_MISSING',
        error: 'Dado obrigatorio ausente: participant.name',
      });
    }

    const requestedReportType = normalizeReportType(
      req.query.type ||
        req.query.reportType ||
        access.reportType ||
        resolveAssessmentReportType(assessment, REPORT_TYPE.BUSINESS),
    );
    const publicAccess = issuePublicReportAccess({
      assessmentId: assessment.id,
      accountId: assessment.organizationId,
      reportType: requestedReportType,
      baseUrl: getRequestBaseUrl(req),
    });

    return res.status(200).json({
      ok: true,
      reason: 'VALID',
      reportType: requestedReportType,
      assessment: {
        id: assessment.id,
        status: assessment.status,
        candidateName: participantName,
        candidateEmail: assessment.candidateEmail,
        createdAt: assessment.createdAt,
        completedAt: assessment.completedAt,
        answeredCount: responseAnswers.length,
        branding: normalizeBrandingFromOrganization(assessment.organization),
      },
      report: {
        id: assessment.report?.id || null,
        pdfUrl: publicAccess.publicPdfUrl,
        discProfile: assessment.report?.discProfile || null,
        reportType: requestedReportType,
      },
      publicAccess,
      answeredCount: responseAnswers.length,
      answers: responseAnswers,
    });
  } catch (error) {
    const reason = normalizeReason(error?.message || 'REPORT_BY_TOKEN_ERROR');
    return sendSafeJsonError(res, {
      status: 500,
      error: reason || 'REPORT_BY_TOKEN_ERROR',
      message: 'Falha ao carregar relatório por token.',
      details: { reason: reason || 'REPORT_BY_TOKEN_ERROR' },
    });
  }
});

router.get('/public-token/:id', optionalAuth, attachUser, async (req, res) => {
  try {
    const assessmentId = String(req.params.id || '').trim();
    if (!assessmentId) {
      return res.status(400).json({
        ok: false,
        reason: 'ASSESSMENT_ID_REQUIRED',
        message: 'assessmentId é obrigatório.',
      });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        report: true,
        creator: true,
        organization: { include: { owner: true } },
      },
    });

    if (!assessment) {
      return res.status(404).json({ ok: false, reason: 'NOT_FOUND' });
    }

    let allowed = false;
    const authUserId = String(req.auth?.userId || '').trim();
    if (authUserId) {
      allowed = await canAccessAssessmentRecord(req.user || {}, authUserId, assessment);
    }

    if (!allowed) {
      const sourceToken = String(req.query.token || req.query.t || '').trim();
      if (sourceToken) {
        const access = await resolveAnyReportAccessToken(sourceToken);
        allowed = Boolean(
          access.ok &&
            access.assessmentId === assessment.id &&
            (!access.accountId || access.accountId === assessment.organizationId),
        );
      }
    }

    if (!allowed) {
      return res.status(403).json({
        ok: false,
        reason: 'FORBIDDEN',
        message: 'Sem permissão para emitir token público deste relatório.',
      });
    }

    const publicAccess = issuePublicReportAccess({
      assessmentId: assessment.id,
      accountId: assessment.organizationId,
      reportType: normalizeReportType(
        req.query.type ||
          req.query.reportType ||
          resolveAssessmentReportType(assessment, REPORT_TYPE.BUSINESS),
      ),
      baseUrl: getRequestBaseUrl(req),
    });

    return res.status(200).json({
      ok: true,
      assessmentId: assessment.id,
      ...publicAccess,
    });
  } catch (error) {
    return sendSafeJsonError(res, {
      status: 500,
      error: 'PUBLIC_REPORT_TOKEN_CREATE_FAILED',
      message: 'Não foi possível emitir o token público do relatório.',
    });
  }
});

router.get(
  '/report-data',
  requireAuth,
  attachUser,
  requireActiveCustomer,
  async (req, res) => {
    try {
      const assessmentId = String(req.query.id || req.query.assessmentId || '').trim();
      if (!assessmentId) {
        return res.status(400).json({ ok: false, reason: 'ASSESSMENT_ID_REQUIRED' });
      }

      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          report: true,
          response: true,
          organization: true,
          quickContext: true,
        },
      });

      if (!assessment) {
        return res.status(404).json({ ok: false, reason: 'NOT_FOUND' });
      }

      const allowed = await canAccessAssessmentRecord(req.user || {}, req.auth.userId, assessment);
      if (!allowed) {
        return res.status(403).json({ ok: false, reason: 'FORBIDDEN' });
      }

      if (!assessment.report) {
        return res.status(404).json({ ok: false, reason: 'REPORT_NOT_FOUND' });
      }

      return res.status(200).json({
        ok: true,
        assessment: {
          id: assessment.id,
          status: assessment.status,
          candidateName: resolveAssessmentParticipantName(assessment),
          candidateEmail: assessment.candidateEmail || '',
          candidateUserId: assessment.candidateUserId || '',
          createdAt: assessment.createdAt,
          completedAt: assessment.completedAt,
          organizationId: assessment.organizationId,
          organizationName: assessment.organization?.name || '',
          branding: normalizeBrandingFromOrganization(assessment.organization || {}),
        },
        report: {
          id: assessment.report.id,
          pdfUrl: assessment.report.pdfUrl || '',
          discProfile: assessment.report.discProfile || {},
        },
        reportItem: {
          assessmentId: assessment.id,
          reportId: assessment.report.id,
          candidateUserId: assessment.candidateUserId || '',
          candidateName: resolveAssessmentParticipantName(assessment),
          candidateEmail: assessment.candidateEmail || '',
          createdAt: assessment.createdAt,
          completedAt: assessment.completedAt,
          pdfUrl: assessment.report.pdfUrl || '',
          discProfile: assessment.report.discProfile || {},
        },
      });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        reason: 'REPORT_DATA_FAILED',
        message: 'Não foi possível carregar os dados do relatório.',
      });
    }
  },
);

router.get(
  '/history',
  requireAuth,
  attachUser,
  requireRole('ADMIN', 'PRO'),
  requireActiveCustomer,
  async (req, res) => {
    try {
      const isSuperAdmin = isSuperAdminUser(req.user || {});
      let where = {
        report: { isNot: null },
        candidateUserId: { not: null },
      };

      if (!isSuperAdmin) {
        const [ownedOrganizations, memberships] = await Promise.all([
          prisma.organization.findMany({
            where: { ownerId: req.auth.userId },
            select: { id: true },
          }),
          prisma.organizationMember.findMany({
            where: { userId: req.auth.userId },
            select: { organizationId: true },
          }),
        ]);

        const organizationIds = Array.from(
          new Set([
            ...ownedOrganizations.map((item) => item.id),
            ...memberships.map((item) => item.organizationId),
          ]),
        ).filter(Boolean);

        if (!organizationIds.length) {
          return res.status(200).json({ ok: true, history: [] });
        }

        where = {
          ...where,
          organizationId: { in: organizationIds },
        };
      }

      const assessments = await prisma.assessment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 240,
        select: {
          id: true,
          candidateUserId: true,
          candidateName: true,
          candidateEmail: true,
          createdAt: true,
          completedAt: true,
          report: {
            select: {
              discProfile: true,
            },
          },
        },
      });

      const seenCandidates = new Set();
      const history = [];
      for (const item of assessments) {
        const candidateId = String(item.candidateUserId || '').trim();
        if (!candidateId || seenCandidates.has(candidateId)) continue;
        seenCandidates.add(candidateId);
        history.push({
          candidateId,
          candidateName: item.candidateName || item.candidateEmail || 'Participante',
          candidateEmail: item.candidateEmail || '',
          profile: resolveAssessmentProfile(item.report || {}),
          createdAt: item.completedAt || item.createdAt,
          assessmentId: item.id,
        });
      }

      return res.status(200).json({ ok: true, history });
    } catch (error) {
      return res.status(500).json({
        ok: false,
        reason: 'ASSESSMENT_HISTORY_FAILED',
        message: 'Não foi possível carregar o histórico de avaliações.',
      });
    }
  },
);

router.get('/report-pdf-by-token', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    const shouldDownload = String(req.query.download || '').toLowerCase() === '1';
    const result = await getValidInviteByToken(token, { allowUsed: true });

    if (!result.valid) {
      const reason = normalizeReason(result.reason);
      return res.status(statusCodeByReason(reason)).json({ ok: false, reason });
    }

    const assetBaseUrl = getRequestBaseUrl(req);
      const assessment = await prisma.assessment.findUnique({
        where: { id: result.invite.assessmentId },
        include: {
          report: true,
          creator: true,
          organization: { include: { owner: true } },
          quickContext: true,
        },
      });

    if (!assessment) {
      return res.status(404).json({ ok: false, reason: 'NOT_FOUND' });
    }

    const reportType = normalizeReportType(
      req.query.type ||
        req.query.reportType ||
        resolveAssessmentReportType(assessment, REPORT_TYPE.BUSINESS),
    );

    console.info('[assessment/report-pdf-by-token] generating PDF', {
      assessmentId: assessment.id,
      reportType,
      shouldDownload,
    });

    const publicAccess = issuePublicReportAccess({
      assessmentId: assessment.id,
      accountId: assessment.organizationId,
      reportType,
      baseUrl: assetBaseUrl,
    });
    if (!shouldDownload) {
      return res.status(200).json({
        ok: true,
        reportId: assessment.report?.id || null,
        assessmentId: assessment.id,
        reportType,
        pdfUrl: publicAccess.publicPdfUrl,
        pdfPath: publicAccess.publicPdfPath,
        publicAccess,
      });
    }

    const reportModel = await buildPremiumReportModel({
      assessment,
      discResult: resolveAssessmentDiscResult(assessment),
      assetBaseUrl,
      currentUser: assessment.creator || assessment.organization?.owner || null,
      reportType,
    });

    const generated = await generatePremiumPdf(reportModel, assessment.id, assessment, {
      inMemory: true,
      reportType,
    });
    await prisma.report.upsert({
      where: { assessmentId: assessment.id },
      create: {
        assessmentId: assessment.id,
        discProfile: reportModel,
        pdfUrl: publicAccess.publicPdfUrl,
      },
      update: {
        discProfile: reportModel,
        pdfUrl: publicAccess.publicPdfUrl,
      },
    });

    const buffer = generated.pdfBuffer;
    if (!hasBinaryPdfPayload(buffer)) {
      return res.status(503).json({
        ok: false,
        reason: 'PDF_UNAVAILABLE',
        message: 'Não foi possível gerar o PDF agora. Tente novamente em instantes.',
      });
    }

    const fileName = generated.fileName || `insightdisc-relatorio-${assessment.id}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'no-store');

    console.info('[assessment/report-pdf-by-token] PDF generated', {
      assessmentId: assessment.id,
      bytes: buffer.length,
    });

    return res.status(200).send(buffer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[assessment/report-pdf-by-token] failed:', error?.stack || error?.message || error);
    const failure = buildPdfFailure(error, 'PDF_BY_TOKEN_FAILED');
    return res.status(failure.status).json({
      ok: false,
      reason: failure.reason,
      message: failure.message,
      ...(failure.detail ? { detail: failure.detail } : {}),
    });
  }
});

router.get('/public-report-pdf', async (req, res) => {
  const token = String(req.query.token || req.query.t || '').trim();

  let assessmentId = '';
  let accountId = '';
  let reportType = REPORT_TYPE.BUSINESS;
  try {
    const payload = verifyPublicReportToken(token);
    assessmentId = String(payload?.assessmentId || '').trim();
    accountId = String(payload?.accountId || payload?.organizationId || '').trim();
    reportType = normalizeReportType(payload?.reportType || req.query.type || req.query.reportType);
  } catch (error) {
    return res.status(401).json({
      ok: false,
      reason: 'PUBLIC_REPORT_TOKEN_INVALID',
      message: error?.message || 'Token inválido.',
    });
  }

  if (!assessmentId) {
    return res.status(400).json({
      ok: false,
      reason: 'PUBLIC_REPORT_ASSESSMENT_REQUIRED',
      message: 'Token sem assessmentId.',
    });
  }

  if (!accountId) {
    return res.status(401).json({
      ok: false,
      reason: 'PUBLIC_REPORT_ACCOUNT_REQUIRED',
      message: 'Token sem accountId.',
    });
  }

  try {
    const assetBaseUrl = getRequestBaseUrl(req);
    const assessment = await prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        organizationId: accountId,
      },
      include: {
        report: true,
        creator: true,
        organization: { include: { owner: true } },
        quickContext: true,
      },
    });

    if (!assessment) {
      return res.status(404).json({
        ok: false,
        reason: 'NOT_FOUND',
        message: 'Não localizamos a avaliação para gerar o PDF oficial.',
      });
    }

    const reportModel = await buildPremiumReportModel({
      assessment,
      discResult: resolveAssessmentDiscResult(assessment),
      assetBaseUrl,
      currentUser: assessment.creator || assessment.organization?.owner || null,
      reportType,
    });

    const generated = await generatePremiumPdf(reportModel, assessment.id, assessment, {
      inMemory: true,
      reportType,
    });
    const buffer = generated.pdfBuffer;

    if (!hasBinaryPdfPayload(buffer)) {
      return res.status(503).json({
        ok: false,
        reason: 'PDF_UNAVAILABLE',
        message: 'Não foi possível gerar o PDF agora. Tente novamente em instantes.',
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="relatorio-disc-${reportType}-${assessment.id}.pdf"`,
    );
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(buffer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[assessment/public-report-pdf] failed:', error?.stack || error?.message || error);
    const failure = buildPdfFailure(error, 'PUBLIC_REPORT_PDF_FAILED');
    return res.status(failure.status).json({
      ok: false,
      reason: failure.reason,
      message: failure.message,
      ...(failure.detail ? { detail: failure.detail } : {}),
    });
  }
});

router.post(
  '/generate-report',
  requireAuth,
  attachUser,
  requireActiveCustomer,
  requireReportExport,
  async (req, res) => {
    try {
      const schema = z.object({
        assessmentId: z.string().min(1),
        type: z.string().optional(),
        reportType: z.string().optional(),
      });
      const input = schema.parse(req.body || {});
      const reportType = normalizeReportType(input.type || input.reportType);
      const assessmentId = String(input.assessmentId || '').trim();

      const assetBaseUrl = getRequestBaseUrl(req);
      const assessment = await prisma.assessment.findUnique({
        where: { id: assessmentId },
        include: {
          report: true,
          creator: true,
          organization: { include: { owner: true } },
          quickContext: true,
        },
      });

      if (!assessment) {
        return res.status(404).json({ ok: false, reason: 'NOT_FOUND' });
      }

      const allowed = await canAccessOrganization(req.auth.userId, assessment.organizationId);
      if (!allowed) {
        return res.status(403).json({ ok: false, reason: 'FORBIDDEN' });
      }

      console.info('[assessment/generate-report] start', {
        assessmentId: assessment.id,
        reportType,
        userId: req.auth.userId,
      });

      const reportModel = await buildPremiumReportModel({
        assessment,
        discResult: resolveAssessmentDiscResult(assessment),
        assetBaseUrl,
        currentUser: req.user || assessment.creator || assessment.organization?.owner || null,
        reportType,
      });

      const generated = await generatePremiumPdf(reportModel, assessment.id, assessment, {
        inMemory: true,
        reportType,
      });

      const buffer = generated.pdfBuffer;
      if (!hasBinaryPdfPayload(buffer)) {
        return res.status(503).json({
          ok: false,
          reason: 'PDF_UNAVAILABLE',
          message: 'Não foi possível gerar o PDF agora. Tente novamente em instantes.',
        });
      }

      const publicAccess = issuePublicReportAccess({
        assessmentId: assessment.id,
        accountId: assessment.organizationId,
        reportType,
        baseUrl: assetBaseUrl,
      });

      const report = await prisma.report.upsert({
        where: { assessmentId: assessment.id },
        create: {
          assessmentId: assessment.id,
          discProfile: reportModel,
          pdfUrl: publicAccess.publicPdfUrl,
        },
        update: {
          discProfile: reportModel,
          pdfUrl: publicAccess.publicPdfUrl,
        },
      });

      console.info('[assessment/generate-report] success', {
        assessmentId: assessment.id,
        reportId: report.id,
        reportType,
      });

      return res.status(200).json({
        ok: true,
        assessmentId: assessment.id,
        reportType,
        report: {
          id: report.id,
          assessmentId: report.assessmentId,
          pdfUrl: publicAccess.publicPdfUrl,
        },
        pdfUrl: publicAccess.publicPdfUrl,
        publicAccess,
      });
    } catch (error) {
      const failure = buildPdfFailure(error, 'GENERATE_REPORT_FAILED');
      return res.status(failure.status).json({
        ok: false,
        reason: failure.reason,
        message:
          failure.reason === 'GENERATE_REPORT_FAILED'
            ? 'Não foi possível regenerar o relatório agora. Tente novamente.'
            : failure.message,
        ...(failure.detail ? { detail: failure.detail } : {}),
      });
    }
  },
);

router.get(
  '/report-pdf',
  requireAuth,
  attachUser,
  requireActiveCustomer,
  requireReportExport,
  async (_req, res) => {
    return res.status(410).json({
      ok: false,
      reason: 'LEGACY_ID_BASED_PDF_DISABLED',
      message:
        'O download por assessmentId foi desativado. Gere um token em /assessment/public-token/:id e baixe via /api/report/pdf?token=....',
    });
  },
);

router.post('/consume', async (req, res) => {
  try {
    const schema = z.object({
      token: z.string().min(1),
      respondentName: z.string().min(2).optional(),
      respondentEmail: z.string().email().optional(),
    });

    const input = schema.parse(req.body || {});
    const result = await getValidInviteByToken(input.token, { allowUsed: true });
    if (!result.valid) {
      const reason = normalizeReason(result.reason);
      return res.status(statusCodeByReason(reason)).json({ ok: false, reason });
    }

    const currentInvite = result.invite;
    const now = new Date();

    if (result.alreadyUsed) {
      return res.status(200).json({
        ok: true,
        assessmentId: currentInvite.assessmentId,
        alreadyConsumed: true,
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.invite.update({
        where: { id: currentInvite.id },
        data: {
          status: 'USED',
          usedAt: now,
        },
      });

      await tx.assessment.update({
        where: { id: currentInvite.assessmentId },
        data: {
          status: 'IN_PROGRESS',
          candidateName: input.respondentName || currentInvite.assessment.candidateName,
          candidateEmail: input.respondentEmail || currentInvite.assessment.candidateEmail,
          accessTokenHash: result.tokenHash,
        },
      });
    });

    return res.status(200).json({ ok: true, assessmentId: currentInvite.assessmentId });
  } catch (error) {
    return sendSafeJsonError(res, {
      status: error instanceof z.ZodError ? 400 : 500,
      error: error instanceof z.ZodError ? 'INVALID_CONSUME_PAYLOAD' : 'CONSUME_ERROR',
      message: 'Falha ao consumir convite.',
      details: { reason: error instanceof z.ZodError ? 'INVALID_CONSUME_PAYLOAD' : 'CONSUME_ERROR' },
    });
  }
});

router.post('/submit', async (req, res) => {
  try {
    const schema = z.object({
      token: z.string().min(1),
      respondentName: z.string().min(2),
      respondentEmail: z.string().email(),
      answers: z.array(
        z.object({
          questionId: z.string().min(1),
          most: z.string().min(1),
          least: z.string().min(1),
        })
      ).min(1),
    });

    const input = schema.parse(req.body || {});
    const result = await getValidInviteByToken(input.token, { allowUsed: true });
    if (!result.valid) {
      const reason = normalizeReason(result.reason);
      return res.status(statusCodeByReason(reason)).json({ ok: false, reason, error: reason });
    }
    if (result.alreadyUsed && result.invite?.assessment?.status === 'COMPLETED') {
      return res.status(409).json({ ok: false, reason: 'USED', error: 'USED' });
    }

    const isSelfAssessment =
      Boolean(result?.invite?.assessment?.candidateUserId) &&
      result.invite.assessment.candidateUserId === result.invite.assessment.createdBy;
    const selfAssessmentOwnerId = result?.invite?.assessment?.createdBy || '';
    let isSuperAdminSelfAssessment = false;

    if (isSelfAssessment) {
      const owner = await prisma.user.findUnique({
        where: { id: selfAssessmentOwnerId },
        select: {
          role: true,
          credits: {
            select: { balance: true },
          },
        },
      });
      isSuperAdminSelfAssessment = isSuperAdminUser(owner || {});
      const balance = getUserCreditsBalance(owner);
      if (!isSuperAdminSelfAssessment && balance < 1) {
        return res.status(402).json({
          ok: false,
          reason: 'INSUFFICIENT_CREDITS',
          error: 'INSUFFICIENT_CREDITS',
        });
      }
    }

    const discResult = calculateDiscFromAnswers(input.answers);

    const response = await prisma.$transaction(async (tx) => {
      if (isSelfAssessment && !isSuperAdminSelfAssessment) {
        const credit = await tx.credit.findUnique({
          where: { userId: selfAssessmentOwnerId },
          select: { balance: true },
        });

        if (Number(credit?.balance || 0) < 1) {
          const insufficient = new Error('INSUFFICIENT_CREDITS');
          insufficient.statusCode = 402;
          throw insufficient;
        }

        await tx.credit.update({
          where: { userId: selfAssessmentOwnerId },
          data: { balance: { decrement: 1 } },
        });
      }

      const assessment = await tx.assessment.update({
        where: { id: result.invite.assessmentId },
        data: {
          status: 'COMPLETED',
          candidateName: input.respondentName,
          candidateEmail: input.respondentEmail,
          completedAt: new Date(),
          accessTokenHash: result.tokenHash,
        },
      });

      await tx.response.upsert({
        where: { assessmentId: assessment.id },
        create: {
          assessmentId: assessment.id,
          answersJson: input.answers,
        },
        update: {
          answersJson: input.answers,
        },
      });

      const report = await tx.report.upsert({
        where: { assessmentId: assessment.id },
        create: {
          assessmentId: assessment.id,
          discProfile: discResult,
        },
        update: {
          discProfile: discResult,
        },
      });

      if (!result.alreadyUsed) {
        await tx.invite.update({
          where: { id: result.invite.id },
          data: {
            status: 'USED',
            usedAt: new Date(),
          },
        });
      }

      return { assessment, report, creditsConsumed: isSelfAssessment && !isSuperAdminSelfAssessment ? 1 : 0 };
    });

    const publicAccess = issuePublicReportAccess({
      assessmentId: response.assessment.id,
      accountId: response.assessment.organizationId,
      reportType: resolveStoredReportType(response.assessment, REPORT_TYPE.BUSINESS),
      baseUrl: getRequestBaseUrl(req),
    });

    return res.status(200).json({
      ok: true,
      assessmentId: response.assessment.id,
      reportId: response.report.id,
      reportType: publicAccess.reportType,
      creditsConsumed: Number(response.creditsConsumed || 0),
      disc: discResult,
      publicAccess,
    });
  } catch (error) {
    if (Number(error?.statusCode) === 402 || String(error?.message || '').includes('INSUFFICIENT_CREDITS')) {
      return res.status(402).json({
        ok: false,
        reason: 'INSUFFICIENT_CREDITS',
        error: 'INSUFFICIENT_CREDITS',
      });
    }
    return sendSafeJsonError(res, {
      status: error instanceof z.ZodError ? 400 : 500,
      error: error instanceof z.ZodError ? 'INVALID_ASSESSMENT_SUBMIT_PAYLOAD' : 'ASSESSMENT_SUBMIT_FAILED',
      message: 'Falha ao submeter assessment.',
    });
  }
});

export default router;
