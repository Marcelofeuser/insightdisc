import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { mapCandidateReports } from '@/modules/report/backendReports';
import { PERMISSIONS, hasPermission } from '@/modules/auth/access-control';
import { buildBehaviorInsights } from '@/modules/analytics/insights';

const FACTORS = ['D', 'I', 'S', 'C'];
const FACTOR_LABELS = {
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade',
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  if (!value) return 'Sem data';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sem data';
  return parsed.toLocaleDateString('pt-BR');
}

function normalizeStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'unknown';
  if (['completed', 'done', 'finalizado', 'concluido', 'concluída', 'concluida'].includes(normalized)) {
    return 'completed';
  }
  if (['pending', 'in_progress', 'in-progress', 'draft', 'open'].includes(normalized)) {
    return 'pending';
  }
  return normalized;
}

function readSummaryProfile(record = {}) {
  const candidates = [
    record?.results?.summary_profile,
    record?.disc_results?.summary,
    record?.disc_profile?.summary,
    record?.disc_profile?.charts?.summary,
    record?.discProfile?.summary,
    record?.discProfile?.charts?.summary,
    record?.scores?.summary,
    record?.summary,
    record?.natural,
  ];

  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== 'object') continue;
    const map = {
      D: toNumber(candidate?.D),
      I: toNumber(candidate?.I),
      S: toNumber(candidate?.S),
      C: toNumber(candidate?.C),
    };
    const total = FACTORS.reduce((sum, factor) => sum + map[factor], 0);
    if (total > 0) {
      return FACTORS.reduce((acc, factor) => {
        acc[factor] = Number(((map[factor] / total) * 100).toFixed(1));
        return acc;
      }, {});
    }
  }

  return null;
}

function resolveDominantFactor(summary = null) {
  if (!summary) return '';
  const ranking = FACTORS
    .map((factor) => ({ factor, value: toNumber(summary[factor]) }))
    .sort((a, b) => b.value - a.value);
  return ranking[0]?.factor || '';
}

function resolveProfileKey(summary = null) {
  if (!summary) return '';
  const ranking = FACTORS
    .map((factor) => ({ factor, value: toNumber(summary[factor]) }))
    .sort((a, b) => b.value - a.value);

  const primary = ranking[0]?.factor;
  const secondary = ranking[1]?.factor;
  if (!primary || !secondary) return primary || '';
  return `${primary}${secondary}`;
}

function resolveCandidateName(record = {}) {
  return (
    record?.respondent_name ||
    record?.candidate_name ||
    record?.candidateName ||
    record?.lead_name ||
    record?.user_name ||
    record?.lead_email ||
    record?.candidateEmail ||
    record?.email ||
    'Participante'
  );
}

function resolveCandidateEmail(record = {}) {
  return (
    record?.lead_email ||
    record?.candidateEmail ||
    record?.user_email ||
    record?.email ||
    ''
  );
}

function resolveDate(record = {}) {
  return (
    record?.completed_at ||
    record?.completedAt ||
    record?.created_at ||
    record?.createdAt ||
    record?.created_date ||
    null
  );
}

function normalizeAssessmentRecord(record = {}) {
  const summary = readSummaryProfile(record);
  return {
    id: String(record?.id || record?.assessmentId || record?.reportId || '').trim(),
    status: normalizeStatus(record?.status),
    candidateName: resolveCandidateName(record),
    candidateEmail: resolveCandidateEmail(record),
    date: resolveDate(record),
    summary,
    dominantFactor: resolveDominantFactor(summary),
    profileKey: resolveProfileKey(summary),
  };
}

function loadLocalDossierSummary(workspaceId = '') {
  if (typeof window === 'undefined') {
    return { activeDossiers: 0, scheduledThisMonth: 0 };
  }

  try {
    const raw = JSON.parse(window.localStorage.getItem('insightdisc_behavioral_dossiers') || '{}');
    const keyPrefix = `${String(workspaceId || 'default-workspace').trim()}:`;
    const records = Object.entries(raw || {}).filter(([key]) => key.startsWith(keyPrefix));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

    const scheduledThisMonth = records.reduce((total, [, value]) => {
      const reminders = Array.isArray(value?.dossier?.reminders) ? value.dossier.reminders : [];
      const count = reminders.filter((item) => {
        const date = new Date(item?.date);
        return date >= monthStart && date < nextMonth;
      }).length;
      return total + count;
    }, 0);

    return {
      activeDossiers: records.length,
      scheduledThisMonth,
    };
  } catch {
    return { activeDossiers: 0, scheduledThisMonth: 0 };
  }
}

