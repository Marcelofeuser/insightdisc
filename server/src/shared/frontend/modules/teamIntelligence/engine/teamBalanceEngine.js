import { DISC_FACTORS, DISC_FACTOR_LABELS, toNumber } from '../../analytics/constants.js';

function round1(value) {
  return Math.round(toNumber(value) * 10) / 10;
}

function unique(values = [], limit = 10) {
  return [...new Set((Array.isArray(values) ? values : []).filter(Boolean))].slice(0, limit);
}

function factorLabel(factor = '') {
  return DISC_FACTOR_LABELS[String(factor || '').toUpperCase()] || factor;
}

function buildFactorBuckets(distribution = {}) {
  const dominant = [];
  const low = [];

  DISC_FACTORS.forEach((factor) => {
    const value = toNumber(distribution?.[factor]);
    if (value >= 30) dominant.push({ factor, value });
    if (value <= 18) low.push({ factor, value });
  });

  return { dominant, low };
}

function buildDimensionHighlights(dimensions = []) {
  const list = Array.isArray(dimensions) ? dimensions : [];
  const strongest = [...list].sort((a, b) => toNumber(b?.score) - toNumber(a?.score))[0];
  const weakest = [...list].sort((a, b) => toNumber(a?.score) - toNumber(b?.score))[0];

  return {
    strongest: strongest
      ? { key: strongest.key, label: strongest.label, score: round1(strongest.score), status: strongest.status }
      : null,
    weakest: weakest
      ? { key: weakest.key, label: weakest.label, score: round1(weakest.score), status: weakest.status }
      : null,
  };
}

function buildRecommendedProfiles({ dominant = [], low = [] } = {}) {
  const recommendations = [];
  const dominantSet = new Set(dominant.map((item) => item.factor));
  const lowSet = new Set(low.map((item) => item.factor));

  if (lowSet.has('S')) recommendations.push({ profileCode: 'SC', rationale: 'Aumenta estabilidade e sustentação de execução no time.' });
  if (lowSet.has('I')) recommendations.push({ profileCode: 'IS', rationale: 'Eleva influência, comunicação relacional e adesão em mudanças.' });
  if (lowSet.has('C')) recommendations.push({ profileCode: 'CD', rationale: 'Reforça qualidade, método e governança de entrega.' });
  if (lowSet.has('D')) recommendations.push({ profileCode: 'DI', rationale: 'Amplia direção, decisão e tração para resultado.' });

  if (dominantSet.has('D') && lowSet.has('S')) {
    recommendations.push({ profileCode: 'SC', rationale: 'Contrabalanceia urgência com estabilidade operacional e consistência de rotina.' });
  }
  if (dominantSet.has('I') && lowSet.has('C')) {
    recommendations.push({ profileCode: 'CD', rationale: 'Compensa espontaneidade alta com rigor técnico e critério de qualidade.' });
  }

  return unique(
    recommendations.map((item) => `${item.profileCode}|${item.rationale}`),
    6,
  ).map((item) => {
    const [profileCode, rationale] = item.split('|');
    return { profileCode, rationale };
  });
}

export function buildTeamBalanceAnalysis({
  distribution = {},
  dimensions = [],
  profileFrequencies = [],
  balance = null,
  totalMembers = 0,
} = {}) {
  const buckets = buildFactorBuckets(distribution);
  const dimensionHighlights = buildDimensionHighlights(dimensions);
  const dominantLabels = buckets.dominant.map((item) => `${factorLabel(item.factor)} (${item.factor})`);
  const lowLabels = buckets.low.map((item) => `${factorLabel(item.factor)} (${item.factor})`);

  const teamRisks = [];
  const opportunities = [];
  const autoCompositionRecommendations = [];

  if (toNumber(distribution?.D) >= 32 && toNumber(distribution?.S) <= 18) {
    teamRisks.push('Muito alto em Dominância e baixo em Estabilidade pode elevar execução com aumento de conflito interno.');
    autoCompositionRecommendations.push('Adicionar perfis com eixo S/C para reduzir atrito e preservar continuidade.');
  }

  if (toNumber(distribution?.I) <= 15) {
    teamRisks.push('Baixa presença de Influência pode reduzir fluidez de comunicação relacional e adesão em mudanças.');
    opportunities.push('Incluir perfis com I mais alto em iniciativas de alinhamento, onboarding e mobilização.');
  }

  if (toNumber(distribution?.C) <= 18) {
    teamRisks.push('Baixa presença de Conformidade aumenta risco de variação de qualidade e padronização.');
    opportunities.push('Reforçar governança de qualidade com perfis C mais altos ou rituais de controle de entrega.');
  }

  if (balance?.level === 'concentrada') {
    teamRisks.push('Composição concentrada em poucos fatores comportamentais pode reduzir diversidade de decisão.');
  } else {
    opportunities.push('A distribuição atual favorece complementaridade, com potencial de alta performance quando papéis são bem distribuídos.');
  }

  const topProfile = Array.isArray(profileFrequencies) ? profileFrequencies[0] : null;
  if (topProfile?.count && totalMembers > 0) {
    const share = round1((toNumber(topProfile.count) / totalMembers) * 100);
    if (share >= 45) {
      teamRisks.push(`Alta repetição de ${topProfile.profile} (${share.toFixed(1)}% da amostra) pode reduzir repertório do time.`);
      autoCompositionRecommendations.push('Reforçar próximo ciclo de contratação com perfis complementares ao padrão dominante.');
    }
  }

  if (dimensionHighlights?.weakest?.status === 'vulneravel') {
    autoCompositionRecommendations.push(
      `Priorizar reforço da dimensão ${dimensionHighlights.weakest.label} para elevar resiliência da equipe.`,
    );
  }

  const recommendedProfiles = buildRecommendedProfiles(buckets);

  const executiveNote = `Equipe com ${totalMembers} perfis analisados. ` +
    (dominantLabels.length
      ? `Predomínio em ${dominantLabels.join(', ')}. `
      : 'Sem predomínio crítico por fator. ') +
    (lowLabels.length
      ? `Lacunas em ${lowLabels.join(', ')} pedem reforço de complementaridade.`
      : 'Cobertura comportamental sem lacunas críticas por fator.');

  return {
    dominantFactors: buckets.dominant,
    lowFactors: buckets.low,
    dominantLabels,
    lowLabels,
    dimensionHighlights,
    teamRisks: unique(teamRisks, 8),
    opportunities: unique(opportunities, 8),
    autoCompositionRecommendations: unique(autoCompositionRecommendations, 8),
    recommendedProfiles,
    executiveNote,
  };
}
