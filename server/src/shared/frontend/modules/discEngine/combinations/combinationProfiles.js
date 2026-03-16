import { FACTOR_PROFILES } from '../profiles/factorProfiles.js';

const PURE_CODES = ['D', 'I', 'S', 'C'];

const COMBINATION_OVERRIDES = Object.freeze({
  DI: {
    styleLabel: 'Catalisador de Resultado',
    summaryShort: 'Combina direção firme com influência interpessoal para acelerar adesão e execução.',
    summaryMedium:
      'DI reúne assertividade estratégica com poder de mobilização. Costuma liderar por direção clara e narrativa de impacto.',
    summaryLong:
      'A combinação DI tende a produzir liderança com alta tração: decide rápido, comunica com energia e mobiliza pessoas para metas ambiciosas. O ganho de maturidade está em calibrar ritmo para não sacrificar qualidade de alinhamento.',
    communicationStyle: 'Direta e envolvente, com foco em adesão rápida a metas.',
    decisionMaking: 'Ágil, orientada a impacto e sustentada por senso de oportunidade.',
    leadershipStyle: 'Liderança de direção e mobilização, com forte presença em ambientes competitivos.',
    pressureResponse: 'Pode elevar intensidade e urgência; precisa preservar qualidade de escuta.',
    idealEnvironment: 'Ambiente dinâmico, com metas desafiadoras e abertura para protagonismo.',
    attentionPoints: ['Risco de prometer ritmo acima da capacidade do time'],
  },
  ID: {
    styleLabel: 'Influenciador Competitivo',
    summaryShort: 'Estilo de alta energia social com postura assertiva para abrir caminhos rapidamente.',
    summaryMedium:
      'ID tende a combinar carisma com firmeza, influenciando decisões por relacionamento e presença.',
    summaryLong:
      'Na combinação ID, o foco recai em conexão rápida, influência e ação. É um perfil útil para abrir frentes e acelerar engajamento, com necessidade de atenção ao fechamento disciplinado de combinados.',
    communicationStyle: 'Persuasiva e energética, com forte presença relacional.',
  },
  DC: {
    styleLabel: 'Executor Analítico',
    summaryShort: 'Une firmeza de decisão com senso crítico, buscando resultado com controle de qualidade.',
    summaryMedium:
      'DC combina assertividade com análise rigorosa. Decide com foco em impacto, mas exige padrão alto de entrega.',
    summaryLong:
      'A combinação DC favorece ambientes que exigem performance com responsabilidade técnica. Esse perfil tende a avançar com convicção, equilibrando velocidade e critério. O desenvolvimento passa por calibrar cobrança para manter colaboração.',
    communicationStyle: 'Objetiva e técnica, orientada a evidência e decisão.',
    decisionMaking: 'Firme e criteriosa, com atenção a risco e consistência.',
    leadershipStyle: 'Liderança exigente, orientada a desempenho e qualidade.',
  },
  CD: {
    styleLabel: 'Estratégico de Precisão',
    summaryShort: 'Perfil que prioriza análise robusta e assume direção com base em critério claro.',
    summaryMedium:
      'CD tende a tomar decisões sólidas após avaliação técnica, mantendo forte padrão de consistência.',
    summaryLong:
      'Na combinação CD, o processo decisório combina profundidade analítica com assertividade quando o caminho está validado. Ganha força em contextos de alta complexidade, com oportunidade de evoluir na simplificação da comunicação.',
  },
  DS: {
    styleLabel: 'Direção com Estabilidade',
    summaryShort: 'Mistura foco em resultado com constância operacional e senso de responsabilidade coletiva.',
    summaryMedium:
      'DS combina direcionamento claro com cadência sustentável, favorecendo execução disciplinada com previsibilidade.',
    summaryLong:
      'A combinação DS é valiosa para ambientes que exigem avanço sem perder estabilidade. O perfil tende a equilibrar ritmo e suporte, com desafio de não centralizar decisões em excesso.',
  },
  SD: {
    styleLabel: 'Confiável de Alta Entrega',
    summaryShort: 'Estilo cooperativo com assertividade crescente para sustentar resultado em ciclos longos.',
    summaryMedium:
      'SD prioriza estabilidade e relacionamento, mas assume direção quando as metas exigem posicionamento firme.',
    summaryLong:
      'Na combinação SD, a constância é o núcleo. O perfil tende a criar confiança e manter ritmo, elevando assertividade de forma progressiva quando necessário.',
  },
  IS: {
    styleLabel: 'Engajador Colaborativo',
    summaryShort: 'Combina influência social com cooperação estável, favorecendo clima e adesão do time.',
    summaryMedium:
      'IS comunica com proximidade e mantém relacionamento de confiança, apoiando integração e continuidade.',
    summaryLong:
      'A combinação IS cria alto potencial para articulação de times e manutenção de ambiente positivo. O desenvolvimento ganha força com maior disciplina de priorização e fechamento de acordos.',
    communicationStyle: 'Calorosa, próxima e colaborativa, com foco em pertencimento.',
  },
  SI: {
    styleLabel: 'Facilitador de Confiança',
    summaryShort: 'Perfil de apoio consistente com boa habilidade de conexão e harmonização de grupos.',
    summaryMedium:
      'SI tende a construir relações estáveis e coordenar transições com sensibilidade relacional.',
    summaryLong:
      'Na combinação SI, o valor está na previsibilidade e na coesão do time. É um estilo que favorece continuidade, com oportunidade de avançar em comunicação assertiva em cenários críticos.',
  },
  IC: {
    styleLabel: 'Comunicador Estruturado',
    summaryShort: 'Une expressão relacional com preocupação por qualidade e consistência de mensagem.',
    summaryMedium:
      'IC combina influência com análise, favorecendo comunicação persuasiva baseada em conteúdo sólido.',
    summaryLong:
      'A combinação IC entrega equilíbrio entre presença social e rigor técnico. É útil em contextos de explicação, negociação e tradução de temas complexos para públicos diversos.',
  },
  CI: {
    styleLabel: 'Analista Relacional',
    summaryShort: 'Perfil técnico com boa adaptabilidade social, equilibrando critério e conexão.',
    summaryMedium:
      'CI preserva padrão analítico sem perder capacidade de diálogo, útil em ambientes de alta interface.',
    summaryLong:
      'Na combinação CI, a força está em transformar análise em orientação prática para pessoas e processos. O desenvolvimento passa por dosar detalhe técnico conforme audiência.',
  },
  SC: {
    styleLabel: 'Guardião de Qualidade',
    summaryShort: 'Combina consistência de execução com rigor técnico para sustentar previsibilidade e padrão.',
    summaryMedium:
      'SC tende a estruturar rotina com estabilidade e precisão, reduzindo risco operacional no médio prazo.',
    summaryLong:
      'A combinação SC favorece contextos que exigem controle, continuidade e confiabilidade. O ganho de maturidade ocorre ao acelerar resposta em cenários de mudança rápida.',
  },
  CS: {
    styleLabel: 'Especialista Consistente',
    summaryShort: 'Estilo analítico e estável, com foco em método, segurança e entrega sustentável.',
    summaryMedium:
      'CS combina precisão técnica com cadência confiável, contribuindo para qualidade contínua da operação.',
    summaryLong:
      'Na combinação CS, o perfil tende a construir soluções robustas e previsíveis. É valioso para governança e melhoria contínua, com oportunidade de desenvolver maior agilidade decisória.',
  },
});

