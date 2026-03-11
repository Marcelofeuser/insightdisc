import {
  buildDiscInterpretation,
  DISC_FACTORS,
  FACTOR_LABELS,
  normalizeDiscScores,
} from '../discEngine/index.js';

const COMPATIBILITY_LEVEL = Object.freeze({
  VERY_HIGH: 'Muito alta',
  HIGH: 'Alta',
  MODERATE: 'Moderada',
  ATTENTION: 'Atencao',
});

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function round1(value) {
  return Math.round(toNumber(value) * 10) / 10;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, toNumber(value)));
}

function safeText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function resolveLevel(score = 0) {
  if (score >= 82) return COMPATIBILITY_LEVEL.VERY_HIGH;
  if (score >= 68) return COMPATIBILITY_LEVEL.HIGH;
  if (score >= 52) return COMPATIBILITY_LEVEL.MODERATE;
  return COMPATIBILITY_LEVEL.ATTENTION;
}

export function normalizeComparableProfile(input = {}, options = {}) {
  const sourceScores = input?.scores || input?.disc || input;
  const normalizedScores = normalizeDiscScores(sourceScores);
  const interpretation = buildDiscInterpretation(normalizedScores.normalized, {
    context: options?.context || 'comparison_profile',
    detailLevel: options?.detailLevel || 'medium',
  });

  return {
    id: safeText(input?.id || input?.assessmentId || input?.reportId, options?.fallbackId || ''),
    assessmentId: safeText(input?.assessmentId || input?.id || input?.reportId),
    name: safeText(input?.name || input?.candidateName || input?.respondent_name, 'Perfil'),
    email: safeText(input?.email || input?.candidateEmail || input?.lead_email),
    createdAt: input?.createdAt || input?.created_at || input?.completedAt || input?.completed_at || '',
    hasValidScores: Boolean(normalizedScores.hasValidInput),
    scores: normalizedScores.normalized,
    rawScores: normalizedScores.raw,
    interpretation,
    primaryFactor: interpretation?.primaryFactor || '',
    secondaryFactor: interpretation?.secondaryFactor || '',
    profileCode: interpretation?.profileCode || 'DISC',
    styleLabel: interpretation?.styleLabel || 'Perfil DISC em consolidacao',
    summaryShort: interpretation?.summaryShort || 'Leitura comportamental em consolidacao.',
  };
}

function getTopFactorGap(scoreDifferences = {}) {
  const ranked = DISC_FACTORS
    .map((factor) => ({
      factor,
      absDelta: toNumber(scoreDifferences?.[factor]?.absDelta),
    }))
    .sort((a, b) => b.absDelta - a.absDelta);

  return ranked[0] || { factor: 'D', absDelta: 0 };
}

function getClosestFactor(scoreDifferences = {}) {
  const ranked = DISC_FACTORS
    .map((factor) => ({
      factor,
      absDelta: toNumber(scoreDifferences?.[factor]?.absDelta),
    }))
    .sort((a, b) => a.absDelta - b.absDelta);

  return ranked[0] || { factor: 'I', absDelta: 0 };
}

function factorGapSentence(factor = '', absDelta = 0) {
  const label = FACTOR_LABELS[factor] || factor;
  return `${label} (${factor}) apresenta gap de ${round1(absDelta).toFixed(1)} pontos.`;
}

export function buildScoreDifferences(profileA = {}, profileB = {}) {
  const differences = DISC_FACTORS.reduce((accumulator, factor) => {
    const aValue = toNumber(profileA?.scores?.[factor]);
    const bValue = toNumber(profileB?.scores?.[factor]);
    const delta = round1(aValue - bValue);
    accumulator[factor] = {
      factor,
      left: aValue,
      right: bValue,
      delta,
      absDelta: Math.abs(delta),
    };
    return accumulator;
  }, {});

  const totalAbsDelta = round1(
    DISC_FACTORS.reduce((sum, factor) => sum + toNumber(differences?.[factor]?.absDelta), 0)
  );
  const meanAbsDelta = round1(totalAbsDelta / DISC_FACTORS.length);
  const strongestGap = getTopFactorGap(differences);
  const closestFactor = getClosestFactor(differences);

  return {
    ...differences,
    totalAbsDelta,
    meanAbsDelta,
    strongestGapFactor: strongestGap.factor,
    strongestGapValue: round1(strongestGap.absDelta),
    closestFactor: closestFactor.factor,
    closestGapValue: round1(closestFactor.absDelta),
  };
}

