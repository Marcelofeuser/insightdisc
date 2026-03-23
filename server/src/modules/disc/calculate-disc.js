import { DISC_QUESTIONS } from './questionnaire.js';

const FACTORS = ['D', 'I', 'S', 'C'];

const PROFILE_LABELS = {
  D: 'Dominante',
  I: 'Influenciador',
  S: 'Estável',
  C: 'Conforme',
  DI: 'Executor Persuasivo',
  ID: 'Influente Assertivo',
  DS: 'Direto Consistente',
  SD: 'Estável Decisivo',
  DC: 'Executor Analítico',
  CD: 'Analítico Assertivo',
  IS: 'Influenciador Colaborativo',
  SI: 'Colaborador Influente',
  IC: 'Influenciador Estruturado',
  CI: 'Analítico Relacional',
  SC: 'Estável Metódico',
  CS: 'Conforme Confiável',
};

function getQuestionMap() {
  return new Map(DISC_QUESTIONS.map((question) => [question.id, question]));
}

function normalizeScores(rawScores) {
  const min = Math.min(...FACTORS.map((factor) => rawScores[factor]));
  const shifted = FACTORS.reduce((acc, factor) => {
    acc[factor] = rawScores[factor] - min + 1;
    return acc;
  }, {});

  const total = FACTORS.reduce((acc, factor) => acc + shifted[factor], 0) || 1;

  return FACTORS.reduce((acc, factor) => {
    acc[factor] = Math.round((shifted[factor] / total) * 100);
    return acc;
  }, {});
}

function getTopTwo(scores) {
  const ranked = FACTORS
    .map((factor) => ({ factor, value: Number(scores[factor] || 0) }))
    .sort((a, b) => b.value - a.value);

  return {
    dominant: ranked[0]?.factor || 'D',
    secondary: ranked[1]?.factor || 'I',
  };
}

export function calculateDiscFromAnswers(answers = []) {
  const questionMap = getQuestionMap();
  const rawScores = { D: 0, I: 0, S: 0, C: 0 };

  for (const answer of answers) {
    // Formato "q01I" — extrai o fator da última letra
    const mostFactor = String(answer.most || '').slice(-1).toUpperCase();
    const leastFactor = String(answer.least || '').slice(-1).toUpperCase();

    if (FACTORS.includes(mostFactor)) rawScores[mostFactor] += 2;
    if (FACTORS.includes(leastFactor)) rawScores[leastFactor] -= 1;
  }

  const normalized = normalizeScores(rawScores);
  const { dominant, secondary } = getTopTwo(normalized);
  const combination = `${dominant}${secondary}`;

  return {
    raw: rawScores,
    normalized,
    dominant,
    secondary,
    combination,
    profile: PROFILE_LABELS[combination] || PROFILE_LABELS[dominant] || 'Perfil DISC',
  };
}