function buildInsights(distribution = {}, sampleSize = 0) {
  return buildBehaviorInsights(distribution, sampleSize);
}

function parseDateForSort(value) {
  const timestamp = new Date(value || 0).getTime();
  if (!Number.isFinite(timestamp)) return 0;
  return timestamp;
}

function formatMonthLabel(value = '') {
  const [year, month] = String(value || '').split('-');
  if (!year || !month) return value;
  const date = new Date(Number(year), Number(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

function buildTrendSeries(records = []) {
  const byMonth = records.reduce((acc, item) => {
    const timestamp = parseDateForSort(item?.date);
    if (!timestamp) return acc;
    const date = new Date(timestamp);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!acc[monthKey]) {
      acc[monthKey] = { count: 0, D: 0, I: 0, S: 0, C: 0 };
    }
    acc[monthKey].count += 1;
    FACTORS.forEach((factor) => {
      acc[monthKey][factor] += toNumber(item?.summary?.[factor]);
    });
    return acc;
  }, {});

  return Object.entries(byMonth)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([monthKey, values]) => ({
      monthKey,
      label: formatMonthLabel(monthKey),
      count: values.count,
      D: values.count ? Number((values.D / values.count).toFixed(1)) : 0,
      I: values.count ? Number((values.I / values.count).toFixed(1)) : 0,
      S: values.count ? Number((values.S / values.count).toFixed(1)) : 0,
      C: values.count ? Number((values.C / values.count).toFixed(1)) : 0,
    }));
}

export function useDashboardData({ access, user }) {
  const apiBaseUrl = getApiBaseUrl();
  const workspaceId =
    user?.active_workspace_id ||
    user?.tenant_id ||
    access?.tenantId ||
    '';
  const identityKey = access?.userId || access?.email || user?.id || user?.email || 'anonymous';

  const assessmentsQuery = useQuery({
    queryKey: ['dashboard-v2-assessments', apiBaseUrl, workspaceId, identityKey],
    enabled: Boolean(identityKey),
    queryFn: async () => {
      if (apiBaseUrl) {
        if (!getApiToken()) {
          return [];
        }
        const payload = await apiRequest('/candidate/me/reports', {
          method: 'GET',
          requireAuth: true,
        });
        return mapCandidateReports(payload?.reports || []);
      }

      if (access?.tenantId) {
        return base44.entities.Assessment.filter({ workspace_id: access.tenantId }, '-created_date', 500);
      }

      if (access?.email) {
        const byEmail = await base44.entities.Assessment.filter({ user_id: access.email }, '-created_date', 300);
        if (Array.isArray(byEmail) && byEmail.length) return byEmail;
      }

      if (access?.userId) {
        return base44.entities.Assessment.filter({ user_id: access.userId }, '-created_date', 300);
      }

      return [];
    },
  });

  const dossierQuery = useQuery({
    queryKey: ['dashboard-v2-dossier-summary', apiBaseUrl, workspaceId],
    enabled: Boolean(hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE)),
    queryFn: async () => {
      if (apiBaseUrl && workspaceId) {
        try {
          const payload = await apiRequest(
            `/api/dossier/reminders/summary?workspaceId=${encodeURIComponent(workspaceId)}`,
            {
              method: 'GET',
              requireAuth: true,
            }
          );
          return {
            activeDossiers: toNumber(payload?.summary?.activeDossiers),
            scheduledThisMonth: toNumber(payload?.summary?.scheduledThisMonth),
          };
        } catch {
          return loadLocalDossierSummary(workspaceId);
        }
      }

      return loadLocalDossierSummary(workspaceId);
    },
  });

  const normalizedAssessments = useMemo(() => {
    const source = Array.isArray(assessmentsQuery.data) ? assessmentsQuery.data : [];
    return source
      .map((item) => normalizeAssessmentRecord(item))
      .filter((item) => item.id || item.candidateName);
  }, [assessmentsQuery.data]);

  const snapshot = useMemo(() => {
    const completed = normalizedAssessments.filter((item) => item.status === 'completed');
    const pending = normalizedAssessments.filter((item) => item.status === 'pending');
    const withDisc = completed.filter((item) => item.summary);

    const uniqueCandidates = new Set(
      normalizedAssessments.map((item) => item.candidateEmail || item.candidateName).filter(Boolean)
    );

    const distributionAccumulator = withDisc.reduce(
      (acc, item) => {
        FACTORS.forEach((factor) => {
          acc[factor] += toNumber(item?.summary?.[factor]);
        });
        return acc;
      },
      { D: 0, I: 0, S: 0, C: 0 }
    );

    const distribution = FACTORS.reduce((acc, factor) => {
      acc[factor] = withDisc.length
        ? Number((distributionAccumulator[factor] / withDisc.length).toFixed(1))
        : 0;
      return acc;
    }, {});

    const dominantCounts = withDisc.reduce(
      (acc, item) => {
        const factor = item?.dominantFactor;
        if (factor && FACTORS.includes(factor)) {
          acc[factor] += 1;
        }
        return acc;
      },
      { D: 0, I: 0, S: 0, C: 0 }
    );

    const predominantFactor = FACTORS
      .map((factor) => ({ factor, value: dominantCounts[factor] }))
      .sort((a, b) => b.value - a.value)[0]?.factor || '';

    const teamProfiles = [...withDisc]
      .sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date))
      .slice(0, 12)
      .map((item, index) => ({
        id: item.id || `${item.candidateName}-${item.date}-${index}`,
        name: item.candidateName,
        profileKey: item.profileKey || item.dominantFactor || 'DISC',
        dominantFactor: item.dominantFactor,
        date: item.date,
      }));

    const profileFrequencyMap = withDisc.reduce((acc, item) => {
      const profile = item.profileKey || item.dominantFactor || 'DISC';
      acc[profile] = (acc[profile] || 0) + 1;
      return acc;
    }, {});

    const profileFrequencies = Object.entries(profileFrequencyMap)
      .map(([profile, count]) => ({ profile, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const sortedActivity = [...normalizedAssessments]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      .slice(0, 8)
      .map((item) => ({
        id: item.id || `${item.candidateName}-${item.date}`,
        title: item.status === 'completed' ? 'Relatório gerado' : 'Avaliação em andamento',
        description: `${item.candidateName}${item.dominantFactor ? ` • Perfil ${item.dominantFactor}` : ''}`,
        date: formatDate(item.date),
      }));

    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const completedLast30 = completed.filter((item) => {
      const timestamp = new Date(item.date || 0).getTime();
      if (!Number.isFinite(timestamp) || timestamp <= 0) return false;
      return now - timestamp <= thirtyDays;
    }).length;

    const comparisonsRecent = Math.max(0, Math.min(12, Math.floor(withDisc.length / 2)));
    const teamsMonitored = withDisc.length ? Math.max(1, Math.ceil(uniqueCandidates.size / 8)) : 0;

    const insights = buildInsights(distribution, withDisc.length);
    const trends = buildTrendSeries(withDisc);
    const latestIndividualSummary =
      [...withDisc].sort((a, b) => parseDateForSort(b.date) - parseDateForSort(a.date))[0]?.summary || null;

    return {
      completed,
      pending,
      withDisc,
      uniqueCandidates,
      distribution,
      dominantCounts,
      predominantFactor,
      insights,
      teamProfiles,
      profileFrequencies,
      trends,
      latestIndividualSummary,
      activity: sortedActivity,
      reportsRecent: completed.slice(0, 6),
      completedLast30,
      comparisonsRecent,
      teamsMonitored,
      kpis: {
        totalAssessments: normalizedAssessments.length,
        completedAssessments: completed.length,
        pendingAssessments: pending.length,
        reportsGenerated: completed.length,
        profilesAnalyzed: withDisc.length,
        collaboratorsAssessed: uniqueCandidates.size,
      },
    };
  }, [normalizedAssessments]);

  const creditsBalance =
    toNumber(access?.creditsBalance) ||
    toNumber(user?.credits) ||
    toNumber(user?.credits_balance);

  return {
    apiBaseUrl,
    isLoading: assessmentsQuery.isLoading || dossierQuery.isLoading,
    isFetching: assessmentsQuery.isFetching || dossierQuery.isFetching,
    error: assessmentsQuery.error || dossierQuery.error || null,
    assessments: normalizedAssessments,
    dossier: {
      activeDossiers: toNumber(dossierQuery.data?.activeDossiers),
      scheduledThisMonth: toNumber(dossierQuery.data?.scheduledThisMonth),
    },
    creditsBalance,
    distribution: snapshot.distribution,
    predominantFactor: snapshot.predominantFactor,
    dominantCounts: snapshot.dominantCounts,
    insights: snapshot.insights,
    teamProfiles: snapshot.teamProfiles,
    profileFrequencies: snapshot.profileFrequencies,
    trends: snapshot.trends,
    latestIndividualSummary: snapshot.latestIndividualSummary,
    activity: snapshot.activity,
    reportsRecent: snapshot.reportsRecent,
    completedLast30: snapshot.completedLast30,
    comparisonsRecent: snapshot.comparisonsRecent,
    teamsMonitored: snapshot.teamsMonitored,
    kpis: snapshot.kpis,
  };
}

export const dashboardFactorLabels = FACTOR_LABELS;