function calculateCompatibilityScore(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const primaryMatch = profileA?.primaryFactor && profileA?.primaryFactor === profileB?.primaryFactor;
  const secondaryMatch = profileA?.secondaryFactor && profileA?.secondaryFactor === profileB?.secondaryFactor;
  const strongGap = toNumber(scoreDifferences?.strongestGapValue);
  const meanGap = toNumber(scoreDifferences?.meanAbsDelta);

  let score = 100 - meanGap;

  if (primaryMatch) score += 6;
  if (secondaryMatch) score += 3;
  if (strongGap <= 12) score += 5;
  if (strongGap >= 30) score -= 5;
  if (meanGap >= 24) score -= 6;

  return clamp(round1(score), 28, 97);
}

function hasHigh(scores = {}, factor = '', threshold = 35) {
  return toNumber(scores?.[factor]) >= threshold;
}

function hasLow(scores = {}, factor = '', threshold = 20) {
  return toNumber(scores?.[factor]) <= threshold;
}

export function getSynergyPoints(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const points = [];
  const diff = scoreDifferences || {};

  if (profileA?.primaryFactor && profileA?.primaryFactor === profileB?.primaryFactor) {
    points.push(`Ambos compartilham foco primario em ${FACTOR_LABELS[profileA.primaryFactor]}, facilitando alinhamento inicial.`);
  }

  if (toNumber(diff?.I?.absDelta) <= 12) {
    points.push('Nivel semelhante de Influencia favorece entendimento de linguagem e ritmo de interacao.');
  }

  if (toNumber(diff?.S?.absDelta) <= 12) {
    points.push('Proximidade em Estabilidade sustenta consistencia de rotina e previsibilidade de colaboracao.');
  }

  if (
    (hasHigh(profileA?.scores, 'D') && hasHigh(profileB?.scores, 'C')) ||
    (hasHigh(profileB?.scores, 'D') && hasHigh(profileA?.scores, 'C'))
  ) {
    points.push('Combinacao de tracao e criterio: um perfil acelera a decisao enquanto o outro protege a qualidade.');
  }

  if (
    (hasHigh(profileA?.scores, 'I') && hasHigh(profileB?.scores, 'S')) ||
    (hasHigh(profileB?.scores, 'I') && hasHigh(profileA?.scores, 'S'))
  ) {
    points.push('Engajamento social com estabilidade relacional aumenta aderencia em ciclos de trabalho mais longos.');
  }

  if (toNumber(diff?.meanAbsDelta) <= 14) {
    points.push('Distancia media reduzida entre fatores indica base comparativa com boa sincronia comportamental.');
  }

  if (!points.length) {
    points.push('Ha complementaridade potencial quando papeis, prazos e criterios de entrega sao combinados explicitamente.');
  }

  return Array.from(new Set(points)).slice(0, 6);
}

