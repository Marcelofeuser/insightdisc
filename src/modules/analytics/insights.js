import { DISC_FACTORS, DISC_FACTOR_LABELS, toNumber } from '@/modules/analytics/constants';

export function buildBehaviorInsights(distribution = {}, sampleSize = 0) {
  const normalized = DISC_FACTORS.reduce((acc, factor) => {
    acc[factor] = toNumber(distribution?.[factor]);
    return acc;
  }, {});

  if (!sampleSize) {
    return [
      'Ainda não há amostra suficiente para gerar leitura comportamental confiável.',
      'Conclua novas avaliações para habilitar tendências DISC e recomendações mais precisas.',
      'Enquanto isso, acompanhe casos críticos no comparador para apoiar decisões imediatas.',
    ];
  }

  const sorted = [...DISC_FACTORS]
    .map((factor) => ({ factor, value: normalized[factor] }))
    .sort((a, b) => b.value - a.value);

  const strongest = sorted[0] || { factor: 'D', value: 0 };
  const weakest = sorted[sorted.length - 1] || { factor: 'C', value: 0 };

  const insights = [
    `Predominância atual em ${DISC_FACTOR_LABELS[strongest.factor]} (${strongest.factor}) com ${strongest.value.toFixed(1)}%.`,
  ];

  if (normalized.D > 40) {
    insights.push('Alta predominância de perfis Dominantes pode indicar cultura competitiva e decisões mais rápidas.');
  }

  if (normalized.S > 40) {
    insights.push('Predominância de perfis Estáveis sugere ambiente cooperativo e ritmo mais consistente.');
  }

  if (normalized.I < 10) {
    insights.push('Baixa presença de perfis Influentes pode sinalizar comunicação menos expansiva entre áreas.');
  }

  if (normalized.C > 35) {
    insights.push('Peso elevado de Conformidade tende a favorecer qualidade e controle, com risco de lentidão em decisões urgentes.');
  }

  const spread = strongest.value - weakest.value;
  if (spread >= 18) {
    insights.push('A distribuição está concentrada em poucos estilos; vale reforçar complementaridade nas composições de time.');
  } else {
    insights.push('A distribuição está relativamente equilibrada, favorecendo complementaridade de estilos na execução.');
  }

  insights.push(
    `${DISC_FACTOR_LABELS[weakest.factor]} (${weakest.factor}) é o eixo com menor presença (${weakest.value.toFixed(1)}%): desenvolver esse fator pode reduzir pontos cegos operacionais.`
  );

  insights.push(`Leitura baseada em ${sampleSize} perfil${sampleSize === 1 ? '' : 'is'} com dados DISC válidos.`);

  return insights.slice(0, 5);
}
