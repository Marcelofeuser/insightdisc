import { DISC_FACTORS, DISC_FACTOR_LABELS, toNumber } from '../../analytics/constants.js';
import { buildBehaviorInsights } from '../../analytics/insights.js';
import { buildDiscInterpretation } from '../../discEngine/index.js';
import { buildTeamBalanceAnalysis } from './teamBalanceEngine.js';

const DIMENSION_CONFIG = Object.freeze([
  {
    key: 'leadership',
    label: 'Liderança',
    weights: { D: 0.45, I: 0.25, S: 0.1, C: 0.2 },
    strongText: 'Equipe com potencial de liderança ativa e tomada de frente em contextos decisivos.',
    weakText: 'Liderança menos distribuída no grupo; vale fortalecer protagonismo e clareza de direção.',
  },
  {
    key: 'communication',
    label: 'Comunicação',
    weights: { D: 0.15, I: 0.5, S: 0.2, C: 0.15 },
    strongText: 'Boa capacidade de comunicação e alinhamento relacional entre áreas.',
    weakText: 'Comunicação com risco de baixa fluidez; pode haver ruído entre intenção e execução.',
  },
  {
    key: 'collaboration',
    label: 'Colaboração',
    weights: { D: 0.1, I: 0.25, S: 0.45, C: 0.2 },
    strongText: 'Colaboração consistente, com apoio mútuo e boa sustentação do trabalho em equipe.',
    weakText: 'Colaboração vulnerável em cenários de pressão; recomende rituais de alinhamento mais frequentes.',
  },
  {
    key: 'executionSpeed',
    label: 'Velocidade de execução',
    weights: { D: 0.5, I: 0.2, S: 0.1, C: 0.2 },
    strongText: 'Ritmo de execução elevado e boa resposta a urgências.',
    weakText: 'Velocidade de execução abaixo do ideal para ciclos de alta demanda.',
  },
  {
    key: 'stability',
    label: 'Estabilidade',
    weights: { D: 0.1, I: 0.1, S: 0.55, C: 0.25 },
    strongText: 'Base estável para operação contínua e sustentação de processos.',
    weakText: 'Estabilidade reduzida; mudanças simultâneas podem gerar ruído de execução.',
  },
  {
    key: 'quality',
    label: 'Qualidade e organização',
    weights: { D: 0.1, I: 0.1, S: 0.25, C: 0.55 },
    strongText: 'Bom nível de qualidade, detalhamento e aderência a padrão.',
    weakText: 'Qualidade e organização com baixa cobertura no grupo; risco de inconsistência operacional.',
  },
  {
    key: 'influence',
    label: 'Influência e persuasão',
    weights: { D: 0.2, I: 0.6, S: 0.1, C: 0.1 },
    strongText: 'Capacidade elevada de mobilização e influência interpessoal.',
    weakText: 'Influência relacional limitada no grupo; pode reduzir adesão em mudanças.',
  },
  {
    key: 'decisionMaking',
    label: 'Tomada de decisão',
    weights: { D: 0.4, I: 0.15, S: 0.1, C: 0.35 },
    strongText: 'Tomada de decisão robusta com boa combinação entre velocidade e critério.',
    weakText: 'Tomada de decisão vulnerável: pode oscilar entre lentidão e pouca consistência de critério.',
  },
]);

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, toNumber(value)));
}

function round2(value) {
  return Math.round(toNumber(value) * 100) / 100;
}

function unique(items = []) {
  return [...new Set((Array.isArray(items) ? items : []).filter(Boolean))];
}

function normalizeScoreMap(raw = {}) {
  const safe = DISC_FACTORS.reduce((acc, factor) => {
    acc[factor] = clamp(raw?.[factor]);
    return acc;
  }, {});

  const total = DISC_FACTORS.reduce((sum, factor) => sum + safe[factor], 0);
  if (total <= 0) return { D: 25, I: 25, S: 25, C: 25 };

  if (total >= 99 && total <= 101) return safe;

  let running = 0;
  const normalized = {};
  DISC_FACTORS.forEach((factor, index) => {
    if (index === DISC_FACTORS.length - 1) {
      normalized[factor] = round2(100 - running);
      return;
    }

    const value = round2((safe[factor] / total) * 100);
    normalized[factor] = value;
    running += value;
  });

  return normalized;
}