export function getTensionPoints(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const points = [];
  const diff = scoreDifferences || {};

  if (toNumber(diff?.D?.absDelta) >= 24) {
    points.push('Diferenca em Dominancia pode gerar atrito entre urgencia de decisao e tolerancia ao ritmo do outro.');
  }

  if (toNumber(diff?.I?.absDelta) >= 24) {
    points.push('Gap em Influencia sugere estilos de comunicacao distintos entre expansao e objetividade.');
  }

  if (toNumber(diff?.S?.absDelta) >= 24) {
    points.push('Contraste em Estabilidade tende a tensionar mudancas, prioridades e cadencia de execucao.');
  }

  if (toNumber(diff?.C?.absDelta) >= 24) {
    points.push('Diferenca em Conformidade pode elevar conflito entre detalhamento tecnico e velocidade pragmatica.');
  }

  if (hasHigh(profileA?.scores, 'D') && hasHigh(profileB?.scores, 'D')) {
    points.push('Dois perfis com D elevado podem competir por controle em contextos de alta pressao.');
  }

  if (
    (hasHigh(profileA?.scores, 'D') && hasHigh(profileB?.scores, 'S')) ||
    (hasHigh(profileB?.scores, 'D') && hasHigh(profileA?.scores, 'S'))
  ) {
    points.push('Tensao classica entre aceleracao (D) e necessidade de estabilidade (S).');
  }

  if (
    (hasHigh(profileA?.scores, 'I') && hasHigh(profileB?.scores, 'C')) ||
    (hasHigh(profileB?.scores, 'I') && hasHigh(profileA?.scores, 'C'))
  ) {
    points.push('Atrito potencial entre espontaneidade relacional (I) e formalidade analitica (C).');
  }

  if (toNumber(diff?.totalAbsDelta) >= 92) {
    points.push('Contraste global elevado entre fatores pede acordos operacionais claros para evitar ruido constante.');
  }

  if (!points.length) {
    points.push('Nao ha tensoes estruturais criticas; o foco deve ser manter alinhamento continuo de expectativas.');
  }

  return Array.from(new Set(points)).slice(0, 7);
}

export function getCommunicationDynamics(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const iGap = toNumber(scoreDifferences?.I?.absDelta);
  const cGap = toNumber(scoreDifferences?.C?.absDelta);
  const bothIHigh = hasHigh(profileA?.scores, 'I') && hasHigh(profileB?.scores, 'I');
  const oneIHighOneCHigh =
    (hasHigh(profileA?.scores, 'I') && hasHigh(profileB?.scores, 'C')) ||
    (hasHigh(profileB?.scores, 'I') && hasHigh(profileA?.scores, 'C'));

  if (bothIHigh && iGap <= 12) {
    return 'Comunicacao com alta fluidez social, tendencia a troca rapida e boa abertura para dialogo espontaneo.';
  }

  if (oneIHighOneCHigh && (iGap >= 18 || cGap >= 18)) {
    return 'A relacao alterna entre espontaneidade e formalidade. Vale definir formato de comunicacao (resumo executivo + detalhamento tecnico).';
  }

  if (iGap >= 24) {
    return 'Ha diferenca relevante de expressividade. Uma pessoa tende a verbalizar mais, enquanto a outra pode preferir mensagens objetivas e curtas.';
  }

  return 'Comunicacao potencialmente funcional quando canais, nivel de detalhe e frequencia de alinhamento sao definidos no inicio.';
}

export function getDecisionDynamics(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const dGap = toNumber(scoreDifferences?.D?.absDelta);
  const cGap = toNumber(scoreDifferences?.C?.absDelta);

  if (dGap <= 12 && cGap <= 12) {
    return 'Tomada de decisao com boa convergencia entre velocidade e criterio.';
  }

  if (dGap >= 22 && cGap >= 22) {
    return 'Dinamica decisoria pode oscilar entre impulso por acao e necessidade de validacao tecnica antes de seguir.';
  }

  if (dGap >= 24) {
    return 'Diferenca de assertividade tende a gerar assimetria de ritmo em decisoes. Definir autoridade por tema reduz conflito.';
  }

  if (cGap >= 24) {
    return 'Um perfil tende a exigir mais evidencias e padrao tecnico que o outro. Formalizar criterio minimo evita retrabalho.';
  }

  return 'Decisao tende a funcionar com checkpoints curtos de alinhamento entre prioridade, risco e qualidade.';
}

