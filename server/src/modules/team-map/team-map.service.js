import { prisma } from '../../lib/prisma.js';
import { isSuperAdminUser } from '../auth/super-admin-access.js';
import {
  DISC_FACTORS,
  FACTOR_LABELS,
  extractDiscScoresFromReport,
  resolveAssessmentParticipantLabel,
  resolveDominantFactor,
  resolveProfileKey,
} from '../disc/disc-profile-utils.js';

function createError(code, message) {
  const error = new Error(message || code);
  error.code = String(code || 'TEAM_MAP_ERROR').toUpperCase();
  return error;
}

async function resolveAllowedOrganizationIds(userId) {
  if (!userId) return [];

  const [ownedOrganizations, memberships] = await Promise.all([
    prisma.organization.findMany({
      where: { ownerId: userId },
      select: { id: true },
    }),
    prisma.organizationMember.findMany({
      where: { userId },
      select: { organizationId: true },
    }),
  ]);

  return Array.from(
    new Set([
      ...ownedOrganizations.map((item) => item.id),
      ...memberships.map((item) => item.organizationId),
    ]),
  ).filter(Boolean);
}

function mapAssessmentToTeamProfile(assessment = {}) {
  const discProfile = assessment?.report?.discProfile || {};
  const disc = extractDiscScoresFromReport(discProfile);
  if (!disc) return null;

  const dominantFactor = resolveDominantFactor(disc);
  const ranking = [...DISC_FACTORS]
    .map((factor) => ({ factor, value: Number(disc?.[factor] || 0) }))
    .sort((a, b) => b.value - a.value);
  const secondaryFactor = ranking.find((item) => item.factor !== dominantFactor)?.factor || '';

  const participant = discProfile?.participant || {};
  const department = String(
    participant?.department ||
      participant?.team ||
      participant?.area ||
      '',
  ).trim();
  const role = String(
    participant?.role ||
      participant?.jobTitle ||
      participant?.position ||
      '',
  ).trim();
  const manager = String(
    participant?.manager ||
      participant?.managerName ||
      participant?.leader ||
      '',
  ).trim();
  const city = String(
    assessment?.quickContext?.city ||
      participant?.city ||
      '',
  ).trim();

  return {
    assessmentId: assessment.id,
    organizationId: assessment.organizationId,
    candidateName: resolveAssessmentParticipantLabel(assessment),
    candidateEmail: String(assessment?.candidateEmail || '').trim(),
    createdAt: assessment?.completedAt || assessment?.createdAt || null,
    completedAt: assessment?.completedAt || null,
    dominantFactor,
    secondaryFactor,
    profileCode: resolveProfileKey(discProfile, disc),
    department,
    role,
    manager,
    city,
    disc,
  };
}

