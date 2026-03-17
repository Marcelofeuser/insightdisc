import { DISC_FACTORS, DISC_FACTOR_LABELS } from '../analytics/constants.js';
import {
  buildDiscInterpretation,
  getProfileArchetype,
  resolveFactorLabel,
} from '../discEngine/index.js';
import { buildLeadershipInsights } from '../leadershipInsights/index.js';
import {
  buildScoreBalanceNote,
  resolveAssessmentDiscSnapshot,
  resolveAssessmentIdentity,
} from '../assessmentResult/assessmentResultData.js';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value) {
  return Math.round(toNumber(value) * 10) / 10;
}

function getIntensity(score) {
  const value = round1(score);
  if (value >= 67) return { key: 'high', label: 'Alta' };
  if (value >= 40) return { key: 'mid', label: 'Moderada' };
  return { key: 'low', label: 'Baixa' };
}

function resolveFactorImpact(factor, interpretation = {}) {
  if (factor === 'D') {
    return interpretation?.decisionMaking || interpretation?.leadershipStyle || 'Impacto em tomada de decisão e direção de execução.';
  }
  if (factor === 'I') {
    return interpretation?.communicationStyle || interpretation?.relationshipStyle || 'Impacto em comunicação, influência e adesão relacional.';
  }
  if (factor === 'S') {
    return interpretation?.relationshipStyle || interpretation?.workStyle || 'Impacto em colaboração, ritmo estável e continuidade operacional.';
  }
  return interpretation?.workStyle || interpretation?.decisionMaking || 'Impacto em método, qualidade e consistência técnica.';
}

function resolveFactorReading({
  factor,
  intensity,
  isPrimary,
  isSecondary,
}) {
  if (isPrimary) {
    return `${resolveFactorLabel(factor)} atua como eixo primário da leitura atual, com maior influência nas decisões e no ritmo comportamental.`;
  }

  if (isSecondary) {
    return `${resolveFactorLabel(factor)} aparece como apoio estratégico do perfil e amplia o repertório em contextos de adaptação.`;
  }

  if (intensity.key === 'high') {
    return `${resolveFactorLabel(factor)} está em nível alto e tende a surgir com frequência em demandas de execução e relacionamento.`;
  }

  if (intensity.key === 'mid') {
    return `${resolveFactorLabel(factor)} está em nível moderado, contribuindo de forma situacional conforme contexto e prioridade.`;
  }

  return `${resolveFactorLabel(factor)} aparece com menor intensidade relativa, funcionando como fator de apoio pontual.`;
}

function dedupe(values = [], limit = 6) {
  const seen = new Set();
  const items = [];
  values.forEach((value) => {
    const text = String(value || '').trim();
    if (!text || seen.has(text)) return;
    seen.add(text);
    items.push(text);
  });
  return items.slice(0, limit);
}

