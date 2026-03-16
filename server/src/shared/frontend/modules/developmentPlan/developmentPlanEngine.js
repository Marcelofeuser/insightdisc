function unique(items = [], limit = 12) {
  return [...new Set((Array.isArray(items) ? items : []).filter(Boolean))].slice(0, limit);
}

function pick(items = [], fallback = [], limit = 3) {
  const source = unique(items.length ? items : fallback);
  return source.slice(0, limit);
}

export function buildDevelopmentPlan3090(interpretation = {}, scores = {}) {
  const primary = String(interpretation?.primaryFactor || '').toUpperCase();
  const recommendations = unique(interpretation?.developmentRecommendations || []);
  const attention = unique(interpretation?.attentionPoints || []);
  const strengths = unique(interpretation?.strengths || []);

  const scoreFocus = [
    `Revisar semanalmente seu eixo predominante (${primary || 'DISC'}) para manter performance com equilíbrio comportamental.`,
    'Mapear contextos de pressão e registrar ajustes de comunicação que funcionaram.',
  ];

  const plan30 = pick(
    [
      ...recommendations,
      ...scoreFocus,
      'Definir 2 metas comportamentais objetivas com indicador de progresso.',
    ],
    ['Estruturar uma rotina de feedback curto e frequente.'],
    4,
  );

  const plan60 = pick(
    [
      ...attention.map((item) => `Trabalhar ponto de atenção: ${item}`),
      'Executar um ciclo de prática deliberada com revisão quinzenal.',
      'Validar evolução com feedback de pares e liderança direta.',
    ],
    ['Consolidar um plano de melhoria com checkpoints quinzenais.'],
    4,
  );

  const plan90 = pick(
    [
      ...strengths.map((item) => `Escalar força comportamental: ${item}`),
      'Conectar evolução comportamental aos objetivos estratégicos da função.',
      'Formalizar próximos passos para um novo ciclo de desenvolvimento.',
    ],
    ['Consolidar hábitos de alto impacto e preparar próximo ciclo de evolução.'],
    4,
  );

  return {
    summary:
      'Plano progressivo 30/60/90 dias para transformar leitura DISC em evolução prática de comportamento e performance.',
    checkpoints: [
      { window: '30 dias', goals: plan30 },
      { window: '60 dias', goals: plan60 },
      { window: '90 dias', goals: plan90 },
    ],
  };
}
