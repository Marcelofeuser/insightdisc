import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { sha256, verifyJwt } from '../lib/security.js';
import { canAccessOrganization } from '../middleware/rbac.js';
import { isSuperAdminUser } from '../modules/auth/super-admin-access.js';
import { syncDossierAnamnesisFromQuickContext } from '../modules/dossier/dossier.service.js';

const router = Router();

const QUICK_ENUMS = {
  smoker: ['não', 'sim'],
  alcoholConsumption: ['não', 'ocasionalmente', 'frequentemente'],
  stressLevel: ['baixo', 'moderado', 'alto'],
  sleepQuality: ['boa', 'regular', 'ruim'],
  physicalActivity: ['não', '1-2x semana', '3+ vezes semana'],
  usesMedication: ['não', 'sim'],
};

const quickContextSchema = z
  .object({
    assessmentId: z.string().trim().optional(),
    token: z.string().trim().optional(),
    sex: z.string().trim().max(80).optional().or(z.literal('')),
    maritalStatus: z.string().trim().max(120).optional().or(z.literal('')),
    city: z.string().trim().max(180).optional().or(z.literal('')),
    stressLevel: z.string().trim().max(120).optional().or(z.literal('')),
    sleepQuality: z.string().trim().max(120).optional().or(z.literal('')),
    physicalActivity: z.string().trim().max(120).optional().or(z.literal('')),
    smoker: z.string().trim().max(120).optional().or(z.literal('')),
    alcoholConsumption: z.string().trim().max(120).optional().or(z.literal('')),
    usesMedication: z.string().trim().max(120).optional().or(z.literal('')),
    healthConditions: z.string().trim().max(2000).optional().or(z.literal('')),
  })
  .refine((value) => value.assessmentId || value.token, {
    message: 'ASSESSMENT_OR_TOKEN_REQUIRED',
  });

function normalizeOptionalString(value) {
  const normalized = String(value ?? '').trim();
  return normalized ? normalized : null;
}

function normalizeEnum(value, allowed) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) return null;
  return allowed.includes(normalized) ? normalized : null;
}

function readBearerToken(authorizationHeader = '') {
  const [scheme, token] = String(authorizationHeader || '').trim().split(' ');
  if (String(scheme || '').toLowerCase() !== 'bearer') return '';
  return String(token || '').trim();
}

async function resolveAuthUser(req) {
  const token = readBearerToken(req.headers.authorization);
  if (!token) return null;

  try {
    const payload = verifyJwt(token);
    if (!payload?.sub) return null;
    return prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true },
    });
  } catch {
    return null;
  }
}

async function resolveInviteByToken(token) {
  const rawToken = String(token || '').trim();
  if (!rawToken) return null;

  const invite = await prisma.invite.findUnique({
    where: { tokenHash: sha256(rawToken) },
    include: { assessment: true },
  });
  if (!invite) return null;
  if (invite.status === 'REVOKED') return null;
  if (invite.expiresAt.getTime() <= Date.now() || invite.status === 'EXPIRED') return null;
  return invite;
}

async function resolveAssessmentAccess({ assessment, authUser, invite }) {
  if (!assessment?.id) return false;
  if (invite?.assessmentId === assessment.id) return true;
  if (!authUser?.id) return false;
  if (isSuperAdminUser(authUser)) return true;
  if (assessment.candidateUserId && assessment.candidateUserId === authUser.id) return true;

  const normalizedUserEmail = String(authUser.email || '').trim().toLowerCase();
  const normalizedCandidateEmail = String(assessment.candidateEmail || '')
    .trim()
    .toLowerCase();
  if (
    normalizedUserEmail &&
    normalizedCandidateEmail &&
    normalizedUserEmail === normalizedCandidateEmail
  ) {
    return true;
  }

  return canAccessOrganization(authUser.id, assessment.organizationId);
}

function mapQuickContextRecord(record = null) {
  if (!record) return null;
  return {
    id: record.id,
    assessmentId: record.assessmentId,
    sex: record.sex || '',
    maritalStatus: record.maritalStatus || '',
    city: record.city || '',
    stressLevel: record.stressLevel || '',
    sleepQuality: record.sleepQuality || '',
    physicalActivity: record.physicalActivity || '',
    smoker: record.smoker || '',
    alcoholConsumption: record.alcoholConsumption || '',
    usesMedication: record.usesMedication || '',
    healthConditions: record.healthConditions || '',
    createdAt: record.createdAt,
  };
}

