import {
  buildDiscInterpretation,
  DISC_FACTORS,
  FACTOR_LABELS,
  normalizeDiscScores,
} from '../discEngine/index.js';
import {
  getJobProfileByKey,
  listJobProfiles,
} from '../jobProfiles/jobProfilesLibrary.js';

export const COMPARISON_MODE = Object.freeze({
  PERSON_TO_PERSON: 'person_to_person',
  LEADER_TO_MEMBER: 'leader_to_member',
  CANDIDATE_TO_ROLE: 'candidate_to_role',
  MEMBER_TO_TEAM: 'member_to_team',
});

export const COMPARISON_MODE_META = Object.freeze({
  [COMPARISON_MODE.PERSON_TO_PERSON]: {
    label: 'Pessoa x pessoa',
    description: 'Comparacao direta entre dois perfis para colaboracao profissional.',
  },
  [COMPARISON_MODE.LEADER_TO_MEMBER]: {
    label: 'Lider x liderado',
    description: 'Leitura de alinhamento entre direcao, autonomia e acompanhamento.',
  },
  [COMPARISON_MODE.CANDIDATE_TO_ROLE]: {
    label: 'Candidato x cargo ideal',
    description: 'Comparacao entre perfil do candidato e referencia comportamental da funcao.',
  },
  [COMPARISON_MODE.MEMBER_TO_TEAM]: {
    label: 'Membro x equipe',
    description: 'Comparacao entre uma pessoa e o baseline comportamental medio da equipe.',
  },
});