function mergeField(baseA, baseB, override, key, fallback = null) {
  if (override?.[key]) return override[key];
  if (baseA?.[key] && baseB?.[key]) return `${baseA[key]} ${baseB[key]}`;
  return baseA?.[key] || baseB?.[key] || fallback;
}

function mergeLists(baseA = [], baseB = [], override = []) {
  const unique = [...baseA, ...baseB, ...override].filter(Boolean);
  return [...new Set(unique)].slice(0, 8);
}

function buildPureProfile(code) {
  const base = FACTOR_PROFILES[code] || FACTOR_PROFILES.D;
  return {
    profileCode: code,
    styleLabel: base.styleLabel,
    summaryShort: base.summaryShort,
    summaryMedium: base.summaryMedium,
    summaryLong: base.summaryLong,
    strengths: [...(base.strengths || [])],
    attentionPoints: [...(base.attentionPoints || [])],
    communicationStyle: base.communicationStyle,
    decisionMaking: base.decisionMaking,
    leadershipStyle: base.leadershipStyle,
    pressureResponse: base.pressureResponse,
    idealEnvironment: base.idealEnvironment,
    motivators: [...(base.motivators || [])],
    potentialChallenges: [...(base.potentialChallenges || [])],
    developmentRecommendations: [...(base.developmentRecommendations || [])],
    workStyle: base.workStyle,
    relationshipStyle: base.relationshipStyle,
    learningStyle: base.learningStyle,
  };
}

