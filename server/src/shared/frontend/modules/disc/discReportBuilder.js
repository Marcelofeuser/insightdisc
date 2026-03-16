import { generateDiscInterpretation, getDiscProfile } from '@/modules/disc/discInterpretation';

const FACTORS = ['D', 'I', 'S', 'C'];
const FACTOR_LABEL = {
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade',
};

const BRANDING_FALLBACK = Object.freeze({
  company_name: 'InsightDISC',
  logo_url: '/brand/insightdisc-report-logo.png',
  brand_primary_color: '#0b1f3b',
  brand_secondary_color: '#f7b500',
  report_footer_text: 'InsightDISC - Plataforma de Análise Comportamental',
});

function safeNum(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(safeNum(value))));
}

function normalizeScores(scores = {}) {
  return {
    D: clamp(scores?.D),
    I: clamp(scores?.I),
    S: clamp(scores?.S),
    C: clamp(scores?.C),
  };
}

function hasFiniteScoreMap(source = {}) {
  if (!source || typeof source !== 'object') return false;
  return FACTORS.some((factor) => Number.isFinite(Number(source?.[factor])));
}

function firstScoreMap(candidates = []) {
  for (const candidate of candidates) {
    if (hasFiniteScoreMap(candidate)) {
      return normalizeScores(candidate);
    }
  }
  return null;
}

function isUniformScoreMap(source = {}, target = null) {
  if (!source || typeof source !== 'object') return false;
  const values = FACTORS.map((factor) => Number(source?.[factor]));
  if (!values.every(Number.isFinite)) return false;
  const [firstValue] = values;
  if (target !== null && firstValue !== target) return false;
  return values.every((value) => value === firstValue);
}

function resolveProfileHint(rawProfile = {}) {
  const rawKey = String(rawProfile?.key || '').trim().toUpperCase();
  if (!rawKey) return null;

  if (rawKey === 'DISC') {
    return {
      key: 'DISC',
      mode: 'balanced',
      primary: 'D',
      secondary: 'I',
    };
  }

  if (rawKey.length === 1 && FACTOR_LABEL[rawKey]) {
    return {
      key: rawKey,
      mode: 'pure',
      primary: rawKey,
      secondary: String(rawProfile?.secondary || 'I').trim().toUpperCase() || 'I',
    };
  }

  if (rawKey.length === 2 && FACTOR_LABEL[rawKey[0]] && FACTOR_LABEL[rawKey[1]]) {
    return {
      key: rawKey,
      mode: 'combo',
      primary: rawKey[0],
      secondary: rawKey[1],
    };
  }

  return null;
}

function topTwo(scores) {
  const ranked = Object.entries(scores)
    .map(([factor, score]) => ({ factor, score: clamp(score) }))
    .sort((a, b) => b.score - a.score);

  return {
    primary: ranked[0]?.factor || 'D',
    secondary: ranked[1]?.factor || 'I',
    diff: (ranked[0]?.score || 0) - (ranked[1]?.score || 0),
  };
}

function normalizeBranding(assessment = {}) {
  const source =
    assessment?.branding ||
    assessment?.workspace_branding ||
    assessment?.organization_branding ||
    {};

  return {
    company_name:
      source?.company_name ||
      assessment?.workspace_name ||
      assessment?.company_name ||
      BRANDING_FALLBACK.company_name,
    logo_url: source?.logo_url || assessment?.logo_url || BRANDING_FALLBACK.logo_url,
    brand_primary_color:
      source?.brand_primary_color || BRANDING_FALLBACK.brand_primary_color,
    brand_secondary_color:
      source?.brand_secondary_color || BRANDING_FALLBACK.brand_secondary_color,
    report_footer_text:
      source?.report_footer_text || BRANDING_FALLBACK.report_footer_text,
  };
}