async function findAccessibleAssessments({ userId, user = {}, assessmentIds = [] } = {}) {
  if (!userId) {
    throw createError('AUTH_REQUIRED', 'Autenticação necessária para analisar equipes.');
  }

  const normalizedIds = Array.from(
    new Set((Array.isArray(assessmentIds) ? assessmentIds : []).map((item) => String(item || '').trim())),
  ).filter(Boolean);

  const baseWhere = {
    report: { isNot: null },
    ...(normalizedIds.length ? { id: { in: normalizedIds } } : {}),
  };

  if (isSuperAdminUser(user || {})) {
    return prisma.assessment.findMany({
      where: baseWhere,
      select: {
        id: true,
        organizationId: true,
        candidateName: true,
        candidateEmail: true,
        createdAt: true,
        completedAt: true,
        quickContext: {
          select: {
            city: true,
          },
        },
        report: {
          select: {
            discProfile: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
      take: normalizedIds.length ? undefined : 300,
    });
  }

  const organizationIds = await resolveAllowedOrganizationIds(userId);
  if (!organizationIds.length) return [];

  return prisma.assessment.findMany({
    where: {
      ...baseWhere,
      organizationId: { in: organizationIds },
    },
    select: {
      id: true,
      organizationId: true,
      candidateName: true,
      candidateEmail: true,
      createdAt: true,
      completedAt: true,
      quickContext: {
        select: {
          city: true,
        },
      },
      report: {
        select: {
          discProfile: true,
        },
      },
    },
    orderBy: { completedAt: 'desc' },
    take: normalizedIds.length ? undefined : 300,
  });
}

export async function listTeamMapAssessments({ userId, user = {} } = {}) {
  const assessments = await findAccessibleAssessments({ userId, user });

  return assessments
    .map((assessment) => mapAssessmentToTeamProfile(assessment))
    .filter(Boolean)
    .map((item) => ({
      assessmentId: item.assessmentId,
      organizationId: item.organizationId,
      candidateName: item.candidateName,
      candidateEmail: item.candidateEmail,
      createdAt: item.createdAt,
      completedAt: item.completedAt,
      dominantFactor: item.dominantFactor,
      secondaryFactor: item.secondaryFactor,
      profileCode: item.profileCode,
      department: item.department,
      role: item.role,
      manager: item.manager,
      city: item.city,
      disc: item.disc,
    }));
}

function predominantNarrative(dominantFactor = 'S') {
  switch (dominantFactor) {
    case 'D':
      return 'Equipe com predominância D: forte foco em resultado, velocidade de decisão e orientação para metas desafiadoras.';
    case 'I':
      return 'Equipe com predominância I: forte capacidade de influência, energia social e mobilização de pessoas.';
    case 'S':
      return 'Equipe com predominância S: forte cooperação, estabilidade e constância na execução.';
    case 'C':
      return 'Equipe com predominância C: forte precisão, análise crítica e padrão de qualidade elevado.';
    default:
      return 'Equipe com distribuição equilibrada entre fatores DISC, com boa complementaridade de estilos.';
  }
}

function buildCollectivePercentages(teamProfiles = []) {
  if (!teamProfiles.length) {
    return { D: 0, I: 0, S: 0, C: 0 };
  }

  const totals = { D: 0, I: 0, S: 0, C: 0 };

  teamProfiles.forEach((profile) => {
    DISC_FACTORS.forEach((factor) => {
      totals[factor] += Number(profile?.disc?.[factor] || 0);
    });
  });

  return DISC_FACTORS.reduce((accumulator, factor) => {
    accumulator[factor] = Number((totals[factor] / teamProfiles.length).toFixed(2));
    return accumulator;
  }, {});
}

function buildDominanceDistribution(teamProfiles = []) {
  const totalMembers = teamProfiles.length;
  const counts = { D: 0, I: 0, S: 0, C: 0 };

  teamProfiles.forEach((profile) => {
    const dominant = String(profile?.dominantFactor || '').toUpperCase();
    if (counts[dominant] !== undefined) {
      counts[dominant] += 1;
    }
  });

  const percentages = DISC_FACTORS.reduce((accumulator, factor) => {
    const amount = counts[factor] || 0;
    accumulator[factor] = totalMembers ? Number(((amount / totalMembers) * 100).toFixed(2)) : 0;
    return accumulator;
  }, {});

  return {
    counts,
    percentages,
  };
}

export async function analyzeTeamMap({ userId, user = {}, assessmentIds = [] } = {}) {
  const normalizedIds = Array.from(
    new Set((Array.isArray(assessmentIds) ? assessmentIds : []).map((item) => String(item || '').trim())),
  ).filter(Boolean);

  if (!normalizedIds.length) {
    throw createError('ASSESSMENT_IDS_REQUIRED', 'Selecione ao menos uma avaliação para montar o mapa da equipe.');
  }

  const rawAssessments = await findAccessibleAssessments({
    userId,
    user,
    assessmentIds: normalizedIds,
  });

  const mappedById = new Map(
    rawAssessments
      .map((assessment) => mapAssessmentToTeamProfile(assessment))
      .filter(Boolean)
      .map((item) => [item.assessmentId, item]),
  );

  const selectedProfiles = normalizedIds
    .map((assessmentId) => mappedById.get(assessmentId) || null)
    .filter(Boolean);

  if (!selectedProfiles.length) {
    throw createError('ASSESSMENTS_NOT_ACCESSIBLE', 'Nenhuma avaliação válida foi encontrada para este mapa.');
  }

  const collectivePercentages = buildCollectivePercentages(selectedProfiles);
  const dominance = buildDominanceDistribution(selectedProfiles);
  const predominantFactor = resolveDominantFactor(collectivePercentages);

  return {
    selectedCount: selectedProfiles.length,
    members: selectedProfiles,
    collectivePercentages,
    dominanceDistribution: dominance,
    predominantFactor,
    predominantLabel: FACTOR_LABELS[predominantFactor] || predominantFactor,
    predominantNarrative: predominantNarrative(predominantFactor),
    lineSeries: selectedProfiles.map((profile, index) => ({
      label: profile.candidateName || `Participante ${index + 1}`,
      D: profile.disc.D,
      I: profile.disc.I,
      S: profile.disc.S,
      C: profile.disc.C,
    })),
  };
}