function buildCombinationProfile(code) {
  const normalizedCode = String(code || '').toUpperCase();
  const primary = normalizedCode[0] || 'D';
  const secondary = normalizedCode[1] || 'I';
  const primaryBase = FACTOR_PROFILES[primary] || FACTOR_PROFILES.D;
  const secondaryBase = FACTOR_PROFILES[secondary] || FACTOR_PROFILES.I;
  const override = COMBINATION_OVERRIDES[normalizedCode] || {};

  return {
    profileCode: normalizedCode,
    styleLabel: override.styleLabel || `${primaryBase.styleLabel} com apoio ${secondaryBase.styleLabel}`,
    summaryShort: override.summaryShort || `${primaryBase.summaryShort} ${secondaryBase.summaryShort}`,
    summaryMedium: override.summaryMedium || `${primaryBase.summaryMedium} ${secondaryBase.summaryMedium}`,
    summaryLong: override.summaryLong || `${primaryBase.summaryLong} ${secondaryBase.summaryLong}`,
    strengths: mergeLists(primaryBase.strengths, secondaryBase.strengths, override.strengths),
    attentionPoints: mergeLists(primaryBase.attentionPoints, secondaryBase.attentionPoints, override.attentionPoints),
    communicationStyle: mergeField(primaryBase, secondaryBase, override, 'communicationStyle'),
    decisionMaking: mergeField(primaryBase, secondaryBase, override, 'decisionMaking'),
    leadershipStyle: mergeField(primaryBase, secondaryBase, override, 'leadershipStyle'),
    pressureResponse: mergeField(primaryBase, secondaryBase, override, 'pressureResponse'),
    idealEnvironment: mergeField(primaryBase, secondaryBase, override, 'idealEnvironment'),
    motivators: mergeLists(primaryBase.motivators, secondaryBase.motivators, override.motivators),
    potentialChallenges: mergeLists(primaryBase.potentialChallenges, secondaryBase.potentialChallenges, override.potentialChallenges),
    developmentRecommendations: mergeLists(
      primaryBase.developmentRecommendations,
      secondaryBase.developmentRecommendations,
      override.developmentRecommendations,
    ),
    workStyle: mergeField(primaryBase, secondaryBase, override, 'workStyle'),
    relationshipStyle: mergeField(primaryBase, secondaryBase, override, 'relationshipStyle'),
    learningStyle: mergeField(primaryBase, secondaryBase, override, 'learningStyle'),
  };
}

export function getCombinationProfile(profileCode = 'DISC') {
  const code = String(profileCode || 'DISC').toUpperCase();

  if (PURE_CODES.includes(code)) {
    return buildPureProfile(code);
  }

  if (code.length === 2) {
    return buildCombinationProfile(code);
  }

  return {
    profileCode: 'DISC',
    styleLabel: 'Perfil DISC em consolidação',
    summaryShort: 'Ainda não há dados suficientes para identificar uma combinação DISC com precisão.',
    summaryMedium:
      'O perfil atual está em fase de consolidação. Assim que mais dados válidos forem capturados, a leitura comportamental ficará mais precisa e personalizada.',
    summaryLong:
      'No momento, os dados disponíveis não permitem definir um padrão DISC robusto com segurança estatística adequada. Recomenda-se concluir novas avaliações para habilitar uma interpretação comportamental completa e comparável no tempo.',
    strengths: ['Boa base para autoconhecimento inicial'],
    attentionPoints: ['Amostra ainda limitada para conclusões de maior precisão'],
    communicationStyle: 'Comunicação em desenvolvimento, com necessidade de mais observações estruturadas.',
    decisionMaking: 'Tomada de decisão ainda sem padrão suficientemente consolidado.',
    leadershipStyle: 'Estilo de liderança ainda em leitura inicial.',
    pressureResponse: 'Resposta sob pressão em observação, sem tendência dominante definida.',
    idealEnvironment: 'Ambiente com feedback frequente e clareza de expectativas para consolidar padrão.',
    motivators: ['Aprendizado contínuo', 'Feedback estruturado'],
    potentialChallenges: ['Incerteza por baixa amostra de dados'],
    developmentRecommendations: ['Concluir nova avaliação para enriquecer base comportamental'],
    workStyle: 'Em mapeamento.',
    relationshipStyle: 'Em mapeamento.',
    learningStyle: 'Em mapeamento.',
  };
}

export { COMBINATION_OVERRIDES };
