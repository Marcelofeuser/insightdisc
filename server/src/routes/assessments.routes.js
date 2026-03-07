import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { generateRandomToken, sha256 } from '../lib/security.js';
import { requireAuth } from '../middleware/auth.js';
import {
  attachUser,
  canAccessOrganization,
  requireActiveCustomer,
  requireRole,
} from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth, attachUser, requireRole('ADMIN', 'PRO'), requireActiveCustomer);

router.post('/create', async (req, res) => {
  try {
    const schema = z.object({
      organizationId: z.string().min(1),
      candidateEmail: z.string().email().optional(),
      candidateName: z.string().min(2).optional(),
    });

    const input = schema.parse(req.body || {});
    const allowed = await canAccessOrganization(req.auth.userId, input.organizationId);
    if (!allowed) {
      return res.status(403).json({ ok: false, error: 'Sem permissão para criar avaliação nesta organização.' });
    }

    const assessment = await prisma.assessment.create({
      data: {
        organizationId: input.organizationId,
        createdBy: req.auth.userId,
        candidateEmail: input.candidateEmail || null,
        candidateName: input.candidateName || null,
      },
    });

    return res.status(201).json({ ok: true, assessment });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha ao criar assessment.' });
  }
});

router.post('/generate-link', async (req, res) => {
  try {
    const schema = z.object({
      assessmentId: z.string().min(1),
      expiresInHours: z.number().int().positive().max(24 * 30).optional(),
    });

    const input = schema.parse(req.body || {});
    const assessment = await prisma.assessment.findUnique({ where: { id: input.assessmentId } });
    if (!assessment) {
      return res.status(404).json({ ok: false, error: 'Assessment não encontrado.' });
    }

    const allowed = await canAccessOrganization(req.auth.userId, assessment.organizationId);
    if (!allowed) {
      return res.status(403).json({ ok: false, error: 'Sem permissão para gerar convite.' });
    }

    const token = generateRandomToken(24);
    const tokenHash = sha256(token);
    const expiresAt = new Date(Date.now() + (input.expiresInHours || 24 * 7) * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      await tx.invite.create({
        data: {
          assessmentId: assessment.id,
          tokenHash,
          expiresAt,
        },
      });

      await tx.assessment.update({
        where: { id: assessment.id },
        data: { accessTokenHash: tokenHash },
      });
    });

    const inviteUrl = `${env.appUrl}/c/invite?token=${encodeURIComponent(token)}`;

    return res.status(200).json({
      ok: true,
      assessmentId: assessment.id,
      inviteUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha ao gerar link.' });
  }
});

export default router;
