import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword, signJwt } from '../lib/security.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requireRole } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth, attachUser, requireRole('ADMIN'));

router.post('/organizations', async (req, res) => {
  try {
    const schema = z.object({
      name: z.string().min(2),
      ownerId: z.string().min(1).optional(),
    });
    const input = schema.parse(req.body || {});
    const ownerId = input.ownerId || req.user.id;

    const org = await prisma.organization.create({
      data: { name: input.name, companyName: input.name, ownerId },
    });

    await prisma.organizationMember.upsert({
      where: {
        organizationId_userId: { organizationId: org.id, userId: ownerId },
      },
      create: {
        organizationId: org.id,
        userId: ownerId,
        role: 'OWNER',
      },
      update: {
        role: 'OWNER',
      },
    });

    return res.status(201).json({ ok: true, organization: org });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'ADMIN_ORG_CREATE_FAILED' });
  }
});

router.post('/professionals', async (req, res) => {
  try {
    const schema = z.object({
      email: z.string().email(),
      name: z.string().min(2),
      password: z.string().min(8),
      organizationId: z.string().min(1).optional(),
    });
    const input = schema.parse(req.body || {});
    const email = input.email.toLowerCase();

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return res.status(409).json({ ok: false, error: 'Email já cadastrado.' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: input.name,
        role: 'PRO',
        passwordHash: await hashPassword(input.password),
        credits: { create: { balance: 0 } },
      },
    });

    if (input.organizationId) {
      await prisma.organizationMember.create({
        data: {
          organizationId: input.organizationId,
          userId: user.id,
          role: 'ADMIN',
        },
      });
    }

    const token = signJwt({ sub: user.id, email: user.email, role: user.role });
    return res.status(201).json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      token,
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'ADMIN_PRO_CREATE_FAILED' });
  }
});

export default router;