export function getCollaborationDynamics(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const sGap = toNumber(scoreDifferences?.S?.absDelta);
  const iGap = toNumber(scoreDifferences?.I?.absDelta);
  const bothSHigh = hasHigh(profileA?.scores, 'S') && hasHigh(profileB?.scores, 'S');

  if (bothSHigh && sGap <= 12) {
    return 'Colaboracao com alta confiabilidade, boa escuta e tendencia a acordos sustentaveis.';
  }

  if (sGap >= 24) {
    return 'Ritmos de colaboracao distintos: um perfil tende a proteger estabilidade enquanto o outro acelera transicoes.';
  }

  if (iGap >= 24) {
    return 'A colaboracao melhora quando expectativas de interacao sao explicitas (cadencia de reunioes, registro e follow-up).';
  }

  return 'Colaboracao com bom potencial de complementaridade quando papeis e entregas sao bem distribuidos.';
}

function getLeadershipDynamics(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const dGap = toNumber(scoreDifferences?.D?.absDelta);
  const iGap = toNumber(scoreDifferences?.I?.absDelta);
  const bothDHigh = hasHigh(profileA?.scores, 'D') && hasHigh(profileB?.scores, 'D');

  if (bothDHigh) {
    return 'Lideranca compartilhada pode gerar choque por protagonismo. Definir fronteira de decisao por contexto e essencial.';
  }

  if (dGap >= 24 || iGap >= 24) {
    return 'Estilos de influencia diferentes pedem combinacao explicita entre quem direciona, quem mobiliza e como validar acordos.';
  }

  return 'Dinamica de lideranca tende a ser complementar, com boa distribuicao entre direcao, relacionamento e sustentacao operacional.';
}

function getWorkRhythmDynamics(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const dGap = toNumber(scoreDifferences?.D?.absDelta);
  const sGap = toNumber(scoreDifferences?.S?.absDelta);

  if (dGap >= 24 && sGap >= 24) {
    return 'Ritmo de trabalho em polos diferentes: acelerar demais pode quebrar adesao; estabilizar demais pode travar entrega.';
  }

  if (dGap <= 12 && sGap <= 12) {
    return 'Ritmo de execucao com boa convergencia entre velocidade e constancia.';
  }

  return 'Ritmo comparativo intermediario: acordar prazos por tipo de entrega aumenta previsibilidade.';
}

function getQualityDynamics(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const cGap = toNumber(scoreDifferences?.C?.absDelta);

  if (cGap >= 24) {
    return 'Expectativas de qualidade e detalhamento diferem de forma relevante. Definir padrao minimo por entrega reduz atrito.';
  }

  if (cGap <= 12) {
    return 'Boa sintonia de organizacao e criterio tecnico nas entregas.';
  }

  return 'Nivel de qualidade pode ser equilibrado com checklists curtos e criterios de aceite claros.';
}

function getPressureDynamics(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const dGap = toNumber(scoreDifferences?.D?.absDelta);
  const cGap = toNumber(scoreDifferences?.C?.absDelta);
  const sGap = toNumber(scoreDifferences?.S?.absDelta);

  if (dGap >= 22 && sGap >= 22) {
    return 'Sob pressao, o contraste entre urgencia e estabilidade tende a aparecer com mais intensidade.';
  }

  if (cGap >= 24) {
    return 'Em cenarios criticos, a diferenca de rigor analitico pode afetar velocidade de resposta e alinhamento do time.';
  }

  return 'Resposta sob pressao com potencial de equilibrio quando prioridades, papeis e janela de decisao estao definidos previamente.';
}

