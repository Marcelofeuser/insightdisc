export const DEMO_PROFILES = Object.freeze([
  { id: 'demo-1', name: 'Carlos Lima', profileCode: 'DI', scores: { D: 42, I: 31, S: 14, C: 13 } },
  { id: 'demo-2', name: 'Ana Souza', profileCode: 'SC', scores: { D: 14, I: 18, S: 39, C: 29 } },
  { id: 'demo-3', name: 'Pedro Rocha', profileCode: 'DC', scores: { D: 37, I: 12, S: 18, C: 33 } },
  { id: 'demo-4', name: 'Juliana Reis', profileCode: 'IS', scores: { D: 16, I: 40, S: 30, C: 14 } },
  { id: 'demo-5', name: 'Mariana Prado', profileCode: 'CI', scores: { D: 15, I: 26, S: 19, C: 40 } },
  { id: 'demo-6', name: 'Rafael Nunes', profileCode: 'DS', scores: { D: 34, I: 19, S: 31, C: 16 } },
]);

export const DEMO_TEAM = Object.freeze({
  id: 'demo-team-1',
  name: 'Time Comercial Demo',
  members: DEMO_PROFILES.map((item, index) => ({
    assessmentId: item.id,
    candidateName: item.name,
    profileCode: item.profileCode,
    dominantFactor: item.profileCode?.[0] || 'D',
    createdAt: new Date(Date.now() - index * 86400000 * 15).toISOString(),
    disc: item.scores,
  })),
});

export const DEMO_JOB_PROFILE = Object.freeze({
  id: 'demo-job-1',
  key: 'sales_executive',
  label: 'Executivo de Vendas',
  title: 'Executivo de Vendas',
  description: 'Função comercial orientada a metas, negociação e influência.',
  scores: { D: 60, I: 40, S: 30, C: 70 },
  ideal_profile: {
    D: { min: 45, max: 75, ideal: 60 },
    I: { min: 25, max: 60, ideal: 40 },
    S: { min: 20, max: 45, ideal: 30 },
    C: { min: 55, max: 85, ideal: 70 },
  },
});

export const DEMO_COMPARISON = Object.freeze({
  leftId: 'demo-1',
  rightId: 'demo-2',
});
