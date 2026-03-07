import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requireActiveCustomer, requireRole } from '../middleware/rbac.js';

const router = Router();
const jobsByOrganization = new Map();
const FACTORS = ['D', 'I', 'S', 'C'];

router.use(requireAuth, attachUser, requireRole('ADMIN', 'PRO'), requireActiveCustomer);

function toNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function normalizeFactorRange(discIdeal = {}, min = {}, max = {}) {
  const normalized = {};
  for (const factor of FACTORS) {
    const source = discIdeal?.[factor] || {};
    const minValue = clamp(toNumber(min?.[factor], toNumber(source?.min, 20)));
    const maxValue = clamp(toNumber(max?.[factor], toNumber(source?.max, 80)));
    const boundedMin = Math.min(minValue, maxValue);
    const boundedMax = Math.max(minValue, maxValue);
    const midpoint = Math.round((boundedMin + boundedMax) / 2);
    const idealValue = clamp(toNumber(source?.ideal, midpoint));

    normalized[factor] = {
      min: boundedMin,
      max: boundedMax,
      ideal: clamp(Math.min(boundedMax, Math.max(boundedMin, idealValue))),
    };
  }
  return normalized;
}

async function resolveOrganizationId(userId) {
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

  return '';
}

router.get('/', async (req, res) => {
  try {
    const organizationId = await resolveOrganizationId(req.auth.userId);
    if (!organizationId) {
      return res.status(200).json({ ok: true, jobs: [] });
    }

    const jobs = jobsByOrganization.get(organizationId) || [];
    return res.status(200).json({ ok: true, jobs });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha ao carregar vagas.' });
  }
});

router.post('/', async (req, res) => {
  try {
    const schema = z.object({
      titulo: z.string().trim().min(2),
      departamento: z.string().trim().optional(),
      descricao: z.string().trim().optional(),
      disc_ideal: z.record(z.string(), z.any()).optional(),
      min: z.record(z.string(), z.number()).optional(),
      max: z.record(z.string(), z.number()).optional(),
      competencias: z.array(z.string()).optional(),
    });

    const input = schema.parse(req.body || {});
    const organizationId = await resolveOrganizationId(req.auth.userId);
    if (!organizationId) {
      return res.status(400).json({ ok: false, error: 'ORGANIZATION_NOT_FOUND' });
    }

    const idealProfile = normalizeFactorRange(input.disc_ideal, input.min, input.max);
    const nextJob = {
      id: randomUUID(),
      title: input.titulo,
      department: input.departamento || '',
      description: input.descricao || '',
      ideal_profile: idealProfile,
      key_competencies: Array.isArray(input.competencias)
        ? input.competencias.filter(Boolean)
        : [],
      is_active: true,
      candidates: [],
      created_at: new Date().toISOString(),
    };

    const currentJobs = jobsByOrganization.get(organizationId) || [];
    jobsByOrganization.set(organizationId, [nextJob, ...currentJobs]);

    return res.status(201).json({ ok: true, job: nextJob });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'Falha ao criar vaga.' });
  }
});

export default router;
