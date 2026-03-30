const FACTORS = ['D', 'I', 'S', 'C'];

function toText(value) {
  return String(value || '').trim();
}

function toUpper(value) {
  return toText(value).toUpperCase();
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toList(value, max = 8) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => toText(item)).filter(Boolean))].slice(0, max);
}

function normalizeFactorMap(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;

  const candidate = FACTORS.reduce((acc, factor) => {
    acc[factor] = Math.max(0, toNumber(raw?.[factor]));
    return acc;
  }, {});

  const total = FACTORS.reduce((sum, factor) => sum + candidate[factor], 0);
  if (total <= 0) return null;

  const normalized = {
    D: Math.round((candidate.D / total) * 100),
    I: Math.round((candidate.I / total) * 100),
    S: Math.round((candidate.S / total) * 100),
    C: 0,
  };
  normalized.C = Math.max(0, 100 - normalized.D - normalized.I - normalized.S);
  return normalized;
}

function firstMap(candidates = []) {
  for (const candidate of candidates) {
    const map = normalizeFactorMap(candidate);
    if (map) return map;
  }
  return null;
}

function resolveRankedFactors(scores = null) {
  if (!scores) return [];

  return FACTORS
    .map((factor) => ({ factor, value: toNumber(scores?.[factor]) }))
    .sort((left, right) => right.value - left.value);
}

function resolveDominantFactor({ report = {}, discProfile = {}, scores = null, rankedFactors = [] } = {}) {
  const explicit = [
    report?.dominantFactor,
    report?.results?.dominant_factor,
    report?.disc_results?.dominant_factor,
    discProfile?.dominant,
    discProfile?.primary,
  ]
    .map((value) => toUpper(value))
    .find((value) => FACTORS.includes(value));

  if (explicit) return explicit;
  if (!scores) return 'D';

  return rankedFactors?.[0]?.factor || 'D';
}

function resolveSecondaryFactor({
  report = {},
  discProfile = {},
  scores = null,
  rankedFactors = [],
  dominantFactor = 'D',
} = {}) {
  const explicit = [
    report?.secondaryFactor,
    report?.results?.secondary_factor,
    report?.disc_results?.secondary_factor,
    discProfile?.secondary,
    discProfile?.secondaryFactor,
  ]
    .map((value) => toUpper(value))
    .find((value) => FACTORS.includes(value) && value !== dominantFactor);

  if (explicit) return explicit;
  if (!scores) return 'I';

  const fallback = rankedFactors?.find((entry) => entry.factor !== dominantFactor)?.factor;
  return fallback || 'I';
}

export function resolveDiscMode(reportType = '') {
  const key = toText(reportType).toLowerCase();
  if (key === 'personal') return 'personal';
  if (key === 'professional') return 'professional';
  return 'business';
}

export function formatReportTypeLabel(reportType = '') {
  const key = resolveDiscMode(reportType);
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function buildCoachReportContext(report = {}) {
  const discProfile = report?.discProfile || report?.disc_profile || {};
  const aiContent = discProfile?.ai || report?.ai || {};
  const scores = firstMap([
    report?.results?.summary_profile,
    report?.disc_results?.summary,
    report?.disc_results?.natural,
    discProfile?.summary,
    discProfile?.charts?.summary,
    discProfile?.scores?.summary,
    discProfile?.natural,
    discProfile?.charts?.natural,
    discProfile?.scores?.natural,
  ]) || { D: 34, I: 32, S: 23, C: 11 };

  const rankedFactors = resolveRankedFactors(scores);
  const dominantFactor = resolveDominantFactor({ report, discProfile, scores, rankedFactors });
  const secondaryFactor = resolveSecondaryFactor({
    report,
    discProfile,
    scores,
    rankedFactors,
    dominantFactor,
  });
  const profileCode = toUpper(
    report?.profileCode ||
      report?.profileKey ||
      discProfile?.code ||
      discProfile?.profileCode ||
      `${dominantFactor}/${secondaryFactor}`,
  );

  const summary = toText(
    report?.summary ||
      discProfile?.summaryText ||
      aiContent?.summary ||
      aiContent?.executiveSummary ||
      discProfile?.executiveSummary ||
      '',
  );

  const strengths = toList(report?.strengths || discProfile?.strengths || aiContent?.strengths);
  const limitations = toList(report?.limitations || discProfile?.limitations || aiContent?.limitations);
  const riskProfile = toText(
    report?.riskProfile ||
      discProfile?.riskProfile ||
      aiContent?.riskProfile ||
      aiContent?.pressureBehavior ||
      '',
  );
  const riskSignals = toList(
    report?.riskSignals ||
      discProfile?.riskSignals ||
      aiContent?.riskSignals ||
      (riskProfile ? [riskProfile] : []),
  );
  const developmentRecommendations = toList(
    report?.developmentRecommendations ||
      discProfile?.developmentRecommendations ||
      aiContent?.developmentRecommendations,
  );

  return {
    reportId: toText(report?.reportId),
    assessmentId: toText(report?.assessmentId || report?.id),
    reportType: resolveDiscMode(report?.type || report?.reportType || report?.report_type),
    respondentName: toText(
      report?.respondentName ||
        report?.respondent_name ||
        report?.candidateName ||
        report?.candidate_name ||
        report?.lead_name ||
        'Participante',
    ),
    candidateEmail: toText(
      report?.candidateEmail || report?.candidate_email || report?.lead_email || report?.user_email || '',
    ),
    completedAt: report?.completedAt || report?.completed_at || report?.createdAt || report?.created_date || null,
    profileCode,
    dominantFactor,
    secondaryFactor,
    summary,
    strengths,
    limitations,
    riskProfile,
    riskSignals,
    developmentRecommendations,
    scores,
    discProfile,
  };
}

export function normalizeCoachReportItem(report = {}, index = 0) {
  const context = buildCoachReportContext(report);
  const assessmentId = context.assessmentId || `report-${index}`;

  return {
    id: assessmentId,
    assessmentId,
    reportId: context.reportId,
    respondentName: context.respondentName,
    candidateEmail: context.candidateEmail,
    completedAt: context.completedAt,
    reportType: context.reportType,
    profileCode: context.profileCode,
    dominantFactor: context.dominantFactor,
    secondaryFactor: context.secondaryFactor,
    summary: context.summary,
    strengths: context.strengths,
    limitations: context.limitations,
    riskProfile: context.riskProfile,
    riskSignals: context.riskSignals,
    developmentRecommendations: context.developmentRecommendations,
    scores: context.scores,
    discProfile: context.discProfile,
  };
}
