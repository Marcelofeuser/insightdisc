import { DISC_FACTORS, FACTOR_LABELS, clamp } from '../constants.js';

function getLevel(value) {
  const score = clamp(value);
  if (score >= 67) return 'high';
  if (score >= 40) return 'mid';
  return 'low';
}

export function buildIntensityLayer(scores = {}, ranking = []) {
  const normalized = DISC_FACTORS.reduce((acc, factor) => {
    acc[factor] = clamp(scores?.[factor]);
    return acc;
  }, {});

  const top = ranking[0] || { factor: 'D', value: normalized.D };
  const second = ranking[1] || { factor: 'I', value: normalized.I };
  const lowest = [...DISC_FACTORS]
    .map((factor) => ({ factor, value: normalized[factor] }))
    .sort((a, b) => a.value - b.value)[0] || { factor: 'C', value: normalized.C };

  const spread = Math.round((top.value - lowest.value) * 10) / 10;

  const layer = {
    summaryShortAddons: [],
    summaryMediumAddons: [],
    summaryLongAddons: [],
    strengths: [],
    attentionPoints: [],
    motivators: [],
    potentialChallenges: [],
    developmentRecommendations: [],
    adaptationNotes: [],
  };

  if (getLevel(top.value) === 'high' && spread >= 20) {
    layer.summaryShortAddons.push('Há predominância comportamental clara no momento atual.');
    layer.summaryMediumAddons.push(
      `O fator ${top.factor} (${FACTOR_LABELS[top.factor]}) aparece com alta intensidade frente aos demais, influenciando fortemente o estilo de atuação.`
    );
    layer.summaryLongAddons.push(
      'A distância entre o fator predominante e os demais indica assinatura comportamental mais concentrada, o que aumenta consistência de estilo e também exige estratégias conscientes de compensação.'
    );
  }

  if (spread <= 10) {
    layer.summaryShortAddons.push('A distribuição entre fatores sugere perfil relativamente equilibrado.');
    layer.adaptationNotes.push('Há boa adaptabilidade entre estilos DISC sem concentração extrema em um único fator.');
  }

  if (normalized.D >= 40 && normalized.C >= 35) {
    layer.strengths.push('Combina assertividade com senso crítico para decisões mais sólidas.');
    layer.adaptationNotes.push('D alto com C alto: tendência a decidir com firmeza sem abrir mão de critério técnico.');
  }

  if (normalized.I >= 35 && normalized.S >= 35) {
    layer.strengths.push('Comunicação calorosa com constância relacional em ciclos longos.');
    layer.adaptationNotes.push('I alto com S alto: estilo de comunicação acolhedor e estável para engajar o time.');
  }

  if (normalized.C >= 40 && normalized.I <= 20) {
    layer.attentionPoints.push('Pode adotar comunicação mais reservada em contextos de alta exposição social.');
    layer.adaptationNotes.push('C alto com I baixo: perfil mais analítico, objetivo e reservado na interação.');
    layer.developmentRecommendations.push('Traduzir análises complexas em mensagens mais acessíveis para públicos diversos.');
  }

  if (normalized.D >= 45 && normalized.S <= 20) {
    layer.attentionPoints.push('Tendência a elevar urgência e reduzir tolerância a ritmos mais lentos.');
    layer.adaptationNotes.push('D muito dominante com S baixo: atenção ao impacto do ritmo em alinhamentos colaborativos.');
    layer.developmentRecommendations.push('Inserir checkpoints de alinhamento para equilibrar velocidade e aderência.');
  }

  if (lowest.value <= 15) {
    layer.potentialChallenges.push(
      `${FACTOR_LABELS[lowest.factor]} com baixa presença pode criar ponto cego em decisões situacionais.`
    );
    layer.developmentRecommendations.push(
      `Praticar comportamentos associados a ${FACTOR_LABELS[lowest.factor]} para ampliar repertório.`
    );
  }

  if (Math.abs(top.value - second.value) <= 4) {
    layer.adaptationNotes.push(
      `Os fatores ${top.factor} e ${second.factor} aparecem próximos, sugerindo combinação situacional flexível.`
    );
  }

  return layer;
}