const COMPATIBILITY_LEVEL = Object.freeze({
  HIGH: 'Alta',
  MODERATE: 'Moderada',
  LOW: 'Baixa',
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

function resolveMode(rawMode = '') {
  const mode = safeText(rawMode, COMPARISON_MODE.PERSON_TO_PERSON);
  if (Object.values(COMPARISON_MODE).includes(mode)) {
    return mode;
  }
  return COMPARISON_MODE.PERSON_TO_PERSON;
}

export function getComparisonModeMeta(rawMode = '') {
  const mode = resolveMode(rawMode);
  return {
    mode,
    ...(COMPARISON_MODE_META[mode] || COMPARISON_MODE_META[COMPARISON_MODE.PERSON_TO_PERSON]),
  };
}

export function listIdealRoleProfiles() {
  return listJobProfiles().map((item) => ({
    key: item.key,
    label: item.label,
    context: item.description,
    scores: { ...item.scores },
  }));
}

export function buildIdealRoleProfile(rawTemplateKey = '') {
  const templates = listJobProfiles();
  const templateKey = safeText(rawTemplateKey, templates[0]?.key);
  const template = getJobProfileByKey(templateKey) || templates[0];

  if (!template) return null;

  return normalizeComparableProfile(
    {
      id: `ideal-role-${template.key}`,
      assessmentId: `ideal-role-${template.key}`,
      name: `Cargo ideal: ${template.label}`,
      email: '',
      createdAt: '',
      scores: template.scores,
    },
    {
      context: 'comparison_role_ideal',
      detailLevel: 'short',
      fallbackId: `ideal-role-${template.key}`,
    },
  );
}

function resolveLevel(score = 0) {
  if (score >= 70) return COMPATIBILITY_LEVEL.HIGH;
  if (score >= 40) return COMPATIBILITY_LEVEL.MODERATE;
  return COMPATIBILITY_LEVEL.LOW;
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

export function buildTeamBenchmarkProfile(profiles = [], options = {}) {
  const excludedId = safeText(options?.excludedId || options?.excludeAssessmentId);
  const normalizedProfiles = (Array.isArray(profiles) ? profiles : [])
    .map((profile, index) =>
      normalizeComparableProfile(profile, {
        context: 'comparison_team_member',
        detailLevel: 'short',
        fallbackId: `team-member-${index + 1}`,
      }),
    )
    .filter((profile) => {
      if (!profile?.hasValidScores) return false;
      if (!excludedId) return true;
      const keys = [profile?.assessmentId, profile?.id]
        .map((item) => safeText(item))
        .filter(Boolean);
      return !keys.includes(excludedId);
    });

  if (!normalizedProfiles.length) {
    return null;
  }

  const averageScores = DISC_FACTORS.reduce((accumulator, factor) => {
    const sum = normalizedProfiles.reduce((running, profile) => running + toNumber(profile?.scores?.[factor]), 0);
    accumulator[factor] = round1(sum / normalizedProfiles.length);
    return accumulator;
  }, {});

  const benchmark = normalizeComparableProfile(
    {
      id: safeText(options?.benchmarkId, 'team-benchmark'),
      assessmentId: safeText(options?.benchmarkId, 'team-benchmark'),
      name: safeText(options?.benchmarkName, 'Equipe de referencia'),
      email: '',
      createdAt: '',
      scores: averageScores,
    },
    {
      context: 'comparison_team_baseline',
      detailLevel: 'short',
      fallbackId: safeText(options?.benchmarkId, 'team-benchmark'),
    },
  );

  return {
    profile: benchmark,
    memberCount: normalizedProfiles.length,
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

function calculateCompatibilityScore(profileA = {}, profileB = {}, scoreDifferences = {}, options = {}) {
  const primaryMatch = profileA?.primaryFactor && profileA?.primaryFactor === profileB?.primaryFactor;
  const secondaryMatch = profileA?.secondaryFactor && profileA?.secondaryFactor === profileB?.secondaryFactor;
  const strongGap = toNumber(scoreDifferences?.strongestGapValue);
  const meanGap = toNumber(scoreDifferences?.meanAbsDelta);
  const mode = resolveMode(options?.mode);

  let score = 100 - meanGap * 1.45;

  if (primaryMatch) score += 9;
  if (secondaryMatch) score += 4;
  if (strongGap <= 10) score += 7;
  if (strongGap >= 35) score -= 12;
  if (meanGap >= 28) score -= 10;

  const complementarityBonus =
    ((hasHigh(profileA?.scores, 'D') && hasHigh(profileB?.scores, 'C')) ||
      (hasHigh(profileB?.scores, 'D') && hasHigh(profileA?.scores, 'C'))
      ? 4
      : 0) +
    ((hasHigh(profileA?.scores, 'I') && hasHigh(profileB?.scores, 'S')) ||
      (hasHigh(profileB?.scores, 'I') && hasHigh(profileA?.scores, 'S'))
      ? 3
      : 0);
  score += complementarityBonus;

  if (hasHigh(profileA?.scores, 'D') && hasHigh(profileB?.scores, 'D')) {
    score -= 5;
  }

  if (mode === COMPARISON_MODE.CANDIDATE_TO_ROLE) {
    if (meanGap <= 14) score += 5;
    if (meanGap >= 24) score -= 4;
  }

  if (mode === COMPARISON_MODE.MEMBER_TO_TEAM) {
    if (toNumber(scoreDifferences?.closestGapValue) <= 8) score += 3;
  }

  return clamp(round1(score), 0, 100);
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

function getWorkStyleDynamics(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const sGap = toNumber(scoreDifferences?.S?.absDelta);
  const cGap = toNumber(scoreDifferences?.C?.absDelta);
  const dGap = toNumber(scoreDifferences?.D?.absDelta);

  if (sGap <= 12 && cGap <= 12) {
    return 'Estilo de trabalho com boa convergencia de processo, previsibilidade e padrao de acompanhamento.';
  }

  if (dGap >= 24 && sGap >= 24) {
    return 'Um perfil tende a operar por impulso de entrega e o outro por estabilizacao de processo. Vale distribuir blocos de execucao por perfil.';
  }

  if (cGap >= 24) {
    return 'Existe diferenca de organizacao e detalhamento tecnico. Use criterios de aceite claros para manter consistencia.';
  }

  return 'Estilo de trabalho complementar quando a governanca de tarefas e checkpoints estiver explicita.';
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

function getRiskToleranceDynamics(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const dGap = toNumber(scoreDifferences?.D?.absDelta);
  const cGap = toNumber(scoreDifferences?.C?.absDelta);
  const dAverage = round1((toNumber(profileA?.scores?.D) + toNumber(profileB?.scores?.D)) / 2);
  const cAverage = round1((toNumber(profileA?.scores?.C) + toNumber(profileB?.scores?.C)) / 2);

  if (dGap >= 24 || cGap >= 24) {
    return 'Tolerancia a risco em polos diferentes: uma parte tende a acelerar experimentacao e a outra a elevar controle e mitigacao.';
  }

  if (dAverage >= 35 && cAverage <= 18) {
    return 'Tolerancia a risco mais alta no par, com impulso para testar rapido e ajustar ao longo do caminho.';
  }

  if (cAverage >= 34 && dAverage <= 20) {
    return 'Tolerancia a risco mais conservadora, com preferencia por validacao previa antes de movimentos criticos.';
  }

  return 'Tolerancia a risco moderada: o par tende a decidir melhor quando combina experimentacao controlada com criterio claro.';
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

function buildModeSummaryAppendix(mode = COMPARISON_MODE.PERSON_TO_PERSON) {
  if (mode === COMPARISON_MODE.LEADER_TO_MEMBER) {
    return 'No contexto lider-liderado, acordos de autonomia, follow-up e feedback tendem a definir o sucesso da parceria.';
  }
  if (mode === COMPARISON_MODE.CANDIDATE_TO_ROLE) {
    return 'No contexto candidato-cargo, a leitura indica aderencia comportamental atual e pontos para onboarding direcionado.';
  }
  if (mode === COMPARISON_MODE.MEMBER_TO_TEAM) {
    return 'No contexto membro-equipe, a leitura mostra nivel de sintonia com o baseline coletivo e pontos de integracao.';
  }
  return 'No contexto pessoa-pessoa, a prioridade e transformar diferencas em acordos operacionais claros.';
}

function buildModeRecommendations(mode = COMPARISON_MODE.PERSON_TO_PERSON) {
  if (mode === COMPARISON_MODE.LEADER_TO_MEMBER) {
    return [
      'Formalize acordos de delegacao: decisao, autonomia e criterio de escalonamento.',
      'Estabeleca um ritual de 1:1 com foco em comportamento observavel e ajuste de rota curto.',
    ];
  }
  if (mode === COMPARISON_MODE.CANDIDATE_TO_ROLE) {
    return [
      'Defina um plano de onboarding com foco nos fatores mais distantes do perfil ideal da funcao.',
      'Acompanhe os primeiros 60 dias com metas comportamentais e checkpoints de adaptacao.',
    ];
  }
  if (mode === COMPARISON_MODE.MEMBER_TO_TEAM) {
    return [
      'Ajuste a distribuicao de responsabilidades para aproveitar o fator forte do membro em lacunas da equipe.',
      'Defina um padrinho interno para acelerar adaptacao ao ritmo e aos combinados do time.',
    ];
  }
  return [
    'Transforme os achados em dois combinados praticos de colaboracao com revisao em 30 dias.',
  ];
}

function getTechnicalNotes(
  profileA = {},
  profileB = {},
  scoreDifferences = {},
  compatibilityScore = 0,
  options = {},
) {
  const modeMeta = getComparisonModeMeta(options?.mode);
  return [
    `Indice de compatibilidade comparativa: ${round1(compatibilityScore).toFixed(1)}%.`,
    `Faixa de compatibilidade: ${resolveLevel(compatibilityScore)} (0-40 baixa, 40-70 moderada, 70-100 alta).`,
    `Distancia media entre fatores: ${round1(scoreDifferences?.meanAbsDelta).toFixed(1)} pontos.`,
    `Soma das diferencas absolutas D/I/S/C: ${round1(scoreDifferences?.totalAbsDelta).toFixed(1)}.`,
    `Contexto de comparacao: ${modeMeta.label}.`,
    `Perfil A: ${profileA.profileCode} (${profileA.styleLabel}).`,
    `Perfil B: ${profileB.profileCode} (${profileB.styleLabel}).`,
  ];
}

export function getCompatibilitySummary(
  profileA = {},
  profileB = {},
  scoreDifferences = {},
  compatibilityScore = 0,
  options = {},
) {
  const level = resolveLevel(compatibilityScore);
  const modeMeta = getComparisonModeMeta(options?.mode);
  const strongestGapFactor = safeText(scoreDifferences?.strongestGapFactor, '');
  const strongestGapLabel = FACTOR_LABELS[strongestGapFactor] || strongestGapFactor;
  const profileALabel = safeText(profileA?.styleLabel, 'Perfil A');
  const profileBLabel = safeText(profileB?.styleLabel, 'Perfil B');

  const summaryShort = `${modeMeta.label}: comparacao entre ${profileALabel} e ${profileBLabel} com compatibilidade ${round1(compatibilityScore).toFixed(1)}% (${level}).`;

  const summaryMedium = strongestGapFactor
    ? `${summaryShort} O principal ponto de calibragem esta em ${strongestGapLabel}, onde a diferenca de intensidade pode alterar comunicacao, ritmo e decisao. ${buildModeSummaryAppendix(modeMeta.mode)}`
    : `${summaryShort} A leitura comparativa indica necessidade de acordos praticos de comunicacao e execucao para potencializar sinergia. ${buildModeSummaryAppendix(modeMeta.mode)}`;

  return {
    summaryShort,
    summaryMedium,
    compatibilityLevel: level,
  };
}

function buildVisualizationModel(profileA = {}, profileB = {}, scoreDifferences = {}) {
  const radar = DISC_FACTORS.map((factor) => ({
    factor,
    label: FACTOR_LABELS[factor] || factor,
    left: round1(profileA?.scores?.[factor]),
    right: round1(profileB?.scores?.[factor]),
  }));

  const factorDifferences = DISC_FACTORS.map((factor) => {
    const item = scoreDifferences?.[factor] || {};
    const delta = round1(item?.delta);
    return {
      factor,
      label: FACTOR_LABELS[factor] || factor,
      delta,
      absDelta: round1(item?.absDelta),
      dominantSide: delta >= 0 ? 'A' : 'B',
      left: round1(item?.left),
      right: round1(item?.right),
    };
  });

  return {
    radar,
    factorDifferences,
  };
}

function buildComparativeReport({
  modeMeta,
  compatibilityScore,
  compatibilityLevel,
  summary,
  synergyPoints = [],
  tensionPoints = [],
  communicationDynamics = '',
  decisionDynamics = '',
  workRhythmDynamics = '',
  pressureDynamics = '',
  practicalRecommendations = [],
  conflictRisks = [],
  factorHighlights = [],
} = {}) {
  return {
    title: 'Relatorio comparativo DISC',
    mode: modeMeta?.mode || COMPARISON_MODE.PERSON_TO_PERSON,
    modeLabel: modeMeta?.label || COMPARISON_MODE_META[COMPARISON_MODE.PERSON_TO_PERSON].label,
    executiveSummary: summary?.summaryMedium || '',
    compatibility: {
      score: round1(compatibilityScore),
      level: compatibilityLevel || resolveLevel(compatibilityScore),
    },
    sections: {
      synergy: synergyPoints,
      tension: tensionPoints,
      communication: communicationDynamics,
      decisionMaking: decisionDynamics,
      executionRhythm: workRhythmDynamics,
      pressureAndConflict: pressureDynamics,
      practicalRecommendations,
      conflictRisks,
      factorHighlights,
    },
  };
}

export function compareDiscProfiles(rawProfileA = {}, rawProfileB = {}, options = {}) {
  const mode = resolveMode(options?.mode);
  const modeMeta = getComparisonModeMeta(mode);
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
  const compatibilityScore = calculateCompatibilityScore(profileA, profileB, scoreDifferences, { mode });
  const summary = getCompatibilitySummary(profileA, profileB, scoreDifferences, compatibilityScore, { mode });

  const synergyPoints = getSynergyPoints(profileA, profileB, scoreDifferences);
  const tensionPoints = getTensionPoints(profileA, profileB, scoreDifferences);
  const communicationDynamics = getCommunicationDynamics(profileA, profileB, scoreDifferences);
  const decisionDynamics = getDecisionDynamics(profileA, profileB, scoreDifferences);
  const collaborationDynamics = getCollaborationDynamics(profileA, profileB, scoreDifferences);
  const workStyleDynamics = getWorkStyleDynamics(profileA, profileB, scoreDifferences);
  const leadershipDynamics = getLeadershipDynamics(profileA, profileB, scoreDifferences);
  const workRhythmDynamics = getWorkRhythmDynamics(profileA, profileB, scoreDifferences);
  const qualityDynamics = getQualityDynamics(profileA, profileB, scoreDifferences);
  const riskToleranceDynamics = getRiskToleranceDynamics(profileA, profileB, scoreDifferences);
  const pressureDynamics = getPressureDynamics(profileA, profileB, scoreDifferences);
  const conflictRisks = getConflictRisks(profileA, profileB, scoreDifferences);
  const practicalRecommendations = [
    ...getCollaborationRecommendations(profileA, profileB, scoreDifferences),
    ...buildModeRecommendations(mode),
  ];
  const factorHighlights = getFactorHighlights(profileA, profileB, scoreDifferences);
  const technicalNotes = getTechnicalNotes(profileA, profileB, scoreDifferences, compatibilityScore, {
    mode,
  });
  const visualization = buildVisualizationModel(profileA, profileB, scoreDifferences);
  const comparativeReport = buildComparativeReport({
    modeMeta,
    compatibilityScore,
    compatibilityLevel: summary.compatibilityLevel,
    summary,
    synergyPoints,
    tensionPoints,
    communicationDynamics,
    decisionDynamics,
    workRhythmDynamics,
    pressureDynamics,
    practicalRecommendations,
    conflictRisks,
    factorHighlights,
  });

  return {
    mode,
    modeLabel: modeMeta.label,
    modeDescription: modeMeta.description,
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
    workStyleDynamics,
    leadershipDynamics,
    workRhythmDynamics,
    qualityDynamics,
    riskToleranceDynamics,
    pressureDynamics,
    conflictRisks,
    practicalRecommendations: Array.from(new Set(practicalRecommendations)).slice(0, 10),
    scoreDifferences,
    factorHighlights,
    technicalNotes,
    visualization,
    comparativeReport,
    generatedAt: new Date().toISOString(),
  };
}

export function compareMemberToTeam(memberProfile = {}, teamProfiles = [], options = {}) {
  const member = normalizeComparableProfile(memberProfile, {
    context: 'comparison_member_to_team_member',
    detailLevel: options?.detailLevel || 'long',
    fallbackId: options?.fallbackLeftId || 'member-profile',
  });

  const benchmark = buildTeamBenchmarkProfile(teamProfiles, {
    excludedId: member?.assessmentId || member?.id,
    benchmarkId: options?.benchmarkId || 'team-baseline',
    benchmarkName: options?.benchmarkName || 'Equipe de referencia',
  });

  if (!benchmark?.profile) {
    return null;
  }

  return compareDiscProfiles(member, benchmark.profile, {
    ...options,
    mode: COMPARISON_MODE.MEMBER_TO_TEAM,
    fallbackLeftId: member?.assessmentId || member?.id || 'member-profile',
    fallbackRightId: benchmark.profile?.assessmentId || benchmark.profile?.id || 'team-baseline',
  });
}
