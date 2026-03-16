const DISC_FACTORS = ['D', 'I', 'S', 'C'];

const FACTOR_LABELS = Object.freeze({
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade',
});

const DOMINANT_PAIR_SCORE = Object.freeze({
  D: { D: 68, I: 84, S: 56, C: 76 },
  I: { D: 82, I: 74, S: 78, C: 66 },
  S: { D: 58, I: 76, S: 80, C: 86 },
  C: { D: 74, I: 64, S: 84, C: 78 },
});

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeDiscProfile(input = {}) {
  const raw = {};
  let total = 0;

  DISC_FACTORS.forEach((factor) => {
    const value = clamp(safeNumber(input?.[factor], 0), 0, 100);
    raw[factor] = value;
    total += value;
  });

  if (total <= 0) {
    return { D: 25, I: 25, S: 25, C: 25 };
  }

  const normalized = {};
  let roundedTotal = 0;

  DISC_FACTORS.forEach((factor, index) => {
    if (index === DISC_FACTORS.length - 1) {
      normalized[factor] = clamp(100 - roundedTotal, 0, 100);
      return;
    }
    const value = Math.round((raw[factor] / total) * 100);
    normalized[factor] = clamp(value, 0, 100);
    roundedTotal += normalized[factor];
  });

  return normalized;
}

export function getTopFactors(profile = {}, count = 2) {
  const normalized = normalizeDiscProfile(profile);
  return [...DISC_FACTORS]
    .sort((a, b) => normalized[b] - normalized[a])
    .slice(0, count);
}

export function getDominantFactor(profile = {}) {
  return getTopFactors(profile, 1)[0] || 'D';
}

export function getProfileCode(profile = {}) {
  const [first, second] = getTopFactors(profile, 2);
  return second ? `${first}${second}` : first || 'D';
}

function scoreByDistance(profileA = {}, profileB = {}) {
  const a = normalizeDiscProfile(profileA);
  const b = normalizeDiscProfile(profileB);
  const distance = DISC_FACTORS.reduce((acc, factor) => acc + Math.abs((a[factor] || 0) - (b[factor] || 0)), 0);
  const maxDistance = 400;
  return clamp(Math.round(100 - (distance / maxDistance) * 100), 0, 100);
}

function scoreByDominance(profileA = {}, profileB = {}) {
  const dominantA = getDominantFactor(profileA);
  const dominantB = getDominantFactor(profileB);
  return safeNumber(DOMINANT_PAIR_SCORE?.[dominantA]?.[dominantB], 65);
}

function scoreByTopOverlap(profileA = {}, profileB = {}) {
  const aTop = getTopFactors(profileA, 2);
  const bTop = getTopFactors(profileB, 2);
  const overlapCount = aTop.filter((factor) => bTop.includes(factor)).length;
  if (overlapCount >= 2) return 92;
  if (overlapCount === 1) return 76;
  return 60;
}

function compatibilityLevel(score) {
  if (score >= 85) return 'Muito alta';
  if (score >= 72) return 'Alta';
  if (score >= 58) return 'Moderada';
  return 'Baixa';
}

function buildHighlights({ dominantA, dominantB, overlapCount, relationLabel }) {
  const first = `Combinação dominante ${dominantA} (${FACTOR_LABELS[dominantA]}) com ${dominantB} (${FACTOR_LABELS[dominantB]}).`;
  const second =
    overlapCount >= 1
      ? 'Há convergência comportamental em pelo menos um fator principal, o que facilita alinhamento de ritmo e comunicação.'
      : 'Os fatores principais são distintos, trazendo complementaridade útil quando há alinhamento de expectativas.';
  const third = relationLabel
    ? `No contexto "${relationLabel}", a chave é combinar clareza de acordos com rituais curtos de alinhamento.`
    : 'A qualidade da relação tende a subir com acordos explícitos sobre forma de decisão, prazos e autonomia.';
  return [first, second, third];
}