export function getConflictRisks(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const risks = [];
  const tensionPoints = getTensionPoints(profileA, profileB, scoreDifferences);

  if (tensionPoints.length) {
    tensionPoints.slice(0, 4).forEach((point) => {
      risks.push(point);
    });
  }

  if (hasLow(profileA?.scores, 'I') && hasHigh(profileB?.scores, 'I')) {
    risks.push('Assimetria de exposicao social pode gerar percepcao de pouca abertura de um lado e excesso de informalidade do outro.');
  }

  if (hasLow(profileA?.scores, 'C') && hasHigh(profileB?.scores, 'C')) {
    risks.push('Diferenca de detalhamento tecnico pode aumentar retrabalho se o criterio de aceite nao estiver explicito.');
  }

  return Array.from(new Set(risks)).slice(0, 6);
}

export function getCollaborationRecommendations(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const recommendations = [];
  const strongestGapFactor = safeText(scoreDifferences?.strongestGapFactor, '');
  const strongestGapLabel = FACTOR_LABELS[strongestGapFactor] || strongestGapFactor;

  recommendations.push('Definir acordos de trabalho com clareza: objetivo, dono, prazo, criterio de aceite e ritual de acompanhamento.');

  if (toNumber(scoreDifferences?.D?.absDelta) >= 20) {
    recommendations.push('Criar checkpoints curtos para balancear velocidade de decisao com aderencia do time.');
  }

  if (toNumber(scoreDifferences?.I?.absDelta) >= 20) {
    recommendations.push('Combinar formato de comunicacao (sincrono para alinhamento rapido, assicrono para registro objetivo).');
  }

  if (toNumber(scoreDifferences?.S?.absDelta) >= 20) {
    recommendations.push('Planejar mudancas em etapas para reduzir resistencia e manter continuidade operacional.');
  }

  if (toNumber(scoreDifferences?.C?.absDelta) >= 20) {
    recommendations.push('Estabelecer padrao minimo de qualidade antes de iniciar execucao para reduzir divergencias de detalhe.');
  }

  if (strongestGapFactor) {
    recommendations.push(
      `Monitorar de perto o fator com maior diferenca (${strongestGapLabel}) usando feedback quinzenal orientado a comportamento observavel.`
    );
  }

  recommendations.push('Distribuir responsabilidades explorando complementaridade: quem traciona, quem estrutura, quem conecta e quem estabiliza.');

  return Array.from(new Set(recommendations)).slice(0, 8);
}

function getFactorHighlights(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const highlights = [];
  const strongestGapFactor = safeText(scoreDifferences?.strongestGapFactor, '');
  const closestFactor = safeText(scoreDifferences?.closestFactor, '');

  if (strongestGapFactor) {
    highlights.push(`Maior diferenca: ${factorGapSentence(strongestGapFactor, scoreDifferences?.strongestGapValue)}`);
  }

  if (closestFactor) {
    const label = FACTOR_LABELS[closestFactor] || closestFactor;
    highlights.push(
      `Maior convergencia em ${label} (${closestFactor}), com diferenca de ${round1(scoreDifferences?.closestGapValue).toFixed(1)} pontos.`
    );
  }

  if (profileA?.primaryFactor && profileB?.primaryFactor) {
    highlights.push(
      `Fatores primarios: ${profileA.primaryFactor} (${FACTOR_LABELS[profileA.primaryFactor]}) vs ${profileB.primaryFactor} (${FACTOR_LABELS[profileB.primaryFactor]}).`
    );
  }

  return highlights;
}

function getTechnicalNotes(profileA = {}, profileB = {}, scoreDifferences = {}, compatibilityScore = 0) {
  return [
    `Indice de compatibilidade comparativa: ${round1(compatibilityScore).toFixed(1)}%.`,
    `Distancia media entre fatores: ${round1(scoreDifferences?.meanAbsDelta).toFixed(1)} pontos.`,
    `Soma das diferencas absolutas D/I/S/C: ${round1(scoreDifferences?.totalAbsDelta).toFixed(1)}.`,
    `Perfil A: ${profileA.profileCode} (${profileA.styleLabel}).`,
    `Perfil B: ${profileB.profileCode} (${profileB.styleLabel}).`,
  ];
}

