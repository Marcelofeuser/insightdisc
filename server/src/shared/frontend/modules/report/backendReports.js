const DISC_FACTORS = ['D', 'I', 'S', 'C'];

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeFactorMap(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const map = {};
  let hasAnyValue = false;

  for (const factor of DISC_FACTORS) {
    if (raw[factor] === undefined || raw[factor] === null || raw[factor] === '') {
      map[factor] = 0;
      continue;
    }

    const value = toFiniteNumber(raw[factor]);
    map[factor] = value;
    if (value > 0) hasAnyValue = true;
  }

  return hasAnyValue ? map : null;
}

function firstValidMap(candidates = []) {
  for (const candidate of candidates) {
    const normalized = normalizeFactorMap(candidate);
    if (normalized) return normalized;
  }
  return null;
}

function resolveTopFactors(summaryMap = {}, discProfile = {}) {
  const explicitDominant = String(
    discProfile?.dominant || discProfile?.primary || ''
  ).trim().toUpperCase();

  const explicitSecondary = String(
    discProfile?.secondary || discProfile?.secondaryFactor || ''
  ).trim().toUpperCase();

  if (DISC_FACTORS.includes(explicitDominant) && DISC_FACTORS.includes(explicitSecondary)) {
    return {
      dominantFactor: explicitDominant,
      secondaryFactor: explicitSecondary,
    };
  }

  const ranked = DISC_FACTORS
    .map((factor) => ({ factor, value: toFiniteNumber(summaryMap?.[factor]) }))
    .sort((a, b) => b.value - a.value);

  return {
    dominantFactor: ranked[0]?.factor || 'D',
    secondaryFactor: ranked[1]?.factor || 'I',
  };
}

export function normalizeDiscSnapshot(discProfile = {}) {
  const summary = firstValidMap([
    discProfile?.normalized,
    discProfile?.summary,
    discProfile?.charts?.summary,
    discProfile?.scores?.summary,
    discProfile?.scores,
    discProfile?.natural,
    discProfile?.charts?.natural,
    discProfile?.scores?.natural,
  ]);

  const natural = firstValidMap([
    discProfile?.normalized,
    discProfile?.natural,
    discProfile?.charts?.natural,
    discProfile?.scores?.natural,
    summary,
  ]);

  const adapted = firstValidMap([
    discProfile?.adapted,
    discProfile?.charts?.adapted,
    discProfile?.scores?.adapted,
    summary,
    natural,
  ]);

  const stableSummary = summary || natural || adapted;
  if (!stableSummary) return null;

  const { dominantFactor, secondaryFactor } = resolveTopFactors(stableSummary, discProfile);

  return {
    natural: natural || stableSummary,
    adapted: adapted || stableSummary,
    summary: stableSummary,
    dominantFactor,
    secondaryFactor,
  };
}

export function mapCandidateReportItem(item = {}, index = 0) {
  const assessmentId = String(item?.assessmentId || '').trim();
  const reportId = String(item?.reportId || '').trim();
  const candidateEmail = String(item?.candidateEmail || '').trim();
  const candidateUserId = String(
    item?.candidateUserId || item?.candidate_user_id || item?.candidateId || '',
  ).trim();
  const discProfile = item?.discProfile && typeof item.discProfile === 'object'
    ? item.discProfile
    : null;

  const normalizedDisc = discProfile ? normalizeDiscSnapshot(discProfile) : null;

  const mapped = {
    id: assessmentId || reportId || `${candidateEmail || 'report'}-${index}`,
    assessmentId: assessmentId || '',
    reportId: reportId || '',
    completed_at: item?.completedAt || item?.createdAt || null,
    created_date: item?.createdAt || null,
    respondent_name: item?.candidateName || '',
    candidate_name: item?.candidateName || '',
    lead_name: item?.candidateName || '',
    lead_email: candidateEmail || '',
    user_email: candidateEmail || '',
    status: 'completed',
    type: 'premium',
    pdf_url: item?.pdfUrl || '',
    disc_profile: discProfile,
    candidateUserId,
    candidate_user_id: candidateUserId,
  };

  if (normalizedDisc) {
    mapped.results = {
      natural_profile: normalizedDisc.natural,
      adapted_profile: normalizedDisc.adapted,
      summary_profile: normalizedDisc.summary,
      dominant_factor: normalizedDisc.dominantFactor,
      secondary_factor: normalizedDisc.secondaryFactor,
    };

    mapped.disc_results = {
      natural: normalizedDisc.natural,
      adapted: normalizedDisc.adapted,
      summary: normalizedDisc.summary,
      dominant_factor: normalizedDisc.dominantFactor,
      secondary_factor: normalizedDisc.secondaryFactor,
    };
  }

  return mapped;
}

export function mapCandidateReports(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map((item, index) => mapCandidateReportItem(item, index));
}

export function findCandidateReportByIdentifier(reports = [], identifier = '') {
  const target = String(identifier || '').trim();
  if (!target) return null;

  return (
    reports.find((report) => {
      const keys = [report?.assessmentId, report?.id, report?.reportId]
        .map((value) => String(value || '').trim())
        .filter(Boolean);
      return keys.includes(target);
    }) || null
  );
}