function buildAttentionPoints({ dominantA, dominantB, distanceScore }) {
  const points = [];

  if (distanceScore < 55) {
    points.push('Diferença de ritmo e prioridade pode gerar ruído se não houver alinhamento de expectativa no início.');
  }

  if ((dominantA === 'D' && dominantB === 'S') || (dominantA === 'S' && dominantB === 'D')) {
    points.push('Perfil mais acelerado pode pressionar além do necessário; combine checkpoints claros para reduzir atrito.');
  }

  if ((dominantA === 'I' && dominantB === 'C') || (dominantA === 'C' && dominantB === 'I')) {
    points.push('Um lado tende a priorizar conexão e velocidade; o outro, critério e precisão. Defina padrão de qualidade antes da execução.');
  }

  if ((dominantA === 'D' && dominantB === 'D') || (dominantA === 'C' && dominantB === 'C')) {
    points.push('Perfis semelhantes podem elevar rigidez na decisão. Alternar liderança situacional ajuda a manter colaboração.');
  }

  if (points.length === 0) {
    points.push('Ajustes de comunicação e clareza de papéis são suficientes para manter colaboração estável.');
  }

  return points;
}

export function buildCompatibilityExplanation(result, relationLabel = '') {
  if (!result) return '';
  const relationPrefix = relationLabel ? `para ${relationLabel.toLowerCase()} ` : '';
  return `Compatibilidade ${result.score}% (${result.level}) ${relationPrefix}com base na proximidade dos fatores DISC, na dominância comportamental e no padrão de complementaridade entre perfis.`;
}

export function calculateProfileCompatibility(profileA = {}, profileB = {}, options = {}) {
  const normalizedA = normalizeDiscProfile(profileA);
  const normalizedB = normalizeDiscProfile(profileB);
  const dominantA = getDominantFactor(normalizedA);
  const dominantB = getDominantFactor(normalizedB);
  const topA = getTopFactors(normalizedA, 2);
  const topB = getTopFactors(normalizedB, 2);
  const overlapCount = topA.filter((factor) => topB.includes(factor)).length;

  const distanceScore = scoreByDistance(normalizedA, normalizedB);
  const dominanceScore = scoreByDominance(normalizedA, normalizedB);
  const overlapScore = scoreByTopOverlap(normalizedA, normalizedB);

  const score = clamp(Math.round(distanceScore * 0.52 + dominanceScore * 0.3 + overlapScore * 0.18), 35, 97);
  const level = compatibilityLevel(score);

  const highlights = buildHighlights({
    dominantA,
    dominantB,
    overlapCount,
    relationLabel: options?.relationLabel || '',
  });
  const attentionPoints = buildAttentionPoints({ dominantA, dominantB, distanceScore });

  return {
    score,
    level,
    dominantA,
    dominantB,
    profileCodeA: getProfileCode(normalizedA),
    profileCodeB: getProfileCode(normalizedB),
    normalizedA,
    normalizedB,
    highlights,
    attentionPoints,
    summary: buildCompatibilityExplanation(
      { score, level },
      options?.relationLabel || ''
    ),
  };
}

export function buildTeamDistribution(memberProfiles = []) {
  const counts = { D: 0, I: 0, S: 0, C: 0 };
  memberProfiles.forEach((profile) => {
    const dominant = getDominantFactor(profile);
    counts[dominant] += 1;
  });
  return counts;
}

export function buildTeamInsights(distribution = { D: 0, I: 0, S: 0, C: 0 }) {
  const total = DISC_FACTORS.reduce((acc, factor) => acc + safeNumber(distribution[factor], 0), 0);
  if (!total) {
    return ['Adicione avaliações válidas para gerar leitura de equilíbrio comportamental da equipe.'];
  }

  const sorted = [...DISC_FACTORS].sort((a, b) => distribution[b] - distribution[a]);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];
  const strongestPct = Math.round((distribution[strongest] / total) * 100);

  const insights = [
    `Predominância de ${FACTOR_LABELS[strongest]} (${strongest}) com ${strongestPct}% da equipe.`,
  ];

  if (strongestPct >= 50) {
    insights.push('Concentração alta em um único fator: importante equilibrar decisões com rituais de contraditório.');
  } else {
    insights.push('Distribuição relativamente equilibrada, favorecendo complementaridade de estilo na execução.');
  }

  if (distribution[weakest] === 0) {
    insights.push(`Não há perfis com dominância ${weakest} (${FACTOR_LABELS[weakest]}). Considere complementar esse eixo em novas contratações.`);
  } else {
    insights.push(`Menor incidência em ${weakest} (${FACTOR_LABELS[weakest]}): desenvolva esse eixo via delegação e desenvolvimento interno.`);
  }

  return insights;
}

export { DISC_FACTORS, FACTOR_LABELS };
