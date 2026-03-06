export function getDiscProfile(scores) {
  const { D = 0, I = 0, S = 0, C = 0 } = scores || {};

  const entries = [
    { key: 'D', value: D },
    { key: 'I', value: I },
    { key: 'S', value: S },
    { key: 'C', value: C },
  ];

  entries.sort((a, b) => b.value - a.value);

  const primary = entries[0].key;
  const secondary = entries[1].key;

  return {
    primary,
    secondary,
    combination: `${primary}${secondary}`,
  };
}

const profileDescriptions = {
  D: {
    title: 'Dominância',
    description:
      'Pessoas com alta Dominância tendem a ser diretas, orientadas a resultados e focadas em desafios.',
  },
  I: {
    title: 'Influência',
    description:
      'Pessoas com alta Influência são comunicativas, otimistas e motivadas por interação social.',
  },
  S: {
    title: 'Estabilidade',
    description:
      'Pessoas com alta Estabilidade valorizam cooperação, consistência e ambientes harmoniosos.',
  },
  C: {
    title: 'Conformidade',
    description:
      'Pessoas com alta Conformidade são analíticas, cuidadosas e orientadas à qualidade.',
  },
};

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeScores(scores = {}) {
  const normalized = {
    D: toFiniteNumber(scores?.D),
    I: toFiniteNumber(scores?.I),
    S: toFiniteNumber(scores?.S),
    C: toFiniteNumber(scores?.C),
  };

  const hasAtLeastOneScore = Object.values(normalized).some((value) => value !== null);
  if (!hasAtLeastOneScore) {
    return null;
  }

  return {
    D: normalized.D ?? 0,
    I: normalized.I ?? 0,
    S: normalized.S ?? 0,
    C: normalized.C ?? 0,
  };
}

export function generateDiscInterpretation(scores) {
  const normalizedScores = normalizeScores(scores);
  if (!normalizedScores) {
    return null;
  }

  const profile = getDiscProfile(normalizedScores);

  const primaryData = profileDescriptions[profile.primary];

  return {
    profile,
    summary: primaryData.description,
    leadership: generateLeadership(profile.primary),
    communication: generateCommunication(profile.primary),
    strengths: generateStrengths(profile.primary),
    risks: generateRisks(profile.primary),
    environment: generateEnvironment(profile.primary),
  };
}

function generateLeadership(type) {
  const map = {
    D: 'Estilo de liderança direto e orientado a metas.',
    I: 'Liderança inspiradora e motivadora.',
    S: 'Liderança baseada em suporte e estabilidade.',
    C: 'Liderança analítica e baseada em processos.',
  };
  return map[type];
}

function generateCommunication(type) {
  const map = {
    D: 'Prefere comunicação objetiva e focada em resultados.',
    I: 'Prefere comunicação aberta, entusiasmada e social.',
    S: 'Prefere comunicação calma e colaborativa.',
    C: 'Prefere comunicação estruturada e detalhada.',
  };
  return map[type];
}

function generateStrengths(type) {
  const map = {
    D: ['decisão rápida', 'foco em metas', 'liderança'],
    I: ['persuasão', 'otimismo', 'relacionamento'],
    S: ['cooperação', 'paciência', 'consistência'],
    C: ['análise', 'precisão', 'qualidade'],
  };
  return map[type];
}

function generateRisks(type) {
  const map = {
    D: ['impaciência', 'excesso de controle'],
    I: ['falta de foco', 'excesso de otimismo'],
    S: ['resistência a mudanças'],
    C: ['perfeccionismo', 'excesso de análise'],
  };
  return map[type];
}

function generateEnvironment(type) {
  const map = {
    D: 'Ambientes desafiadores e com autonomia.',
    I: 'Ambientes colaborativos e sociais.',
    S: 'Ambientes estáveis e previsíveis.',
    C: 'Ambientes organizados e estruturados.',
  };
  return map[type];
}