router.post('/quick', async (req, res) => {
  try {
    const input = quickContextSchema.parse(req.body || {});
    const invite = input.token ? await resolveInviteByToken(input.token) : null;
    const assessmentId = String(input.assessmentId || invite?.assessmentId || '').trim();
    if (!assessmentId) {
      return res.status(400).json({ ok: false, error: 'ASSESSMENT_OR_TOKEN_REQUIRED' });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        organizationId: true,
        candidateUserId: true,
        candidateEmail: true,
      },
    });
    if (!assessment?.id) {
      return res.status(404).json({ ok: false, error: 'ASSESSMENT_NOT_FOUND' });
    }

    const authUser = await resolveAuthUser(req);
    const allowed = await resolveAssessmentAccess({ assessment, authUser, invite });
    if (!allowed) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }

    const quickContext = await prisma.assessmentQuickContext.upsert({
      where: { assessmentId: assessment.id },
      create: {
        assessmentId: assessment.id,
        sex: normalizeOptionalString(input.sex),
        maritalStatus: normalizeOptionalString(input.maritalStatus),
        city: normalizeOptionalString(input.city),
        stressLevel: normalizeEnum(input.stressLevel, QUICK_ENUMS.stressLevel),
        sleepQuality: normalizeEnum(input.sleepQuality, QUICK_ENUMS.sleepQuality),
        physicalActivity: normalizeEnum(input.physicalActivity, QUICK_ENUMS.physicalActivity),
        smoker: normalizeEnum(input.smoker, QUICK_ENUMS.smoker),
        alcoholConsumption: normalizeEnum(input.alcoholConsumption, QUICK_ENUMS.alcoholConsumption),
        usesMedication: normalizeEnum(input.usesMedication, QUICK_ENUMS.usesMedication),
        healthConditions: normalizeOptionalString(input.healthConditions),
      },
      update: {
        sex: normalizeOptionalString(input.sex),
        maritalStatus: normalizeOptionalString(input.maritalStatus),
        city: normalizeOptionalString(input.city),
        stressLevel: normalizeEnum(input.stressLevel, QUICK_ENUMS.stressLevel),
        sleepQuality: normalizeEnum(input.sleepQuality, QUICK_ENUMS.sleepQuality),
        physicalActivity: normalizeEnum(input.physicalActivity, QUICK_ENUMS.physicalActivity),
        smoker: normalizeEnum(input.smoker, QUICK_ENUMS.smoker),
        alcoholConsumption: normalizeEnum(input.alcoholConsumption, QUICK_ENUMS.alcoholConsumption),
        usesMedication: normalizeEnum(input.usesMedication, QUICK_ENUMS.usesMedication),
        healthConditions: normalizeOptionalString(input.healthConditions),
      },
    });

    try {
      await syncDossierAnamnesisFromQuickContext({
        assessmentId: assessment.id,
        quickContext,
      });
    } catch {
      // Sincronização com dossier_anamnesis é best-effort.
    }

    return res.status(200).json({
      ok: true,
      assessmentId: assessment.id,
      quickContext: mapQuickContextRecord(quickContext),
    });
  } catch (error) {
    const code = String(error?.message || error?.code || '').toUpperCase();
    if (code.includes('ASSESSMENT_OR_TOKEN_REQUIRED')) {
      return res.status(400).json({ ok: false, error: 'ASSESSMENT_OR_TOKEN_REQUIRED' });
    }
    return res.status(400).json({
      ok: false,
      error: 'QUICK_CONTEXT_SAVE_FAILED',
      message: 'Não foi possível salvar o contexto pessoal.',
    });
  }
});

router.get('/quick/:assessmentId', async (req, res) => {
  try {
    const assessmentId = String(req.params.assessmentId || '').trim();
    if (!assessmentId) {
      return res.status(400).json({ ok: false, error: 'ASSESSMENT_ID_REQUIRED' });
    }

    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      select: {
        id: true,
        organizationId: true,
        candidateUserId: true,
        candidateEmail: true,
      },
    });
    if (!assessment?.id) {
      return res.status(404).json({ ok: false, error: 'ASSESSMENT_NOT_FOUND' });
    }

    const token = String(req.query.token || '').trim();
    const invite = token ? await resolveInviteByToken(token) : null;
    const authUser = await resolveAuthUser(req);
    const allowed = await resolveAssessmentAccess({ assessment, authUser, invite });
    if (!allowed) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN' });
    }

    const quickContext = await prisma.assessmentQuickContext.findUnique({
      where: { assessmentId: assessment.id },
    });

    return res.status(200).json({
      ok: true,
      assessmentId: assessment.id,
      quickContext: mapQuickContextRecord(quickContext),
      hasData: Boolean(quickContext),
    });
  } catch {
    return res.status(500).json({
      ok: false,
      error: 'QUICK_CONTEXT_FETCH_FAILED',
      message: 'Não foi possível carregar o contexto pessoal.',
    });
  }
});

export default router;