function factorRanking(scores = {}) {
  return [...DISC_FACTORS]
    .map((factor) => ({ factor, value: toNumber(scores?.[factor]) }))
    .sort((a, b) => b.value - a.value);
}

function resolveDimensionStatus(score) {
  const numeric = toNumber(score);
  if (numeric >= 70) return 'forte';
  if (numeric >= 45) return 'equilibrada';
  return 'vulneravel';
}

function evaluateDimensions(distribution = {}) {
  return DIMENSION_CONFIG.map((dimension) => {
    const score = round2(
      DISC_FACTORS.reduce((acc, factor) => acc + toNumber(distribution?.[factor]) * toNumber(dimension.weights?.[factor]), 0),
    );
    const status = resolveDimensionStatus(score);
    const narrative = status === 'forte' ? dimension.strongText : status === 'vulneravel' ? dimension.weakText : 'Dimensão em faixa equilibrada para a composição atual do grupo.';

    return {
      key: dimension.key,
      label: dimension.label,
      score,
      status,
      narrative,
    };
  });
}

function evaluateBalance(distribution = {}) {
  const ranking = factorRanking(distribution);
  const strongest = ranking[0] || { factor: 'D', value: 0 };
  const weakest = ranking[ranking.length - 1] || { factor: 'C', value: 0 };
  const spread = round2(strongest.value - weakest.value);
  const score = round2(Math.max(0, 100 - spread * 2.2));

  const level = score >= 75 ? 'equilibrada' : score >= 55 ? 'moderada' : 'concentrada';

  return {
    score,
    level,
    spread,
    strongestFactor: strongest.factor,
    strongestValue: strongest.value,
    weakestFactor: weakest.factor,
    weakestValue: weakest.value,
  };
}

function predominantNarrative(factor = '') {
  const normalized = String(factor || '').toUpperCase();
  if (normalized === 'D') return 'Predominância de Dominância indica equipe orientada a resultado, velocidade e direção clara.';
  if (normalized === 'I') return 'Predominância de Influência indica equipe mais comunicativa, persuasiva e mobilizadora.';
  if (normalized === 'S') return 'Predominância de Estabilidade indica equipe colaborativa, previsível e consistente na execução.';
  if (normalized === 'C') return 'Predominância de Conformidade indica equipe analítica, criteriosa e orientada à qualidade.';
  return 'Equipe com distribuição mista entre fatores DISC, favorecendo complementaridade comportamental.';
}

function buildDominanceDistribution(members = []) {
  const total = members.length;
  const counts = { D: 0, I: 0, S: 0, C: 0 };

  members.forEach((member) => {
    const factor = String(member?.dominantFactor || '').toUpperCase();
    if (counts[factor] !== undefined) {
      counts[factor] += 1;
    }
  });

  const percentages = DISC_FACTORS.reduce((acc, factor) => {
    acc[factor] = total ? round2((counts[factor] / total) * 100) : 0;
    return acc;
  }, {});

  return { counts, percentages };
}

function buildDistribution(members = []) {
  if (!members.length) return { D: 0, I: 0, S: 0, C: 0 };

  const totals = { D: 0, I: 0, S: 0, C: 0 };
  members.forEach((member) => {
    DISC_FACTORS.forEach((factor) => {
      totals[factor] += toNumber(member?.scores?.[factor]);
    });
  });

  return DISC_FACTORS.reduce((acc, factor) => {
    acc[factor] = round2(totals[factor] / members.length);
    return acc;
  }, {});
}