export function buildAssessmentReportViewModel(assessment = {}, options = {}) {
  const identity = resolveAssessmentIdentity(assessment, options.assessmentId);
  const premiumModel = assessment?.report?.discProfile || null;

  if (premiumModel && typeof premiumModel === 'object' && premiumModel.interpretation) {
    const premiumDiscSnapshot =
      premiumModel.discSnapshot ||
      resolveAssessmentDiscSnapshot(assessment);

    const premiumInterpretation = premiumModel.interpretation || {};
    const premiumLeadershipInsights =
      premiumModel.leadershipInsights ||
      buildLeadershipInsights(premiumDiscSnapshot?.summary || {}, {
        context: 'assessment_report_leadership',
        detailLevel: 'long',
      });

    const premiumArchetype =
      premiumModel.archetype ||
      getProfileArchetype(premiumInterpretation?.profileCode || 'DISC');

    const premiumExecutiveSummary = Array.isArray(premiumModel.executiveSummary)
      ? premiumModel.executiveSummary
      : [
          {
            key: 'act',
            title: 'Como tende a agir',
            value: premiumInterpretation?.summaryShort,
          },
          {
            key: 'interact',
            title: 'Como tende a interagir',
            value: premiumInterpretation?.communicationStyle,
          },
          {
            key: 'decide',
            title: 'Como tende a decidir',
            value: premiumInterpretation?.decisionMaking,
          },
          {
            key: 'perform',
            title: 'Como tende a performar melhor',
            value: premiumInterpretation?.idealEnvironment,
          },
        ];

    const premiumFactorAnalysis = Array.isArray(premiumModel.factorAnalysis)
      ? premiumModel.factorAnalysis
      : DISC_FACTORS.map((factor) => {
          const score = round1(premiumDiscSnapshot?.summary?.[factor]);
          const intensity = getIntensity(score);
          const isPrimary = premiumInterpretation?.primaryFactor === factor;
          const isSecondary = premiumInterpretation?.secondaryFactor === factor;

          return {
            factor,
            label: DISC_FACTOR_LABELS[factor],
            score,
            intensity,
            isPrimary,
            isSecondary,
            semanticReading: resolveFactorReading({
              factor,
              intensity,
              isPrimary,
              isSecondary,
            }),
            impact: resolveFactorImpact(factor, premiumInterpretation),
          };
        });

    const premiumTechnical = premiumModel.technical || {
      profileCode: premiumInterpretation?.profileCode || 'DISC',
      primaryFactor: premiumInterpretation?.primaryFactor || '-',
      secondaryFactor: premiumInterpretation?.secondaryFactor || '-',
      styleLabel: premiumInterpretation?.styleLabel || 'DISC em consolidação',
      topGap: round1(premiumInterpretation?.scoreSummary?.topGap),
      isPure: Boolean(premiumInterpretation?.scoreSummary?.isPure),
      hasValidInput: Boolean(premiumInterpretation?.scoreSummary?.hasValidInput),
      balanceNote: buildScoreBalanceNote(premiumInterpretation?.scoreSummary || {}),
      ranking: premiumInterpretation?.scoreSummary?.ranking || [],
      normalizedScores:
        premiumInterpretation?.scoreSummary?.normalized || premiumDiscSnapshot?.summary || {},
    };

    const premiumStrengths = dedupe(
      premiumModel.strengths || premiumInterpretation?.strengths || [],
      8,
    );
    const premiumAttentionPoints = dedupe(
      premiumModel.attentionPoints || premiumInterpretation?.attentionPoints || [],
      8,
    );
    const premiumPotentialChallenges = dedupe(
      premiumModel.potentialChallenges || premiumInterpretation?.potentialChallenges || [],
      8,
    );
    const premiumDevelopmentRecommendations = dedupe(
      premiumModel.developmentRecommendations || premiumInterpretation?.developmentRecommendations || [],
      8,
    );

    const premiumNextSteps = (Array.isArray(premiumModel.nextSteps) && premiumModel.nextSteps.length
      ? premiumModel.nextSteps
      : premiumDevelopmentRecommendations.slice(0, 3).map((item, index) => ({
          id: `next-step-${index + 1}`,
          title: `Próximo passo ${index + 1}`,
          description: item,
        })));

    return {
      ...premiumModel,
      identity,
      discSnapshot: premiumDiscSnapshot,
      interpretation: premiumInterpretation,
      archetype: premiumArchetype,
      executiveSummary: premiumExecutiveSummary,
      factorAnalysis: premiumFactorAnalysis,
      technical: premiumTechnical,
      leadershipInsights: premiumLeadershipInsights,
      strengths: premiumStrengths,
      attentionPoints: premiumAttentionPoints,
      potentialChallenges: premiumPotentialChallenges,
      developmentRecommendations: premiumDevelopmentRecommendations,
      nextSteps: premiumNextSteps,
    };
  }

  const discSnapshot = resolveAssessmentDiscSnapshot(assessment);
  const interpretation = buildDiscInterpretation(discSnapshot?.summary || {}, {
    context: 'assessment_report_page',
    detailLevel: 'long',
  });
  const leadershipInsights = buildLeadershipInsights(discSnapshot?.summary || {}, {
    context: 'assessment_report_leadership',
    detailLevel: 'long',
  });
  const archetype = getProfileArchetype(interpretation?.profileCode || 'DISC');

  const factorAnalysis = DISC_FACTORS.map((factor) => {
    const score = round1(discSnapshot?.summary?.[factor]);
    const intensity = getIntensity(score);
    const isPrimary = interpretation?.primaryFactor === factor;
    const isSecondary = interpretation?.secondaryFactor === factor;

    return {
      factor,
      label: DISC_FACTOR_LABELS[factor],
      score,
      intensity,
      isPrimary,
      isSecondary,
      semanticReading: resolveFactorReading({
        factor,
        intensity,
        isPrimary,
        isSecondary,
      }),
      impact: resolveFactorImpact(factor, interpretation),
    };
  });

  const executiveSummary = [
    {
      key: 'act',
      title: 'Como tende a agir',
      value: interpretation?.summaryShort,
    },
    {
      key: 'interact',
      title: 'Como tende a interagir',
      value: interpretation?.communicationStyle,
    },
    {
      key: 'decide',
      title: 'Como tende a decidir',
      value: interpretation?.decisionMaking,
    },
    {
      key: 'perform',
      title: 'Como tende a performar melhor',
      value: interpretation?.idealEnvironment,
    },
  ];

  const technical = {
    profileCode: interpretation?.profileCode || 'DISC',
    primaryFactor: interpretation?.primaryFactor || '-',
    secondaryFactor: interpretation?.secondaryFactor || '-',
    styleLabel: interpretation?.styleLabel || 'DISC em consolidação',
    topGap: round1(interpretation?.scoreSummary?.topGap),
    isPure: Boolean(interpretation?.scoreSummary?.isPure),
    hasValidInput: Boolean(interpretation?.scoreSummary?.hasValidInput),
    balanceNote: buildScoreBalanceNote(interpretation?.scoreSummary || {}),
    ranking: interpretation?.scoreSummary?.ranking || [],
    normalizedScores: interpretation?.scoreSummary?.normalized || discSnapshot?.summary || {},
  };

  const strengths = dedupe(interpretation?.strengths || [], 8);
  const attentionPoints = dedupe(interpretation?.attentionPoints || [], 8);
  const potentialChallenges = dedupe(interpretation?.potentialChallenges || [], 8);
  const developmentRecommendations = dedupe(interpretation?.developmentRecommendations || [], 8);

  const nextSteps = developmentRecommendations.slice(0, 3).map((item, index) => ({
    id: `next-step-${index + 1}`,
    title: `Próximo passo ${index + 1}`,
    description: item,
  }));

  return {
    identity,
    discSnapshot,
    interpretation,
    archetype,
    executiveSummary,
    factorAnalysis,
    technical,
    leadershipInsights,
    strengths,
    attentionPoints,
    potentialChallenges,
    developmentRecommendations,
    nextSteps,
  };
}
