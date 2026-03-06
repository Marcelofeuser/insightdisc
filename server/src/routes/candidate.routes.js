import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword, sha256, signJwt, verifyPassword } from '../lib/security.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requireRole } from '../middleware/rbac.js';

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
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().min(2).optional(),
    });

    const input = schema.parse(req.body || {});
    const normalizedEmail = input.email.toLowerCase();
    const inviteResult = await getInviteByToken(input.token, { allowUsed: true });

    if (!inviteResult.valid) {
      const reason = normalizeReason(inviteResult.reason);
      return res.status(statusCodeByReason(reason)).json({ ok: false, reason });
    }

    const assessment = inviteResult.invite.assessment;
    if (!assessment) {
      return res.status(404).json({ ok: false, reason: 'ASSESSMENT_NOT_FOUND' });
    }

    const expectedEmail = String(assessment.candidateEmail || '').trim().toLowerCase();
    if (expectedEmail && expectedEmail !== normalizedEmail) {
      return res.status(403).json({ ok: false, reason: 'EMAIL_MISMATCH' });
    }

    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: input.name || assessment.candidateName || 'Candidato',
          role: 'CANDIDATE',
          passwordHash: await hashPassword(input.password),
          credits: { create: { balance: 0 } },
        },
      });
    } else {
      const validPassword = await verifyPassword(input.password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ ok: false, reason: 'INVALID_CREDENTIALS' });
      }

      if (user.role === 'CANDIDATE' && !user.name && input.name) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name: input.name },
        });
      }
    }

    await prisma.assessment.update({
      where: { id: assessment.id },
      data: {
        candidateUserId: user.id,
        candidateEmail: assessment.candidateEmail || normalizedEmail,
        candidateName: assessment.candidateName || input.name || user.name,
      },
    });

    const token = signJwt({ sub: user.id, email: user.email, role: user.role });

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
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'CLAIM_FAILED' });
  }
}

router.post('/claim', claimReport);
router.post('/claim-report', claimReport);

async function listCandidateReports(req, res) {
  try {
    const where =
      req.user?.role === 'CANDIDATE'
        ? { candidateUserId: req.user.id }
        : { createdBy: req.user.id };

    const assessments = await prisma.assessment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { report: true },
      take: 100,
    });

    return res.status(200).json({
      ok: true,
      reports: assessments
        .filter((assessment) => Boolean(assessment.report))
        .map((assessment) => ({
          assessmentId: assessment.id,
          candidateName: assessment.candidateName,
          candidateEmail: assessment.candidateEmail,
          createdAt: assessment.createdAt,
          completedAt: assessment.completedAt,
          reportId: assessment.report?.id || null,
          pdfUrl: assessment.report?.pdfUrl || null,
          discProfile: assessment.report?.discProfile || null,
        })),
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: error?.message || 'CANDIDATE_REPORTS_FAILED' });
  }
}

router.get('/me/reports', requireAuth, attachUser, requireRole('CANDIDATE', 'ADMIN', 'PRO'), listCandidateReports);
router.get('/reports', requireAuth, attachUser, requireRole('CANDIDATE', 'ADMIN', 'PRO'), listCandidateReports);

export default router;