function buildFactorSection(factor, score) {
  const value = clamp(score);
  const band = value >= 67 ? 'high' : value >= 34 ? 'mid' : 'low';

  return {
    factor,
    label: FACTOR_LABEL[factor],
    score: value,
    band,
    headline: `Expressão de ${FACTOR_LABEL[factor]} em banda ${band.toUpperCase()}.`,
    paragraphs: [
      `O fator ${FACTOR_LABEL[factor]} influencia sua resposta em situações de decisão e relação com o time.`,
      'A evolução desse fator ocorre com prática deliberada e feedback estruturado em contexto real.',
    ],
    actions: [
      'Definir um comportamento observável para praticar semanalmente.',
      'Estabelecer critério de sucesso antes de conversas importantes.',
      'Registrar aprendizados após situações de alta pressão.',
      'Reforçar acordos com prazo e responsável definido.',
      'Executar revisão quinzenal de progresso comportamental.',
    ],
    redFlags: [
      'Queda de clareza quando aumenta a pressão.',
      'Oscilação de consistência em momentos críticos.',
      'Ruído de comunicação em alinhamentos importantes.',
      'Decisões sem critério explícito em ambiente urgente.',
      'Dificuldade de manter follow-up de acordos.',
    ],
  };
}

export function buildDiscReportModel(assessment = {}) {
  const results = assessment?.results || assessment?.disc_results || {};
  const reportDisc = assessment?.report?.discProfile || assessment?.disc_profile || {};

  const natural =
    firstScoreMap([
      results?.natural_profile,
      results?.natural,
      results?.summary_profile,
      reportDisc?.normalized,
      reportDisc?.natural,
      reportDisc?.scores?.natural,
      reportDisc?.scores,
      assessment?.natural_profile,
      assessment?.scores,
    ]) || normalizeScores({});
  const adapted =
    firstScoreMap([
      results?.adapted_profile,
      results?.adapted,
      reportDisc?.adapted,
      reportDisc?.scores?.adapted,
      assessment?.adapted_profile,
      natural,
    ]) || natural;

  const summary = FACTORS.reduce((acc, factor) => {
    acc[factor] = clamp((natural[factor] + adapted[factor]) / 2);
    return acc;
  }, {});
  const placeholderQuantitativeScores =
    isUniformScoreMap(natural, 25) &&
    isUniformScoreMap(adapted, 25) &&
    isUniformScoreMap(summary, 25);
  const quantitativeAvailable = !placeholderQuantitativeScores;
  const availabilityMessage = quantitativeAvailable
    ? ''
    : 'Esta avaliacao legada nao preservou scores DISC confiaveis. O preview exibe apenas a interpretacao qualitativa disponivel.';
  const attachScoreMeta = (map) => ({
    ...map,
    quantitativeAvailable,
    availabilityMessage,
  });

  const profileByScores = topTwo(natural);
  const interpretedProfile = getDiscProfile(natural);
  const interpretation = generateDiscInterpretation(natural) || {};
  const profileHint = resolveProfileHint(reportDisc?.profile);

  const primary =
    (placeholderQuantitativeScores ? profileHint?.primary : '') ||
    results?.dominant_factor ||
    assessment?.dominant_factor ||
    interpretedProfile?.primary ||
    profileByScores.primary;
  const secondary =
    (placeholderQuantitativeScores ? profileHint?.secondary : '') ||
    results?.secondary_factor ||
    assessment?.secondary_factor ||
    interpretedProfile?.secondary ||
    profileByScores.secondary;

  const profileMode = placeholderQuantitativeScores
    ? profileHint?.mode || (profileByScores.diff >= 18 ? 'pure' : 'combo')
    : profileByScores.diff >= 18
      ? 'pure'
      : 'combo';
  const profileKey = placeholderQuantitativeScores
    ? profileHint?.key || (profileMode === 'pure' ? primary : `${primary}${secondary}`)
    : profileMode === 'pure'
      ? primary
      : `${primary}${secondary}`;

  const participantName =
    assessment?.candidateName ||
    assessment?.respondent_name ||
    assessment?.respondentName ||
    assessment?.full_name ||
    assessment?.name ||
    'Participante DISC';

  const participantEmail =
    assessment?.candidateEmail ||
    assessment?.respondent_email ||
    assessment?.respondentEmail ||
    assessment?.email ||
    'contato@participante.disc';

  const branding = normalizeBranding(assessment);

  const strengths =
    interpretation?.strengths?.length
      ? interpretation.strengths
      : [
          'Foco em resultado com orientacao a entrega.',
          'Capacidade de ajustar abordagem conforme o contexto.',
          'Boa leitura de impacto em relacoes profissionais.',
          'Consistencia em ambientes com objetivo claro.',
          'Potencial de influencia em equipes multidisciplinares.',
          'Aderencia a ciclos de melhoria com feedback.',
        ];

  const risks =
    interpretation?.risks?.length
      ? interpretation.risks
      : [
          'Aceleracao sem fechamento formal de acordos.',
          'Excesso de otimismo em prazos curtos.',
          'Oscilacao de foco quando ha muitas demandas.',
          'Queda de escuta ativa em situacoes de tensao.',
          'Dificuldade de manter priorizacao consistente.',
          'Desgaste por adaptacao prolongada sem ajuste de rotina.',
        ];

  const model = {
    meta: {
      brand: branding.company_name,
      reportTitle: 'Relatorio DISC Premium',
      reportSubtitle:
        'Diagnostico comportamental com benchmark e recomendacoes praticas de desenvolvimento',
      generatedAt: assessment?.completed_at || assessment?.created_date || new Date().toISOString(),
      reportId: assessment?.id || `report-${Date.now()}`,
      version: '4.0',
      responsibleName: assessment?.analyst_name || 'Especialista InsightDISC',
      responsibleRole: 'Analista Comportamental',
    },
    branding,
    participant: {
      name: participantName,
      email: participantEmail,
      assessmentId: assessment?.id || `report-${Date.now()}`,
      role: assessment?.candidate_role || assessment?.role || 'Profissional em desenvolvimento',
      company:
        assessment?.workspace_name ||
        assessment?.company ||
        branding.company_name ||
        'Organizacao avaliada',
    },
    scores: {
      natural: attachScoreMeta(natural),
      adapted: attachScoreMeta(adapted),
      summary: attachScoreMeta(summary),
      quantitativeAvailable,
      availabilityMessage,
      deltas: FACTORS.reduce((acc, factor) => {
        acc[factor] = clamp(adapted[factor]) - clamp(natural[factor]);
        return acc;
      }, {}),
    },
    profile: {
      primary,
      secondary,
      key: profileKey,
      mode: profileMode,
      topDiff: profileByScores.diff,
      label:
        profileMode === 'pure'
          ? `Predominancia de ${FACTOR_LABEL[primary]}`
          : `${FACTOR_LABEL[primary]} com apoio de ${FACTOR_LABEL[secondary]}`,
      archetype:
        interpretation?.profile?.combination
          ? `Perfil ${interpretation.profile.combination}`
          : `Combinacao ${profileKey}`,
    },
    adaptation: {
      band: quantitativeAvailable ? 'mid' : 'unknown',
      avgAbsDelta: quantitativeAvailable
        ? FACTORS.reduce(
            (sum, factor) => sum + Math.abs(clamp(adapted[factor]) - clamp(natural[factor])),
            0
          ) / 4
        : null,
      interpretation: quantitativeAvailable
        ? 'A adaptacao observada indica ajustes de comportamento ao contexto atual de trabalho.'
        : 'A avaliacao nao preservou dados numericos suficientes para comparar perfil natural e adaptado com seguranca.',
    },
    benchmark: {
      note: quantitativeAvailable
        ? 'Faixas internas deterministicas para comparacao por combinacao DISC.'
        : 'Esta avaliacao legada nao preservou benchmark numerico confiavel.',
      rows: FACTORS.map((factor) => ({
        factor: `${factor} - ${FACTOR_LABEL[factor]}`,
        score: quantitativeAvailable ? natural[factor] : null,
        typicalRange: quantitativeAvailable
          ? factor === primary
            ? '67-100'
            : factor === secondary
              ? '45-85'
              : '20-65'
          : 'n/d',
        reading: quantitativeAvailable
          ? factor === primary
            ? 'Fator com alta representatividade no perfil atual.'
            : factor === secondary
              ? 'Fator de apoio com influencia relevante no estilo de atuacao.'
              : 'Fator complementar para equilibrio de performance.'
          : `Leitura quantitativa indisponivel. O fator ${factor} permanece apenas com interpretacao qualitativa nesta avaliacao.`,
      })),
    },
    combinedProfile: {
      title: interpretation?.summary || `Perfil ${profileKey} com foco em evolucao pratica`,
      executiveSummary: [
        interpretation?.summary || 'Perfil com potencial de impacto consistente quando opera com metas claras.',
        'A combinacao dos fatores favorece decisoes mais assertivas quando ha criterio definido.',
        'A principal alavanca de evolucao e transformar insight em rotina semanal.',
        'Ajustes de comunicacao e follow-up aumentam previsibilidade de resultado.',
      ],
      strengths,
      risks,
      communicationPlaybook: {
        do: [
          'Iniciar conversas com objetivo, contexto e impacto esperado.',
          'Concluir alinhamentos com dono, prazo e criterio de sucesso.',
          'Adequar profundidade da mensagem ao perfil do interlocutor.',
          'Usar exemplos concretos para reduzir ambiguidade.',
          'Registrar acordos-chave em pontos de decisao.',
        ],
        dont: [
          'Assumir entendimento sem confirmar acordos.',
          'Mudar prioridade sem explicar criterio.',
          'Conduzir reunioes sem fechamento de proximo passo.',
          'Responder sob pressao sem validar riscos essenciais.',
          'Postergar conversas criticas por desconforto situacional.',
        ],
      },
      leadershipStyle: [
        interpretation?.leadership || 'Lideranca orientada a resultado com foco em consistencia de execucao.',
        'Boa capacidade de mobilizar pessoas quando ha direcao clara.',
        'Evolui com rituais de feedback e monitoramento objetivo.',
      ],
      stressPattern: [
        'Acelera comunicacao em contextos de urgencia.',
        'Pode reduzir escuta ativa sob pressao elevada.',
        'Responde melhor quando ha clareza de prioridades.',
      ],
      motivators: [
        'Autonomia com responsabilidade clara.',
        'Objetivos mensuraveis e desafiadores.',
        'Reconhecimento por entrega consistente.',
        'Ambiente com colaboracao e boa comunicacao.',
      ],
      idealEnvironment: [
        interpretation?.environment || 'Ambiente com metas claras e ritmo de execucao sustentavel.',
        'Feedback frequente orientado a comportamento observavel.',
        'Processos com criterio de decisao conhecido.',
        'Espaco para colaboracao com ownership compartilhado.',
      ],
      conflictStyle: [
        'Busca resolver conflito com objetividade e foco em resultado.',
        'Prefere acordos claros com responsabilidade definida.',
        'Responde melhor quando conversa parte de fatos e impacto.',
      ],
      coachingTips: [
        'Definir um comportamento-chave por semana para pratica deliberada.',
        'Usar checklist de decisao em temas de alto impacto.',
        'Solicitar feedback quinzenal sobre comunicacao e execucao.',
        'Revisar resultados com base em indicadores curtos e objetivos.',
        'Consolidar aprendizados em ciclos de 30, 60 e 90 dias.',
      ],
      recommendedRoles: [
        'Lideranca comercial',
        'Gestao de operacoes',
        'Desenvolvimento de negocios',
        'Coordenacao de projetos',
        'Gestao de performance',
        'Relacionamento com clientes',
        'Planejamento e execucao',
        'Consultoria interna',
      ],
    },
    factors: {
      D: buildFactorSection('D', natural.D),
      I: buildFactorSection('I', natural.I),
      S: buildFactorSection('S', natural.S),
      C: buildFactorSection('C', natural.C),
    },
    snippets: {
      communication: {
        defaultDo: [
          'Comecar com objetivo e impacto esperado.',
          'Concluir com proximo passo, dono e prazo.',
          'Confirmar entendimento antes de encerrar reunioes.',
        ],
      },
      leadership: {
        principles: [
          'Definir direcao com criterio claro de sucesso.',
          'Equilibrar ritmo de entrega e qualidade.',
          'Delegar com checkpoints curtos e consistentes.',
        ],
        rituals: [
          'Revisao semanal de prioridades.',
          'Feedback quinzenal orientado a comportamento.',
          'Retro mensal de desempenho e aprendizado.',
        ],
      },
      stress: {
        signals: [
          'Reatividade aumentada em situacoes urgentes.',
          'Queda de clareza em alinhamentos importantes.',
          'Oscilacao de energia em ciclos intensos.',
        ],
        recovery: [
          'Redefinir prioridades com base em impacto.',
          'Fazer pausas estrategicas para restaurar clareza.',
          'Reforcar acordos com criterio objetivo.',
        ],
      },
      environment: {
        energizes: [
          'Autonomia com accountability definido.',
          'Metas claras com acompanhamento frequente.',
          'Cultura de colaboracao e aprendizado continuo.',
        ],
        drains: [
          'Ambiguidade prolongada de prioridades.',
          'Retrabalho recorrente sem criterio de qualidade.',
          'Falta de feedback sobre comportamento e resultado.',
        ],
      },
      career: {
        recommendationFramework: [
          'Alinhar funcao ao fator predominante e contexto de negocio.',
          'Combinar desafio tecnico com suporte comportamental.',
          'Evoluir em trilhas com metrica de performance clara.',
        ],
      },
    },
    plans: {
      days30: [
        'Semana 1: definir comportamento foco e contextos de aplicacao.',
        'Semana 2: coletar feedback de duas pessoas de confianca.',
        'Semana 3: repetir ajuste em reuniao, execucao e follow-up.',
        'Semana 4: consolidar rotina semanal de melhoria continua.',
      ],
      days60: [
        'Padronizar criterios de decisao para temas recorrentes.',
        'Aprimorar comunicacao com scripts por perfil de interlocutor.',
        'Executar ritual quinzenal de feedback e calibracao.',
        'Reduzir um red flag prioritario com plano pratico.',
      ],
      days90: [
        'Consolidar novo padrao em cenarios de alta pressao.',
        'Comparar evolucao com baseline inicial e ajustar metas.',
        'Definir objetivos para o proximo trimestre.',
        'Transferir aprendizados para equipe e lideranca.',
      ],
    },
    lgpd: {
      notice:
        'Este relatorio contem dados pessoais e deve ser usado exclusivamente para desenvolvimento comportamental, respeitando finalidade, consentimento e seguranca da informacao.',
      contact: 'suporte@insightdisc.app',
    },
  };

  model.profileNarrative = [
    `Combinacao identificada: ${profileKey}.`,
    `Fator primario: ${FACTOR_LABEL[primary]} (${natural[primary]}%).`,
    `Fator secundario: ${FACTOR_LABEL[secondary]} (${natural[secondary]}%).`,
    'A evolucao acontece quando os insights sao traduzidos em comportamentos observaveis e rotina de execucao.',
  ];

  model.charts = {
    natural,
    adapted,
    summary,
  };

  return model;
}

export default buildDiscReportModel;