export function getCompatibilitySummary(profileA = {}, profileB = {}, scoreDifferences = {}, compatibilityScore = 0) {
  const level = resolveLevel(compatibilityScore);
  const strongestGapFactor = safeText(scoreDifferences?.strongestGapFactor, '');
  const strongestGapLabel = FACTOR_LABELS[strongestGapFactor] || strongestGapFactor;
  const profileALabel = safeText(profileA?.styleLabel, 'Perfil A');
  const profileBLabel = safeText(profileB?.styleLabel, 'Perfil B');

  const summaryShort = `Comparacao entre ${profileALabel} e ${profileBLabel} com compatibilidade ${round1(compatibilityScore).toFixed(1)}% (${level}).`;

  const summaryMedium = strongestGapFactor
    ? `${summaryShort} O principal ponto de calibragem esta em ${strongestGapLabel}, onde a diferenca de intensidade pode alterar comunicacao, ritmo e decisao.`
    : `${summaryShort} A leitura comparativa indica necessidade de acordos praticos de comunicacao e execucao para potencializar sinergia.`;

  return {
    summaryShort,
    summaryMedium,
    compatibilityLevel: level,
  };
}

export function compareDiscProfiles(rawProfileA = {}, rawProfileB = {}, options = {}) {
  const profileA = normalizeComparableProfile(rawProfileA, {
    fallbackId: options?.fallbackLeftId || 'profile-a',
    context: 'comparison_left',
    detailLevel: options?.detailLevel || 'medium',
  });
  const profileB = normalizeComparableProfile(rawProfileB, {
    fallbackId: options?.fallbackRightId || 'profile-b',
    context: 'comparison_right',
    detailLevel: options?.detailLevel || 'medium',
  });

  const scoreDifferences = buildScoreDifferences(profileA, profileB);
  const compatibilityScore = calculateCompatibilityScore(profileA, profileB, scoreDifferences);
  const summary = getCompatibilitySummary(profileA, profileB, scoreDifferences, compatibilityScore);

  const synergyPoints = getSynergyPoints(profileA, profileB, scoreDifferences);
  const tensionPoints = getTensionPoints(profileA, profileB, scoreDifferences);
  const communicationDynamics = getCommunicationDynamics(profileA, profileB, scoreDifferences);
  const decisionDynamics = getDecisionDynamics(profileA, profileB, scoreDifferences);
  const collaborationDynamics = getCollaborationDynamics(profileA, profileB, scoreDifferences);
  const leadershipDynamics = getLeadershipDynamics(profileA, profileB, scoreDifferences);
  const workRhythmDynamics = getWorkRhythmDynamics(profileA, profileB, scoreDifferences);
  const qualityDynamics = getQualityDynamics(profileA, profileB, scoreDifferences);
  const pressureDynamics = getPressureDynamics(profileA, profileB, scoreDifferences);
  const conflictRisks = getConflictRisks(profileA, profileB, scoreDifferences);
  const practicalRecommendations = getCollaborationRecommendations(profileA, profileB, scoreDifferences);
  const factorHighlights = getFactorHighlights(profileA, profileB, scoreDifferences);
  const technicalNotes = getTechnicalNotes(profileA, profileB, scoreDifferences, compatibilityScore);

  return {
    profileA,
    profileB,
    summaryShort: summary.summaryShort,
    summaryMedium: summary.summaryMedium,
    compatibilityScore,
    compatibilityLevel: summary.compatibilityLevel,
    synergyPoints,
    tensionPoints,
    communicationDynamics,
    decisionDynamics,
    collaborationDynamics,
    leadershipDynamics,
    workRhythmDynamics,
    qualityDynamics,
    pressureDynamics,
    conflictRisks,
    practicalRecommendations,
    scoreDifferences,
    factorHighlights,
    technicalNotes,
    generatedAt: new Date().toISOString(),
  };
}

