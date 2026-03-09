import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { generateRandomToken, sha256 } from '../lib/security.js';
import { calculateDiscFromAnswers } from '../modules/disc/calculate-disc.js';
import { normalizeBrandingFromOrganization } from '../modules/branding/branding-service.js';
import { buildPremiumReportModel } from '../modules/report/build-report.js';
import { generatePremiumPdf } from '../modules/report/generate-pdf.js';
import { isSuperAdminUser } from '../modules/auth/super-admin-access.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser } from '../middleware/rbac.js';

const router = Router();

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
          take: 1,
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
    const balance = Number(user.credits?.[0]?.balance || 0);
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
    return res.status(400).json({ ok: false, error: error?.message || 'SELF_START_FAILED' });
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
    return res.status(500).json({ valid: false, reason: error?.message || 'VALIDATION_ERROR' });
  }
});

router.get('/report-by-token', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    const result = await getValidInviteByToken(token, { allowUsed: true });

    if (!result.valid) {
      const reason = normalizeReason(result.reason);
      return res.status(statusCodeByReason(reason)).json({ ok: false, reason });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: result.invite.assessmentId },
      include: { report: true, response: true, organization: true },
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

    const participantName = String(assessment?.candidateName || '').trim();
    if (!participantName) {
      return res.status(400).json({
        ok: false,
        reason: 'PARTICIPANT_NAME_MISSING',
        error: 'Dado obrigatorio ausente: participant.name',
      });
    }

    return res.status(200).json({
      ok: true,
      reason: 'VALID',
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
        pdfUrl: assessment.report?.pdfUrl || null,
        discProfile: assessment.report?.discProfile || null,
      },
      answeredCount: responseAnswers.length,
      answers: responseAnswers,
    });
  } catch (error) {
    const reason = normalizeReason(error?.message || 'REPORT_BY_TOKEN_ERROR');
    return res.status(500).json({ ok: false, reason });
  }
});

router.get('/report-pdf-by-token', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    const shouldDownload = String(req.query.download || '').toLowerCase() === '1';
    const result = await getValidInviteByToken(token, { allowUsed: true });

    if (!result.valid) {
      const reason = normalizeReason(result.reason);
      return res.status(statusCodeByReason(reason)).json({ ok: false, reason });
    }

    const assetBaseUrl = `${req.protocol}://${req.get('host')}`;
    const assessment = await prisma.assessment.findUnique({
      where: { id: result.invite.assessmentId },
      include: {
        report: true,
        creator: true,
        organization: { include: { owner: true } },
      },
    });

    if (!assessment) {
      return res.status(404).json({ ok: false, reason: 'NOT_FOUND' });
    }

    const downloadPath = `/assessment/report-pdf-by-token?token=${encodeURIComponent(token)}&download=1`;
    const absoluteDownloadUrl = `${assetBaseUrl}${downloadPath}`;
    if (!shouldDownload) {
      return res.status(200).json({
        ok: true,
        reportId: assessment.report?.id || null,
        assessmentId: assessment.id,
        pdfUrl: absoluteDownloadUrl,
        pdfPath: downloadPath,
      });
    }

    const reportModel = await buildPremiumReportModel({
      assessment,
      discResult: assessment.report?.discProfile || {},
      assetBaseUrl,
      currentUser: assessment.creator || assessment.organization?.owner || null,
    });

    const generated = await generatePremiumPdf(reportModel, assessment.id, assessment, {
      inMemory: true,
    });

    await prisma.report.upsert({
      where: { assessmentId: assessment.id },
      create: {
        assessmentId: assessment.id,
        discProfile: reportModel,
        pdfUrl: downloadPath,
      },
      update: {
        discProfile: reportModel,
        pdfUrl: downloadPath,
      },
    });

    const buffer = generated.pdfBuffer;
    if (!buffer || !Buffer.isBuffer(buffer)) {
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

    return res.status(200).send(buffer);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[assessment/report-pdf-by-token] failed:', error?.stack || error?.message || error);
    const status = Number(error?.statusCode) || 400;
    return res.status(status).json({
      ok: false,
      reason: 'PDF_BY_TOKEN_FAILED',
      message: 'Não foi possível gerar o PDF agora. Tente novamente em instantes.',
    });
  }
});

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
    return res.status(400).json({ ok: false, reason: error?.message || 'CONSUME_ERROR' });
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
            take: 1,
          },
        },
      });
      isSuperAdminSelfAssessment = isSuperAdminUser(owner || {});
      const balance = Number(owner?.credits?.[0]?.balance || 0);
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

    return res.status(200).json({
      ok: true,
      assessmentId: response.assessment.id,
      reportId: response.report.id,
      creditsConsumed: Number(response.creditsConsumed || 0),
      disc: discResult,
    });
  } catch (error) {
    if (Number(error?.statusCode) === 402 || String(error?.message || '').includes('INSUFFICIENT_CREDITS')) {
      return res.status(402).json({
        ok: false,
        reason: 'INSUFFICIENT_CREDITS',
        error: 'INSUFFICIENT_CREDITS',
      });
    }
    return res.status(400).json({ ok: false, error: error?.message || 'Falha ao submeter assessment.' });
  }
});

export default router;