function buildProfileFrequencies(members = []) {
  const counts = new Map();
  members.forEach((member) => {
    const profile = String(member?.profileCode || 'DISC').toUpperCase();
    counts.set(profile, (counts.get(profile) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([profile, count]) => ({ profile, count }))
    .sort((a, b) => b.count - a.count);
}

function buildGapsAndOpportunities(distribution = {}, profileFrequencies = [], balance = null) {
  const underrepresentedFactors = DISC_FACTORS
    .filter((factor) => toNumber(distribution?.[factor]) < 18)
    .map((factor) => ({ factor, label: DISC_FACTOR_LABELS[factor], value: toNumber(distribution?.[factor]) }));

  const overrepresentedFactors = DISC_FACTORS
    .filter((factor) => toNumber(distribution?.[factor]) > 32)
    .map((factor) => ({ factor, label: DISC_FACTOR_LABELS[factor], value: toNumber(distribution?.[factor]) }));

  const risks = [];
  const opportunities = [];

  if (underrepresentedFactors.length) {
    risks.push(
      `Fatores com baixa representatividade (${underrepresentedFactors.map((item) => item.factor).join(', ')}) podem criar pontos cegos em decisões coletivas.`,
    );
    opportunities.push(
      `Reforçar perfis com ${underrepresentedFactors.map((item) => item.label).join(' e ')} pode elevar complementaridade do time.`,
    );
  }

  if (overrepresentedFactors.length) {
    risks.push(
      `Concentração em ${overrepresentedFactors.map((item) => item.label).join(' e ')} pode reduzir diversidade comportamental da equipe.`,
    );
    opportunities.push('Distribuir responsabilidades com perfis complementares reduz risco de visão única em temas críticos.');
  }

  const topProfile = profileFrequencies[0];
  if (topProfile?.count && profileFrequencies.length) {
    const topShare = (topProfile.count / profileFrequencies.reduce((sum, item) => sum + item.count, 0)) * 100;
    if (topShare >= 45) {
      risks.push(`Perfil ${topProfile.profile} aparece com alta repetição (${topShare.toFixed(1)}% da amostra), elevando risco de baixa complementaridade.`);
    }
  }

  if (balance?.level === 'concentrada') {
    risks.push('Distribuição geral concentrada: pode haver ganho de velocidade, mas com menor elasticidade para contextos diversos.');
  }

  if (!risks.length) {
    opportunities.push('Composição atual apresenta bom potencial de equilíbrio comportamental para decisões e execução integrada.');
  }

  return {
    underrepresentedFactors,
    overrepresentedFactors,
    risks: risks.slice(0, 5),
    opportunities: opportunities.slice(0, 5),
  };
}

function buildExecutiveSummary({ totalMembers, balance, predominantFactor }) {
  const base = `Equipe analisada com ${totalMembers} perfil${totalMembers === 1 ? '' : 'is'} válidos, predominância em ${predominantFactor || 'DISC'}.`;

  if (balance?.level === 'equilibrada') {
    return `${base} A distribuição está equilibrada e favorece complementaridade comportamental para operação e liderança.`;
  }

  if (balance?.level === 'moderada') {
    return `${base} Há concentração moderada em alguns fatores, com oportunidade de calibrar papéis para maior cobertura de repertório.`;
  }

  return `${base} A composição está concentrada, sugerindo reforço de estilos menos representados para reduzir riscos de decisão e colaboração.`;
}

export function normalizeTeamMembers(rawMembers = []) {
  return (Array.isArray(rawMembers) ? rawMembers : [])
    .map((member, index) => {
      const scores = normalizeScoreMap(member?.disc || member?.scores || {});
      const interpretation = buildDiscInterpretation(scores, {
        context: 'team_map_member',
        detailLevel: 'short',
      });

      const ranking = factorRanking(scores);
      const dominantFactor = String(member?.dominantFactor || interpretation?.primaryFactor || ranking[0]?.factor || 'D').toUpperCase();
      const secondaryFactor = String(member?.secondaryFactor || interpretation?.secondaryFactor || ranking[1]?.factor || 'I').toUpperCase();

      return {
        id: String(member?.assessmentId || member?.id || `member-${index + 1}`),
        assessmentId: String(member?.assessmentId || member?.id || `member-${index + 1}`),
        name: String(member?.candidateName || member?.name || 'Participante'),
        email: String(member?.candidateEmail || member?.email || ''),
        createdAt: member?.completedAt || member?.createdAt || member?.date || null,
        department: String(member?.department || '').trim(),
        role: String(member?.role || '').trim(),
        manager: String(member?.manager || '').trim(),
        city: String(member?.city || '').trim(),
        organizationId: String(member?.organizationId || '').trim(),
        dominantFactor,
        secondaryFactor,
        profileCode: String(member?.profileCode || interpretation?.profileCode || `${dominantFactor}${secondaryFactor}`)
          .trim()
          .toUpperCase(),
        styleLabel: interpretation?.styleLabel || '',
        summaryShort: interpretation?.summaryShort || '',
        scores,
      };
    })
    .filter((member) => member.assessmentId && DISC_FACTORS.some((factor) => toNumber(member?.scores?.[factor]) > 0));
}

export function buildLocalTeamMapFromAssessments(assessments = [], selectedIds = []) {
  const selectedSet = new Set((Array.isArray(selectedIds) ? selectedIds : []).map((item) => String(item || '').trim()));
  const normalizedMembers = normalizeTeamMembers(
    (Array.isArray(assessments) ? assessments : []).filter((item) => selectedSet.has(String(item?.assessmentId || item?.id || '').trim())),
  );

  const collectivePercentages = buildDistribution(normalizedMembers);
  const dominanceDistribution = buildDominanceDistribution(normalizedMembers);
  const ranking = factorRanking(collectivePercentages);
  const predominantFactor = ranking[0]?.factor || 'D';

  return {
    selectedCount: normalizedMembers.length,
    members: normalizedMembers.map((member) => ({
      assessmentId: member.assessmentId,
      candidateName: member.name,
      candidateEmail: member.email,
      createdAt: member.createdAt,
      completedAt: member.createdAt,
      dominantFactor: member.dominantFactor,
      secondaryFactor: member.secondaryFactor,
      profileCode: member.profileCode,
      department: member.department,
      role: member.role,
      manager: member.manager,
      city: member.city,
      organizationId: member.organizationId,
      disc: member.scores,
    })),
    collectivePercentages,
    dominanceDistribution,
    predominantFactor,
    predominantLabel: DISC_FACTOR_LABELS[predominantFactor] || predominantFactor,
    predominantNarrative: predominantNarrative(predominantFactor),
  };
}

export function buildTeamFilterOptions(assessments = []) {
  const rows = Array.isArray(assessments) ? assessments : [];

  const collect = (key) =>
    [...new Set(rows.map((item) => String(item?.[key] || '').trim()).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

  return {
    dominantFactors: [...new Set(rows.map((item) => String(item?.dominantFactor || '').trim().toUpperCase()).filter(Boolean))],
    departments: collect('department'),
    roles: collect('role'),
    managers: collect('manager'),
    cities: collect('city'),
    periods: [
      { value: 'all', label: 'Todo período' },
      { value: '30', label: 'Últimos 30 dias' },
      { value: '90', label: 'Últimos 90 dias' },
      { value: '180', label: 'Últimos 180 dias' },
      { value: '365', label: 'Últimos 12 meses' },
    ],
  };
}

export function applyTeamFilters(assessments = [], filters = {}) {
  const rows = Array.isArray(assessments) ? assessments : [];
  const now = Date.now();

  return rows.filter((item) => {
    const dominantFilter = String(filters?.dominantFactor || 'all').trim().toUpperCase();
    if (dominantFilter && dominantFilter !== 'ALL') {
      const factor = String(item?.dominantFactor || '').trim().toUpperCase();
      if (factor !== dominantFilter) return false;
    }

    const equalsOrAll = (filterValue, itemValue) => {
      const normalizedFilter = String(filterValue || 'all').trim();
      if (!normalizedFilter || normalizedFilter.toLowerCase() === 'all') return true;
      return String(itemValue || '').trim() === normalizedFilter;
    };

    if (!equalsOrAll(filters?.department, item?.department)) return false;
    if (!equalsOrAll(filters?.role, item?.role)) return false;
    if (!equalsOrAll(filters?.manager, item?.manager)) return false;
    if (!equalsOrAll(filters?.city, item?.city)) return false;

    const period = String(filters?.period || 'all').trim();
    if (period && period !== 'all') {
      const days = Number(period);
      if (Number.isFinite(days) && days > 0) {
        const dateValue = item?.completedAt || item?.createdAt;
        const parsed = new Date(dateValue || '').getTime();
        if (!Number.isFinite(parsed)) return false;
        const ageDays = (now - parsed) / (1000 * 60 * 60 * 24);
        if (ageDays > days) return false;
      }
    }

    return true;
  });
}

export function buildOrganizationalInsights({
  distribution = {},
  sampleSize = 0,
  profileFrequencies = [],
  balance = null,
  gaps = null,
}) {
  const insights = [...buildBehaviorInsights(distribution, sampleSize)];

  if (balance?.spread >= 18) {
    insights.push('Gap elevado entre fatores indica composição concentrada; recomenda-se reforçar complementaridade em projetos críticos.');
  }

  if (gaps?.underrepresentedFactors?.length) {
    insights.push(
      `Lacunas relevantes em ${gaps.underrepresentedFactors.map((item) => `${item.factor} (${item.label})`).join(', ')} podem impactar decisões e colaboração em contextos específicos.`,
    );
  }

  const topProfile = profileFrequencies[0];
  if (topProfile?.count && sampleSize > 0) {
    const share = (topProfile.count / sampleSize) * 100;
    if (share >= 45) {
      insights.push(`Alta repetição do perfil ${topProfile.profile} (${share.toFixed(1)}% da amostra) sugere risco de baixa diversidade de abordagem.`);
    }
  }

  if (toNumber(distribution?.D) >= 35 && toNumber(distribution?.S) <= 18) {
    insights.push('Equipe com forte eixo de execução e baixa estabilidade pode ter alta velocidade com risco de desgaste em ciclos longos.');
  }

  if (toNumber(distribution?.I) <= 15 && toNumber(distribution?.C) >= 30) {
    insights.push('Combinação de baixa Influência e alta Conformidade sugere comunicação mais reservada e foco elevado em precisão técnica.');
  }

  return unique(insights).slice(0, 8);
}

export function buildTeamIntelligence(teamMap = {}) {
  const members = normalizeTeamMembers(teamMap?.members || []);
  const totalMembers = members.length;

  const distribution = totalMembers
    ? buildDistribution(members)
    : normalizeScoreMap(teamMap?.collectivePercentages || {});

  const dominanceDistribution = totalMembers
    ? buildDominanceDistribution(members)
    : teamMap?.dominanceDistribution || { counts: { D: 0, I: 0, S: 0, C: 0 }, percentages: { D: 0, I: 0, S: 0, C: 0 } };

  const ranking = factorRanking(distribution);
  const predominantFactor = String(teamMap?.predominantFactor || ranking[0]?.factor || 'D').toUpperCase();
  const profileFrequencies = buildProfileFrequencies(members);
  const balance = evaluateBalance(distribution);
  const dimensions = evaluateDimensions(distribution);
  const gaps = buildGapsAndOpportunities(distribution, profileFrequencies, balance);
  const insights = buildOrganizationalInsights({
    distribution,
    sampleSize: totalMembers || Number(teamMap?.selectedCount || 0),
    profileFrequencies,
    balance,
    gaps,
  });
  const balanceIntelligence = buildTeamBalanceAnalysis({
    distribution,
    dimensions,
    profileFrequencies,
    balance,
    totalMembers,
  });

  return {
    totalMembers,
    members,
    distribution,
    dominanceDistribution,
    predominantFactor,
    predominantLabel: DISC_FACTOR_LABELS[predominantFactor] || predominantFactor,
    predominantNarrative: teamMap?.predominantNarrative || predominantNarrative(predominantFactor),
    profileFrequencies,
    balance,
    dimensions,
    gaps,
    insights,
    balanceIntelligence,
    executiveSummary: buildExecutiveSummary({
      totalMembers,
      balance,
      predominantFactor,
    }),
  };
}

export const TEAM_DIMENSIONS = DIMENSION_CONFIG;
