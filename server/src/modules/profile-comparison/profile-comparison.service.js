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
  error.code = String(code || 'PROFILE_COMPARISON_ERROR').toUpperCase();
  return error;
}

function mapAssessmentsById(assessments = []) {
  const map = new Map();
  assessments.forEach((item) => {
    const key = String(item?.assessmentId || item?.id || '').trim();
    if (key) {
      map.set(key, item);
    }
  });
  return map;
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

function normalizeCompatibility(score) {
  const safeScore = Number.isFinite(score) ? score : 0;
  return Math.max(0, Math.min(100, Number(safeScore.toFixed(2))));
}

function compatibilityLevel(score = 0) {
  if (score >= 85) return 'Muito alta';
  if (score >= 70) return 'Alta';
  if (score >= 55) return 'Moderada';
  return 'Baixa';
}

function computeCompatibilitySimple(profileA = {}, profileB = {}) {
  const averageDistance = DISC_FACTORS.reduce((accumulator, factor) => {
    const left = Number(profileA?.[factor] || 0);
    const right = Number(profileB?.[factor] || 0);
    return accumulator + Math.abs(left - right);
  }, 0) / DISC_FACTORS.length;

  const score = normalizeCompatibility(100 - averageDistance);
  return {
    score,
    level: compatibilityLevel(score),
  };
}

function buildStrengthsAndConflicts(profileA = {}, profileB = {}) {
  const strengths = [];
  const conflicts = [];

  DISC_FACTORS.forEach((factor) => {
    const distance = Math.abs(Number(profileA?.[factor] || 0) - Number(profileB?.[factor] || 0));
    const label = FACTOR_LABELS[factor] || factor;

    if (distance <= 12) {
      strengths.push(`Boa sintonia em ${label} (diferença de ${distance.toFixed(1)} pontos).`);
    }

    if (distance >= 25) {
      conflicts.push(`Diferença relevante em ${label} (gap de ${distance.toFixed(1)} pontos).`);
    }
  });

  if (!strengths.length) {
    strengths.push('Complementaridade equilibrada: os perfis podem se fortalecer com papéis claros.');
  }

  if (!conflicts.length) {
    conflicts.push('Não há conflitos críticos aparentes; alinhar prioridades já tende a funcionar bem.');
  }

  return {
    strengths,
    conflicts,
  };
}

function mapAssessmentToComparableProfile(assessment = {}) {
  const scores = extractDiscScoresFromReport(assessment?.report?.discProfile || {});
  if (!scores) return null;

  const profileKey = resolveProfileKey(assessment?.report?.discProfile || {}, scores);

  return {
    assessmentId: assessment.id,
    candidateName: resolveAssessmentParticipantLabel(assessment),
    candidateEmail: String(assessment?.candidateEmail || '').trim(),
    createdAt: assessment?.completedAt || assessment?.createdAt || null,
    disc: scores,
    profileKey,
    dominantFactor: resolveDominantFactor(scores),
  };
}

async function findAccessibleAssessments({ userId, user = {}, assessmentIds = [] } = {}) {
  if (!userId) {
    throw createError('AUTH_REQUIRED', 'Autenticação necessária para comparar perfis.');
  }

  const normalizedIds = Array.from(
    new Set((Array.isArray(assessmentIds) ? assessmentIds : []).map((item) => String(item || '').trim())),
  ).filter(Boolean);

  const baseWhere = {
    report: { isNot: null },
    ...(normalizedIds.length ? { id: { in: normalizedIds } } : {}),
  };

  const superAdmin = isSuperAdminUser(user || {});
  if (superAdmin) {
    return prisma.assessment.findMany({
      where: baseWhere,
      select: {
        id: true,
        organizationId: true,
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

export async function listComparisonAssessments({ userId, user = {} } = {}) {
  const assessments = await findAccessibleAssessments({ userId, user });

  return assessments
    .map((assessment) => mapAssessmentToComparableProfile(assessment))
    .filter(Boolean)
    .map((item) => ({
      assessmentId: item.assessmentId,
      candidateName: item.candidateName,
      candidateEmail: item.candidateEmail,
      createdAt: item.createdAt,
      profileKey: item.profileKey,
      dominantFactor: item.dominantFactor,
      disc: item.disc,
    }));
}

function buildPairwiseComparison(leftProfile, rightProfile) {
  const compatibility = computeCompatibilitySimple(leftProfile.disc, rightProfile.disc);
  const details = buildStrengthsAndConflicts(leftProfile.disc, rightProfile.disc);

  return {
    leftAssessmentId: leftProfile.assessmentId,
    leftCandidateName: leftProfile.candidateName,
    rightAssessmentId: rightProfile.assessmentId,
    rightCandidateName: rightProfile.candidateName,
    score: compatibility.score,
    level: compatibility.level,
    strengths: details.strengths,
    conflicts: details.conflicts,
  };
}

function averageFactors(profiles = []) {
  if (!profiles.length) {
    return { D: 0, I: 0, S: 0, C: 0 };
  }

  const totals = { D: 0, I: 0, S: 0, C: 0 };

  profiles.forEach((profile) => {
    DISC_FACTORS.forEach((factor) => {
      totals[factor] += Number(profile?.disc?.[factor] || 0);
    });
  });

  return DISC_FACTORS.reduce((accumulator, factor) => {
    accumulator[factor] = Number((totals[factor] / profiles.length).toFixed(2));
    return accumulator;
  }, {});
}

export async function compareAssessmentProfiles({ userId, user = {}, assessmentIds = [] } = {}) {
  const normalizedIds = Array.from(
    new Set((Array.isArray(assessmentIds) ? assessmentIds : []).map((item) => String(item || '').trim())),
  ).filter(Boolean);

  if (normalizedIds.length < 2) {
    throw createError('ASSESSMENTS_MIN_REQUIRED', 'Selecione pelo menos duas avaliações para comparar.');
  }

  const rawAssessments = await findAccessibleAssessments({
    userId,
    user,
    assessmentIds: normalizedIds,
  });

  const profilesById = mapAssessmentsById(
    rawAssessments
      .map((assessment) => mapAssessmentToComparableProfile(assessment))
      .filter(Boolean),
  );

  const selectedProfiles = normalizedIds
    .map((assessmentId) => profilesById.get(assessmentId) || null)
    .filter(Boolean);

  if (selectedProfiles.length < 2) {
    throw createError('ASSESSMENTS_NOT_ACCESSIBLE', 'As avaliações selecionadas não estão disponíveis para comparação.');
  }

  const pairwise = [];
  for (let leftIndex = 0; leftIndex < selectedProfiles.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < selectedProfiles.length; rightIndex += 1) {
      pairwise.push(buildPairwiseComparison(selectedProfiles[leftIndex], selectedProfiles[rightIndex]));
    }
  }

  const overallCompatibilityScore = pairwise.length
    ? Number(
        (
          pairwise.reduce((accumulator, item) => accumulator + Number(item.score || 0), 0) /
          pairwise.length
        ).toFixed(2),
      )
    : 0;

  return {
    selectedCount: selectedProfiles.length,
    profiles: selectedProfiles,
    pairwise,
    overallCompatibility: {
      score: overallCompatibilityScore,
      level: compatibilityLevel(overallCompatibilityScore),
    },
    averageDisc: averageFactors(selectedProfiles),
  };
}
