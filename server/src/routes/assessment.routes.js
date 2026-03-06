import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sha256 } from '../lib/security.js';
import { calculateDiscFromAnswers } from '../modules/disc/calculate-disc.js';
import { normalizeBrandingFromOrganization } from '../modules/branding/branding-service.js';

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

    const discResult = calculateDiscFromAnswers(input.answers);

    const response = await prisma.$transaction(async (tx) => {
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

      return { assessment, report };
    });

    return res.status(200).json({
      ok: true,
      assessmentId: response.assessment.id,
      reportId: response.report.id,
      disc: discResult,
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha ao submeter assessment.' });
  }
});

export default router;
