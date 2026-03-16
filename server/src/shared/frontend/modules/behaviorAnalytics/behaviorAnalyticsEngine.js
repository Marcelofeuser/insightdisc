import { FACTORS, FACTOR_LABELS, GLOBAL_DISC_BENCHMARK } from './constants.js';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round2(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function normalizeScores(raw = {}) {
  const base = FACTORS.reduce((acc, factor) => {
    acc[factor] = Math.max(0, toNumber(raw?.[factor], 0));
    return acc;
  }, {});

  const total = FACTORS.reduce((sum, factor) => sum + base[factor], 0);
  if (total <= 0) return { D: 25, I: 25, S: 25, C: 25 };

  return FACTORS.reduce((acc, factor) => {
    acc[factor] = round2((base[factor] / total) * 100);
    return acc;
  }, {});
}

function averageDistribution(members = []) {
  const safeMembers = Array.isArray(members) ? members : [];
  if (!safeMembers.length) return { D: 25, I: 25, S: 25, C: 25 };

  const totals = { D: 0, I: 0, S: 0, C: 0 };
  safeMembers.forEach((member) => {
    const normalized = normalizeScores(member?.scores || member?.disc || {});
    FACTORS.forEach((factor) => {
      totals[factor] += normalized[factor];
    });
  });

  return FACTORS.reduce((acc, factor) => {
    acc[factor] = round2(totals[factor] / safeMembers.length);
    return acc;
  }, {});
}

function resolveDimensionScore(distribution = {}, weights = {}) {
  const total = FACTORS.reduce((sum, factor) => {
    return sum + toNumber(distribution?.[factor]) * toNumber(weights?.[factor]);
  }, 0);
  return round2(total);
}

function resolveStrengthLevel(value = 0) {
  const score = toNumber(value, 0);
  if (score >= 70) return 'forte';
  if (score >= 50) return 'equilibrada';
  return 'vulneravel';
}

export function buildOrganizationalDimensions(distribution = {}) {
  const dimensions = [
    {
      key: 'leadership',
      label: 'Liderança',
      score: resolveDimensionScore(distribution, { D: 0.45, I: 0.2, S: 0.1, C: 0.25 }),
    },
    {
      key: 'execution',
      label: 'Execução',
      score: resolveDimensionScore(distribution, { D: 0.5, I: 0.1, S: 0.15, C: 0.25 }),
    },
    {
      key: 'stability',
      label: 'Estabilidade',
      score: resolveDimensionScore(distribution, { D: 0.1, I: 0.1, S: 0.6, C: 0.2 }),
    },
    {
      key: 'influence',
      label: 'Influência',
      score: resolveDimensionScore(distribution, { D: 0.2, I: 0.6, S: 0.1, C: 0.1 }),
    },
    {
      key: 'quality',
      label: 'Qualidade',
      score: resolveDimensionScore(distribution, { D: 0.1, I: 0.1, S: 0.25, C: 0.55 }),
    },
  ];

  return dimensions.map((item) => ({
    ...item,
    level: resolveStrengthLevel(item.score),
  }));
}

export function buildBenchmarkComparison(distribution = {}, benchmark = GLOBAL_DISC_BENCHMARK) {
  const normalizedDistribution = normalizeScores(distribution);
  const normalizedBenchmark = normalizeScores(benchmark);

  const factors = FACTORS.map((factor) => {
    const company = toNumber(normalizedDistribution[factor], 0);
    const base = toNumber(normalizedBenchmark[factor], 0);
    const delta = round2(company - base);
    return {
      factor,
      label: FACTOR_LABELS[factor],
      company,
      benchmark: base,
      delta,
      trend: delta > 0 ? 'above' : delta < 0 ? 'below' : 'aligned',
    };
  });

  const highlights = [];
  factors.forEach((item) => {
    if (Math.abs(item.delta) < 7) return;
    if (item.trend === 'above') {
      highlights.push(`${item.label} acima do benchmark global em ${item.delta.toFixed(1)} pontos.`);
    } else if (item.trend === 'below') {
      highlights.push(`${item.label} abaixo do benchmark global em ${Math.abs(item.delta).toFixed(1)} pontos.`);
    }
  });

  if (!highlights.length) {
    highlights.push('Distribuição geral próxima ao benchmark DISC global.');
  }

  return {
    benchmark: normalizedBenchmark,
    company: normalizedDistribution,
    factors,
    highlights,
  };
}

export function buildBehaviorHistory(timeline = []) {
  const rows = (Array.isArray(timeline) ? timeline : [])
    .map((item, index) => {
      const scores = normalizeScores(item?.scores || item?.disc || {});
      const sorted = [...FACTORS].sort((a, b) => toNumber(scores[b]) - toNumber(scores[a]));
      return {
        id: item?.id || `history-${index + 1}`,
        date: item?.date || item?.completedAt || item?.createdAt || '',
        profileCode: String(item?.profileCode || `${sorted[0]}${sorted[1]}`).toUpperCase(),
        scores,
      };
    })
    .sort((left, right) => new Date(left.date).getTime() - new Date(right.date).getTime());

  const transitions = [];
  for (let index = 1; index < rows.length; index += 1) {
    const previous = rows[index - 1];
    const current = rows[index];
    if (previous.profileCode !== current.profileCode) {
      transitions.push({
        from: previous.profileCode,
        to: current.profileCode,
        date: current.date,
      });
    }
  }

  const summary = rows.length <= 1
    ? 'Sem histórico suficiente para identificar evolução comportamental.'
    : transitions.length
      ? `Foram identificadas ${transitions.length} transições relevantes de perfil ao longo do tempo.`
      : 'Perfil comportamental consistente nas medições disponíveis.';

  return {
    items: rows,
    transitions,
    summary,
  };
}

export function buildBehaviorAnalytics({
  members = [],
  benchmark = GLOBAL_DISC_BENCHMARK,
  history = [],
} = {}) {
  const distribution = averageDistribution(members);
  const dimensions = buildOrganizationalDimensions(distribution);
  const benchmarkComparison = buildBenchmarkComparison(distribution, benchmark);
  const evolution = buildBehaviorHistory(history);

  const primaryFactor = [...FACTORS].sort(
    (left, right) => toNumber(distribution[right]) - toNumber(distribution[left]),
  )[0];

  const executiveSummary = `Base analisada com ${members.length || 0} perfis. ` +
    `Predominância em ${FACTOR_LABELS[primaryFactor] || primaryFactor}, com foco em leitura de equilíbrio para liderança, execução e colaboração.`;

  return {
    sampleSize: members.length || 0,
    distribution,
    dimensions,
    benchmarkComparison,
    evolution,
    executiveSummary,
  };
}
