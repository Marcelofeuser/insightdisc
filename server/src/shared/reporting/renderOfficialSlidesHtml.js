const FACTORS = ["D", "I", "S", "C"];

const FACTOR_META = {
  D: {
    label: "Dominância",
    short: "Dominância",
    color: "#8c42ff",
    glow: "rgba(140, 66, 255, 0.34)",
    intro:
      "Orientação para resultados, assertividade e tomada de decisão rápida. Alta competitividade e foco em desafios.",
    quadrant: "Q1 — D",
    axis: "Ativo · Tarefa",
    relationship: {
      synergy: "Acelera decisões, competitividade e tração.",
      challenge: "Disputa por controle e baixa tolerância a ruídos.",
      strategy: "Definir papéis claros, foco em resultado e acordos diretos.",
    },
  },
  I: {
    label: "Influência",
    short: "Influência",
    color: "#ff4d96",
    glow: "rgba(255, 77, 150, 0.34)",
    intro:
      "Entusiasmo, persuasão e habilidade relacional. Comunicação expressiva e capacidade de engajar pessoas.",
    quadrant: "Q2 — I",
    axis: "Ativo · Pessoas",
    relationship: {
      synergy: "Energia, criatividade e entusiasmo compartilhados.",
      challenge: "Falta de foco, superficialidade e excesso de improviso.",
      strategy: "Definir metas concretas, prazos objetivos e checkpoints curtos.",
    },
  },
  S: {
    label: "Estabilidade",
    short: "Estabilidade",
    color: "#7bdc8b",
    glow: "rgba(123, 220, 139, 0.26)",
    intro:
      "Consistência, paciência e suporte à equipe. Preferência por ambientes previsíveis e relacionamentos duradouros.",
    quadrant: "Q3 — S",
    axis: "Passivo · Pessoas",
    relationship: {
      synergy: "Complementaridade entre ritmo, lealdade e consistência.",
      challenge: "Pressão excessiva, diferença de urgência e desconforto com confronto.",
      strategy: "Reduzir urgência, valorizar previsibilidade e alinhar expectativas.",
    },
  },
  C: {
    label: "Conformidade",
    short: "Conformidade",
    color: "#46b1ff",
    glow: "rgba(70, 177, 255, 0.28)",
    intro:
      "Análise, precisão e atenção a detalhes. Valorização de normas, processos e exatidão nas entregas.",
    quadrant: "Q4 — C",
    axis: "Passivo · Tarefa",
    relationship: {
      synergy: "Equilíbrio entre visão, análise e qualidade de execução.",
      challenge: "Ritmos diferentes e atrito entre velocidade e profundidade.",
      strategy: "Respeitar processos, apresentar dados e acordar critérios de qualidade.",
    },
  },
};

const PT_REPLACEMENTS = [
  ["Relatorio", "Relatório"],
  ["relatorio", "relatório"],
  ["deAnalise", "de Análise"],
  ["deAção", "de Ação"],
  ["deAcao", "de Ação"],
  ["Analise", "Análise"],
  ["analise", "análise"],
  ["Diagnostico", "Diagnóstico"],
  ["diagnostico", "diagnóstico"],
  ["Sintese", "Síntese"],
  ["sintese", "síntese"],
  ["Introducao", "Introdução"],
  ["introducao", "introdução"],
  ["Comunicacao", "Comunicação"],
  ["comunicacao", "comunicação"],
  ["Lideranca", "Liderança"],
  ["lideranca", "liderança"],
  ["Decisao", "Decisão"],
  ["decisao", "decisão"],
  ["estrategico", "estratégico"],
  ["Estrategico", "Estratégico"],
  ["estrategica", "estratégica"],
  ["Estrategica", "Estratégica"],
  ["dinamica", "dinâmica"],
  ["Dinamica", "Dinâmica"],
  ["adaptacao", "adaptação"],
  ["Adaptacao", "Adaptação"],
  ["avaliacao", "avaliação"],
  ["Avaliacao", "Avaliação"],
  ["gestao", "gestão"],
  ["Gestao", "Gestão"],
  ["acao", "ação"],
  ["Acao", "Ação"],
  ["acoes", "ações"],
  ["Acoes", "Ações"],
  ["Conexao", "Conexão"],
  ["conexao", "conexão"],
  ["confianca", "confiança"],
  ["Confianca", "Confiança"],
  ["colaboracao", "colaboração"],
  ["Colaboracao", "Colaboração"],
  ["integracao", "integração"],
  ["Integracao", "Integração"],
  ["rapida", "rápida"],
  ["Rapida", "Rápida"],
  ["tecnico-profissional", "técnico-profissional"],
  ["Tecnico-profissional", "Técnico-profissional"],
  ["aplicacao", "aplicação"],
  ["Aplicacao", "Aplicação"],
  ["conclusao", "conclusão"],
  ["Conclusao", "Conclusão"],
  ["pressao", "pressão"],
  ["Pressao", "Pressão"],
  ["criacao", "criação"],
  ["Criacao", "Criação"],
  ["autentico", "autêntico"],
  ["Autentico", "Autêntico"],
  ["percepcao", "percepção"],
  ["Percepcao", "Percepção"],
  ["negociacao", "negociação"],
  ["Negociacao", "Negociação"],
  ["pratica", "prática"],
  ["Pratica", "Prática"],
  ["consciencia", "consciência"],
  ["Consciencia", "Consciência"],
  ["eficiencia", "eficiência"],
  ["Eficiencia", "Eficiência"],
  ["dificeis", "difíceis"],
  ["dificil", "difícil"],
  ["saude", "saúde"],
  ["Saude", "Saúde"],
  ["metodo", "método"],
  ["Metodo", "Método"],
  ["metodica", "metódica"],
  ["Metodica", "Metódica"],
  ["analitico", "analítico"],
  ["Analitico", "Analítico"],
  ["analitica", "analítica"],
  ["Analitica", "Analítica"],
  ["intuicao", "intuição"],
  ["Intuicao", "Intuição"],
  ["visao", "visão"],
  ["Visao", "Visão"],
  ["construcao", "construção"],
  ["Construcao", "Construção"],
  ["excelencia", "excelência"],
  ["Excelencia", "Excelência"],
  ["padroes", "padrões"],
  ["Padroes", "Padrões"],
  ["constancia", "constância"],
  ["Constancia", "Constância"],
  ["agradavel", "agradável"],
  ["Agradavel", "Agradável"],
  ["proximo", "próximo"],
  ["Proximo", "Próximo"],
  ["proximos", "próximos"],
  ["Proximos", "Próximos"],
  ["criterio", "critério"],
  ["Criterio", "Critério"],
  ["criterios", "critérios"],
  ["Criterios", "Critérios"],
  ["ruido", "ruído"],
  ["Ruido", "Ruído"],
  ["direcao", "direção"],
  ["Direcao", "Direção"],
  ["seguranca", "segurança"],
  ["Seguranca", "Segurança"],
  ["tensao", "tensão"],
  ["Tensao", "Tensão"],
  ["padrao", "padrão"],
  ["Padrao", "Padrão"],
  ["reforcado", "reforçado"],
  ["Reforcado", "Reforçado"],
  ["reforcada", "reforçada"],
  ["Reforcada", "Reforçada"],
  ["cobranca", "cobrança"],
  ["Cobranca", "Cobrança"],
  ["visivel", "visível"],
  ["Visivel", "Visível"],
  ["coesao", "coesão"],
  ["Coesao", "Coesão"],
  ["precisao", "precisão"],
  ["Precisao", "Precisão"],
  ["influencia", "influência"],
  ["Influencia", "Influência"],
  ["cooperacao", "cooperação"],
  ["Cooperacao", "Cooperação"],
  ["expressao", "expressão"],
  ["Expressao", "Expressão"],
  ["persuasao", "persuasão"],
  ["Persuasao", "Persuasão"],
  ["paciencia", "paciência"],
  ["Paciencia", "Paciência"],
  ["possivel", "possível"],
  ["Possivel", "Possível"],
  ["nao", "não"],
  ["Nao", "Não"],
  ["tres", "três"],
  ["Tres", "Três"],
  ["alem", "além"],
  ["Alem", "Além"],
  ["aderencia", "aderência"],
  ["Aderencia", "Aderência"],
  ["referencia", "referência"],
  ["Referencia", "Referência"],
  ["referencias", "referências"],
  ["Referencias", "Referências"],
  ["revisao", "revisão"],
  ["Revisao", "Revisão"],
  ["criticos", "críticos"],
  ["Criticos", "Críticos"],
  ["vinculo", "vínculo"],
  ["Vinculo", "Vínculo"],
  ["vinculos", "vínculos"],
  ["Vinculos", "Vínculos"],
  ["consistencia", "consistência"],
  ["Consistencia", "Consistência"],
  ["manutencao", "manutenção"],
  ["Manutencao", "Manutenção"],
  ["silencio", "silêncio"],
  ["Silencio", "Silêncio"],
  ["acomodacao", "acomodação"],
  ["Acomodacao", "Acomodação"],
  ["definicao", "definição"],
  ["Definicao", "Definição"],
  ["situacao", "situação"],
  ["Situacao", "Situação"],
  ["relacao", "relação"],
  ["Relacao", "Relação"],
  ["funcoes", "funções"],
  ["Funcoes", "Funções"],
  ["facilitacao", "facilitação"],
  ["Facilitacao", "Facilitação"],
  ["coordenacao", "coordenação"],
  ["Coordenacao", "Coordenação"],
  ["tipica", "típica"],
  ["Tipica", "Típica"],
  ["saudavel", "saudável"],
  ["Saudavel", "Saudável"],
  ["hesitacao", "hesitação"],
  ["Hesitacao", "Hesitação"],
  ["necessario", "necessário"],
  ["Necessario", "Necessário"],
  ["necessaria", "necessária"],
  ["Necessaria", "Necessária"],
  ["temporaria", "temporária"],
  ["Temporaria", "Temporária"],
  ["previsivel", "previsível"],
  ["Previsivel", "Previsível"],
  ["diaria", "diária"],
  ["Diaria", "Diária"],
  ["negociaveis", "negociáveis"],
  ["Negociaveis", "Negociáveis"],
  ["observavel", "observável"],
  ["Observavel", "Observável"],
  ["responsabilizacao", "responsabilização"],
  ["Responsabilizacao", "Responsabilização"],
  ["delegacao", "delegação"],
  ["Delegacao", "Delegação"],
  ["interpretacao", "interpretação"],
  ["Interpretacao", "Interpretação"],
  ["evolucao", "evolução"],
  ["Evolucao", "Evolução"],
  ["critica", "crítica"],
  ["Critica", "Crítica"],
  ["priorizacao", "priorização"],
  ["Priorizacao", "Priorização"],
  ["exposicao", "exposição"],
  ["Exposicao", "Exposição"],
  ["pratico", "prático"],
  ["Pratico", "Prático"],
  ["decisoes", "decisões"],
  ["Decisoes", "Decisões"],
];

const SUMMARY_CONTENT = {
  business: {
    title: "Sumário Executivo",
    lead:
      "Este relatório cobre todos os eixos do perfil comportamental DISC, do diagnóstico à aplicação prática em liderança, comunicação e desenvolvimento.",
    items: [
      {
        index: "01",
        title: "Visão Geral & Gráficos DISC",
        description: "Radar, barras, natural vs. adaptado, intensidade e quadrante",
      },
      {
        index: "02",
        title: "Índices & Combinação DISC",
        description: "Liderança, comunicação, execução, estabilidade emocional e perfis",
      },
      {
        index: "03",
        title: "Comportamento & Estilo",
        description: "Pontos fortes, motivadores, comunicação, liderança, pressão e percepção externa",
      },
      {
        index: "04",
        title: "Desenvolvimento & Plano de Ação",
        description: "DNA, matriz, carreira, crescimento, plano de ação, estilos avançados, relações e recomendações",
      },
    ],
  },
  professional: {
    title: "Sumário Executivo",
    lead:
      "Este relatório cobre todos os eixos do perfil comportamental DISC, do diagnóstico à aplicação prática em liderança, comunicação e desenvolvimento.",
    items: [
      {
        index: "01",
        title: "Visão Geral & Gráficos DISC",
        description: "Radar, barras, natural vs. adaptado, intensidade e quadrante",
      },
      {
        index: "02",
        title: "Índices & Combinação DISC",
        description: "Liderança, comunicação, execução, estabilidade emocional e perfis",
      },
      {
        index: "03",
        title: "Comportamento & Estilo",
        description: "Pontos fortes, motivadores, comunicação, liderança, pressão e percepção externa",
      },
      {
        index: "04",
        title: "Desenvolvimento & Plano de Ação",
        description: "Carreira, plano de ação de 90 dias, recomendações executivas e síntese final",
      },
    ],
  },
  personal: {
    title: "Sumário Executivo",
    lead:
      "Este relatório apresenta os principais eixos do perfil comportamental DISC, com foco em autoconhecimento, comunicação, adaptação ao ambiente e desenvolvimento prático.",
    items: [
      {
        index: "01",
        title: "Fundamentos & Visão Geral",
        description: "Introdução ao modelo DISC e leitura inicial das quatro dimensões do perfil",
      },
      {
        index: "02",
        title: "Gráficos & Intensidade",
        description: "Barras, natural vs. adaptado, mapa de quadrante e leitura de energia",
      },
      {
        index: "03",
        title: "Estilo Pessoal & Ambiente",
        description: "Forças, limitações, motivadores e comunicação no contexto de melhor performance",
      },
      {
        index: "04",
        title: "Comunicação, Pressão & Síntese",
        description: "Tomada de decisão, comportamento sob pressão e fechamento conclusivo",
      },
    ],
  },
};

const PROFILE_EDITORIAL = {
  IS: {
    strengths: {
      Empatia: "Percebe nuances emocionais e ajusta o tom com sensibilidade, favorecendo abertura, confiança e cooperação.",
      "Engajamento de pessoas": "Mobiliza o grupo com presença calorosa, linguagem positiva e senso de pertencimento.",
      "Comunicação acolhedora": "Facilita diálogo, reduz resistências e cria ambiente seguro para alinhamentos mais honestos.",
      "Integração de equipe": "Conecta perfis diferentes, aproxima interesses e sustenta colaboração entre áreas.",
      "Manutenção de clima": "Preserva estabilidade relacional mesmo em períodos intensos, evitando desgaste desnecessário.",
      "Construção de vínculo": "Desenvolve relações duradouras com base em escuta, consistência e confiabilidade.",
    },
    risks: {
      "Evitar conversa difícil": "Pode adiar ajustes críticos e permitir que ruídos pequenos cresçam antes de serem tratados.",
      "Agradar além do necessário": "O excesso de concessão pode enfraquecer limites, prioridades e clareza de cobrança.",
      "Dificuldade de cobrança firme": "Corre o risco de preservar o vínculo no curto prazo e perder tração na execução.",
      "Hesitação em conflito": "Quando evita tensão legítima, tende a alongar decisões e aumentar ambiguidade no time.",
      "Baixa assertividade em limite": "Sem marcar fronteiras de forma clara, pode assumir demandas demais e perder foco.",
      "Adiar decisão desconfortável": "Decisões sensíveis podem ser postergadas além do ideal, elevando custo relacional e operacional.",
    },
    balanced: {
      Empatia: "Lê o ambiente com rapidez e percebe como cada pessoa recebe a mensagem, ajustando a abordagem sem perder proximidade.",
      "Conexão humana": "Constrói confiança com naturalidade e cria sensação de acolhimento nas interações profissionais.",
      Engajamento: "Energiza conversas, aproxima pessoas e estimula adesão quando o grupo precisa de mobilização.",
      "Construção de vínculo": "Sustenta relações estáveis e colaborativas, o que favorece continuidade e parceria no médio prazo.",
    },
    pressure: {
      "Queda de assertividade": "Sob tensão, tende a suavizar demais a mensagem e adiar posicionamentos que exigem firmeza.",
      "Silêncio excessivo": "Pode retrair para evitar atrito, deixando dúvidas importantes sem tratamento imediato.",
      "Acomodação temporária": "Aceita soluções medianas por mais tempo do que deveria para preservar a harmonia do ambiente.",
      "Evitação de conversa difícil": "Fica mais propenso a contornar o confronto direto, mesmo quando a conversa é necessária.",
    },
    perception: {
      peers:
        "Os pares costumam perceber alguém acessível, cooperativo e agregador, que facilita alinhamento sem gerar atrito desnecessário.",
      reports:
        "Os liderados tendem a perceber escuta genuína, apoio e presença humana, mas podem esperar mais firmeza em cobranças críticas.",
      leaders:
        "Os superiores costumam perceber confiabilidade relacional, boa capacidade de engajamento e potencial para liderar com consistência.",
    },
    negotiation: {
      negotiation:
        "Negocia buscando equilíbrio entre resultado e vínculo. Prefere construir acordos sustentáveis, reduzindo tensão e preservando colaboração.",
      sales:
        "Vende com proximidade, escuta e confiança. Tem força em relacionamento consultivo, fidelização e leitura fina de necessidades do cliente.",
      learning:
        "Aprende melhor em contextos aplicados, com exemplos concretos, trocas estruturadas e espaço para testar o conteúdo sem exposição excessiva.",
    },
    communication: {
      intro: "Calorosa, acolhedora e orientada a criar segurança relacional sem perder clareza.",
      tone: "Tom colaborativo, positivo e respeitoso, com foco em aproximação e vínculo de confiança.",
      pace: "Ritmo estável, com clareza progressiva e cuidado ao expor a mensagem.",
      channel: "Prefere conversas diretas, em ambiente seguro, com contexto humano, objetivo claro e próximo passo definido.",
      listening: "Escuta ativa, validando percepções antes de posicionar encaminhamentos e expectativas.",
      decisions: [
        "Considera o impacto da decisão sobre pessoas, clima e continuidade do trabalho.",
        "Decide melhor quando combina critério objetivo com tempo curto de reflexão e alinhamento.",
        "Precisa explicitar limites com rapidez para não adiar decisões desconfortáveis além do necessário.",
      ],
    },
    dna: {
      Empatia: "Percebe sinais emocionais com rapidez e ajusta presença, linguagem e aproximação de forma consistente.",
      "Conexão humana": "Constrói relações de confiança sem esforço aparente, favorecendo abertura e cooperação.",
      Engajamento: "Mobiliza pessoas com energia estável, tom positivo e capacidade de gerar adesão.",
      "Construção de vínculo": "Sustenta parcerias duradouras ao combinar presença, constância e senso de cuidado.",
    },
    careers: {
      "Relacionamento com clientes":
        "Área aderente para transformar vínculo em confiança comercial, retenção e expansão de relacionamento de longo prazo.",
      "People e cultura":
        "Tem boa leitura humana para fortalecer clima, integração, comunicação interna e experiências consistentes de equipe.",
      Treinamento:
        "Consegue ensinar com acolhimento, ritmo didático e linguagem acessível, favorecendo adesão e transferência prática do conteúdo.",
      "Customer success":
        "Combina escuta, constância e proximidade para acompanhar jornada, reduzir atrito e ampliar percepção de valor do cliente.",
    },
    developmentFocus: {
      Assertividade:
        "Transformar cuidado em posicionamento claro, com pedidos objetivos, limite explícito e fechamento de responsabilidade.",
      "Cobrança saudável":
        "Cobrar sem perder respeito, mantendo cadência, critério e acompanhamento visível da entrega.",
      "Decisão em contexto difícil":
        "Reduzir hesitação diante de desconforto e escolher com mais rapidez quando o cenário pede firmeza.",
      "Posicionamento sob pressão":
        "Sustentar clareza e presença emocional mesmo quando houver tensão, urgência ou frustração da equipe.",
    },
    growth: {
      Autoconhecimento:
        "Mapeie os contextos em que o desejo de preservar o clima reduz sua firmeza. O ganho vem de perceber esse padrão cedo.",
      "Mentoria e Coaching":
        "Use acompanhamento estruturado para treinar cobrança, conversas difíceis e tomada de decisão com mais segurança.",
      "Relacionamentos Estratégicos":
        "Direcione sua força relacional para alianças que ampliem influência, cooperação e execução entre áreas-chave.",
      "Excelência Sustentável":
        "Seu melhor desempenho aparece quando sensibilidade, constância e direção trabalham juntas em torno de prioridades claras.",
    },
    advanced: {
      leadership: [
        "Liderança eficaz combina acolhimento, direção clara e responsabilização visível da equipe.",
        "Resultados sustentáveis exigem equilíbrio entre clima saudável, critério de decisão e acompanhamento disciplinado.",
        "Rituais curtos de alinhamento, follow-up e feedback reduzem ruído e evitam acomodação.",
      ],
      communication: [
        ["1:1 com liderados", "Abrir com contexto, explicitar expectativa e fechar com próximo passo observável."],
        ["Reuniões de equipe", "Conduzir com cadência, reforçar prioridades e dar espaço para alinhamentos sem perder direção."],
        ["Com perfil C", "Apresentar dados, critérios e passos de decisão."],
        ["Com perfil S", "Ser gentil, dar tempo de resposta e reduzir urgência desnecessária."],
      ],
    },
    recommendations: {
      business: [
        {
          title: "Liderança com Direção Clara",
          text: "Transforme acolhimento em tração com rituais curtos de alinhamento, cobrança e decisão explícita.",
        },
        {
          title: "Inteligência Emocional Aplicada",
          text: "Use prioridades, limites e critérios objetivos para evitar acomodação quando a pressão aumentar.",
        },
        {
          title: "Clientes, People & Cultura",
          text: "Sua força relacional cresce quando é canalizada para fidelização, clima saudável e coordenação entre áreas.",
        },
        {
          title: "Resultado Sustentável",
          text: "Combine sensibilidade com firmeza para sustentar performance sem perder coesão, confiança e consistência.",
        },
      ],
      professional: [
        {
          title: "Liderança com Mais Firmeza",
          text: "Reforce combinados, prazos e checkpoints para traduzir cuidado em clareza de execução.",
        },
        {
          title: "Autocontrole sob Pressão",
          text: "Nomeie prioridades e trate tensões cedo para não transferir a decisão crítica para depois.",
        },
        {
          title: "Comunicação entre Perfis",
          text: "Ajuste ritmo e profundidade conforme o interlocutor para reduzir ruído e aumentar aderência.",
        },
        {
          title: "Crescimento Consistente",
          text: "Seu salto está em unir vínculo, cobrança saudável e posicionamento claro nas conversas importantes.",
        },
      ],
    },
  },
};

const VARIANT_CONFIG = {
  business: {
    label: "Business",
    reportType: "premium",
    sequence: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
  },
  professional: {
    label: "Professional",
    reportType: "professional",
    sequence: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 19, 21, 24, 25],
  },
  personal: {
    label: "Personal",
    reportType: "standard",
    sequence: [1, "personal-summary", 3, 4, 5, 6, 10, 11, 12, 14, 25],
  },
};
const OFFICIAL_INSTITUTIONAL_EMAIL = "contato@insightdisc.com";

function safeText(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeEmail(value, fallback = "-") {
  const text = safeText(value, fallback);
  if (!text || !text.includes("@")) return text;
  const [localPartRaw, ...domainParts] = text.split("@");
  const localPart = localPartRaw.replace(/\s+/g, "");
  const domainRaw = domainParts.join("@").trim();
  const domain = domainRaw.replace(/\s+/g, ".").replace(/\.{2,}/g, ".");
  return `${localPart}@${domain}`;
}

function normalizeInstitutionalEmail(value, fallback = OFFICIAL_INSTITUTIONAL_EMAIL) {
  const email = normalizeEmail(value, "").toLowerCase();
  if (!email || !email.includes("@")) return fallback;
  if (email.endsWith("@insightdisc.app") || email.endsWith("@insightdisc.com")) {
    return OFFICIAL_INSTITUTIONAL_EMAIL;
  }
  return email;
}

function getProfileKey(model) {
  return `${safeText(model?.profile?.primary)}${safeText(model?.profile?.secondary)}` || "DISC";
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const text = safeText(value);
    if (text) return text;
  }
  return "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fixPt(value, fallback = "") {
  let text = safeText(value, fallback);
  if (!text) return "";
  for (const [source, target] of PT_REPLACEMENTS) {
    if (/^[A-Za-zÀ-ÿ-]+$/.test(source)) {
      text = text.replace(new RegExp(`(?<![A-Za-zÀ-ÿ])${escapeRegExp(source)}(?![A-Za-zÀ-ÿ])`, "g"), target);
      continue;
    }
    text = text.replaceAll(source, target);
  }
  text = text.replace(/ de(?=[A-ZÁ-Ý])/g, " de ");
  text = text.replace(/\s{2,}/g, " ").trim();
  return text;
}

function fixList(values, max = values?.length || 0) {
  return (Array.isArray(values) ? values : [])
    .map((value) => fixPt(value))
    .filter(Boolean)
    .slice(0, max || undefined);
}

function clamp(value, min = 0, max = 100) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function formatDate(value) {
  const raw = safeText(value);
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return fixPt(raw);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatPercent(value) {
  return `${clamp(value)}%`;
}

function factorEntries(scoreMap = {}) {
  return FACTORS.map((factor) => ({
    factor,
    label: FACTOR_META[factor].label,
    short: FACTOR_META[factor].short,
    color: FACTOR_META[factor].color,
    glow: FACTOR_META[factor].glow,
    value: clamp(scoreMap[factor]),
  }));
}

function sortedFactors(scoreMap = {}) {
  return factorEntries(scoreMap).sort((left, right) => right.value - left.value);
}

function percentileFromScore(value) {
  return clamp(Math.round(Number(value || 0) * 0.9 + 12), 5, 99);
}

function factorSignature(entries = []) {
  return entries
    .map((entry) => {
      if (entry.value >= 70) return `${entry.factor}↑↑`;
      if (entry.value >= 50) return `${entry.factor}↑`;
      if (entry.value <= 30) return `${entry.factor}↓`;
      return `${entry.factor}→`;
    })
    .join(" ");
}

function calcIndices(scores) {
  const natural = scores?.natural || {};
  const adaptation = clamp(100 - Number(scores?.adaptationCost || 0) * 3);
  return {
    leadership: clamp(natural.D * 0.38 + natural.I * 0.34 + natural.S * 0.14 + natural.C * 0.14),
    communication: clamp(natural.I * 0.48 + natural.S * 0.22 + natural.D * 0.18 + natural.C * 0.12),
    execution: clamp(natural.D * 0.26 + natural.S * 0.26 + natural.C * 0.28 + natural.I * 0.2),
    stability: clamp(natural.S * 0.38 + natural.C * 0.22 + adaptation * 0.4),
  };
}

function buildContext(model, variant) {
  const config = VARIANT_CONFIG[variant];
  const meta = model?.meta || {};
  const participant = model?.participant || {};
  const branding = model?.branding || {};
  const issuerOrganization = firstNonEmpty(meta.issuerOrganization, participant.company, branding.company_name, "InsightDISC");
  const institutionalEmail = normalizeInstitutionalEmail(
    firstNonEmpty(meta.institutionalEmail, branding.support_email, "contato@insightdisc.com")
  );
  const issuerContact = firstNonEmpty(meta.issuerContact, meta.responsibleEmail, institutionalEmail);
  return {
    variant,
    variantLabel: config.label,
    reportTitle: fixPt(firstNonEmpty(meta.reportTitle, "Relatório de Análise Comportamental DISC")),
    reportSubtitle: fixPt(
      firstNonEmpty(
        meta.reportSubtitle,
        "Diagnóstico comportamental completo com benchmark, comunicação, liderança, riscos, carreira e plano de desenvolvimento"
      )
    ),
    participantName: fixPt(firstNonEmpty(participant.name, "Avaliado")),
    participantEmail: normalizeEmail(participant.email, "-"),
    participantCompany: fixPt(firstNonEmpty(participant.company, issuerOrganization, "-")),
    participantRole: fixPt(firstNonEmpty(participant.role, participant.jobTitle, "-")),
    reportId: fixPt(firstNonEmpty(meta.reportId, participant.assessmentId, "-")),
    assessmentDate: formatDate(firstNonEmpty(participant.assessmentDate, meta.generatedAt)),
    issueDate: formatDate(firstNonEmpty(meta.generatedAt, new Date().toISOString())),
    responsibleName: fixPt(firstNonEmpty(meta.responsibleName, "Equipe InsightDISC")),
    responsibleRole: fixPt(firstNonEmpty(meta.responsibleRole, "Especialista em Análise Comportamental")),
    issuerOrganization: fixPt(issuerOrganization),
    issuerContact: issuerContact.includes("@") ? normalizeInstitutionalEmail(issuerContact, institutionalEmail) : fixPt(issuerContact, "-"),
    brandLine: "InsightDISC – Plataforma de Análise Comportamental",
    brandName: fixPt(firstNonEmpty(branding.company_name, "InsightDISC")),
    brandWebsite: safeText(firstNonEmpty(branding.website, "www.insightdisc.app")),
    brandEmail: institutionalEmail,
    brandInstagram: safeText(firstNonEmpty(branding.instagram, "@insightdisc")),
    supportName: "Verônica Feuser",
    supportRole: "Psicanalista",
    supportTitle: "Supervisão e respaldo técnico-profissional",
    disclaimer:
      "Este relatório foi desenvolvido para apoio à análise comportamental, autoconhecimento, desenvolvimento pessoal e profissional, comunicação, liderança e tomada de decisão. Este material não substitui avaliação clínica, psicológica ou psiquiátrica.",
  };
}

function renderList(items = [], className = "bullet-list", limit = items.length) {
  const rows = fixList(items, limit)
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  return `<ul class="${className}">${rows}</ul>`;
}

function renderInfoStat(entry, subtitle) {
  return `
    <article class="score-tile" style="--accent:${entry.color}; --glow:${entry.glow};">
      <div class="score-tile__value">${escapeHtml(formatPercent(entry.value))}</div>
      <div class="score-tile__label">${escapeHtml(entry.label)}</div>
      <div class="score-tile__meta">${escapeHtml(subtitle)}</div>
    </article>
  `;
}

function renderGauge(value, label, note, color) {
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamp(value) / 100) * circumference;
  return `
    <article class="gauge-card" style="--accent:${color};">
      <svg class="gauge-card__chart" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="${radius}" class="gauge-card__track"></circle>
        <circle
          cx="60"
          cy="60"
          r="${radius}"
          class="gauge-card__progress"
          style="stroke-dasharray:${dash} ${circumference};"
        ></circle>
      </svg>
      <div class="gauge-card__value">${escapeHtml(formatPercent(value))}</div>
      <div class="gauge-card__label">${escapeHtml(label)}</div>
      <p class="gauge-card__note">${escapeHtml(note)}</p>
    </article>
  `;
}

function renderGroupedBarChart(natural = {}, adapted = {}) {
  const chartWidth = 620;
  const chartHeight = 330;
  const baseY = 285;
  const maxHeight = 180;
  const groupGap = 130;
  const barWidth = 34;
  const startX = 96;
  const lines = [0, 25, 50, 75, 100];

  const grid = lines
    .map((line) => {
      const y = baseY - (line / 100) * maxHeight;
      return `<line x1="72" y1="${y}" x2="570" y2="${y}" class="chart-grid"></line>
      <text x="50" y="${y + 4}" class="chart-axis">${line}</text>`;
    })
    .join("");

  const bars = FACTORS.map((factor, index) => {
    const x = startX + index * groupGap;
    const naturalValue = clamp(natural[factor]);
    const adaptedValue = clamp(adapted[factor]);
    const naturalHeight = (naturalValue / 100) * maxHeight;
    const adaptedHeight = (adaptedValue / 100) * maxHeight;
    return `
      <rect x="${x}" y="${baseY - naturalHeight}" width="${barWidth}" height="${naturalHeight}" rx="8" class="chart-bar chart-bar--natural" style="fill:${FACTOR_META[factor].color};"></rect>
      <rect x="${x + 44}" y="${baseY - adaptedHeight}" width="${barWidth}" height="${adaptedHeight}" rx="8" class="chart-bar chart-bar--adapted" style="fill:#b89aff;"></rect>
      <text x="${x + 17}" y="${baseY - naturalHeight - 10}" class="chart-value">${naturalValue}</text>
      <text x="${x + 61}" y="${baseY - adaptedHeight - 10}" class="chart-value chart-value--alt">${adaptedValue}</text>
      <text x="${x + 30}" y="${baseY + 34}" class="chart-label">${factor}</text>
    `;
  }).join("");

  return `
    <div class="chart-card">
      <div class="chart-card__legend">
        <span><i class="legend-dot legend-dot--solid"></i> Natural</span>
        <span><i class="legend-dot legend-dot--ghost"></i> Adaptado</span>
      </div>
      <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="chart-svg" role="img" aria-label="Gráfico comparativo entre perfil natural e adaptado">
        ${grid}
        ${bars}
      </svg>
    </div>
  `;
}

function renderIntensityChart(entries = []) {
  const chartWidth = 560;
  const chartHeight = 310;
  const baseY = 250;
  const maxHeight = 180;
  const groupGap = 112;
  const barWidth = 60;
  const grid = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    .map((value) => {
      const y = baseY - (value / 100) * maxHeight;
      return `<line x1="38" y1="${y}" x2="520" y2="${y}" class="chart-grid"></line>`;
    })
    .join("");
  const bars = entries
    .map((entry, index) => {
      const height = (entry.value / 100) * maxHeight;
      const x = 70 + index * groupGap;
      return `
        <rect x="${x}" y="${baseY - height}" width="${barWidth}" height="${height}" rx="10" fill="${entry.color}"></rect>
        <text x="${x + 30}" y="${baseY - height - 12}" class="chart-value">${entry.value}%</text>
        <text x="${x + 30}" y="${baseY + 34}" class="chart-label">${entry.factor}</text>
      `;
    })
    .join("");
  return `
    <div class="chart-card chart-card--compact">
      <svg viewBox="0 0 ${chartWidth} ${chartHeight}" class="chart-svg" role="img" aria-label="Gráfico de intensidade por fator">
        ${grid}
        ${bars}
      </svg>
    </div>
  `;
}

function renderWheel() {
  return `
    <div class="disc-wheel-card">
      <div class="disc-wheel-card__eyebrow">DISC</div>
      <div class="disc-wheel-card__sub">Behavioral Model</div>
      <div class="disc-wheel">
        <span class="disc-wheel__quadrant disc-wheel__quadrant--d">D</span>
        <span class="disc-wheel__quadrant disc-wheel__quadrant--i">I</span>
        <span class="disc-wheel__quadrant disc-wheel__quadrant--s">S</span>
        <span class="disc-wheel__quadrant disc-wheel__quadrant--c">C</span>
      </div>
    </div>
  `;
}

function renderQuadrantMap(entries = []) {
  const natural = Object.fromEntries(entries.map((entry) => [entry.factor, entry.value]));
  const x = clamp(50 + (Number(natural.D || 0) - Number(natural.C || 0)) * 0.7, 10, 90);
  const y = clamp(50 - (Number(natural.I || 0) - Number(natural.S || 0)) * 0.55, 10, 90);
  return `
    <div class="quadrant-map">
      <div class="quadrant-map__grid">
        <div class="quadrant-map__cell quadrant-map__cell--d">
          <strong>${FACTOR_META.D.quadrant}</strong>
          <span>${FACTOR_META.D.axis}</span>
        </div>
        <div class="quadrant-map__cell quadrant-map__cell--i">
          <strong>${FACTOR_META.I.quadrant}</strong>
          <span>${FACTOR_META.I.axis}</span>
        </div>
        <div class="quadrant-map__cell quadrant-map__cell--s">
          <strong>${FACTOR_META.S.quadrant}</strong>
          <span>${FACTOR_META.S.axis}</span>
        </div>
        <div class="quadrant-map__cell quadrant-map__cell--c">
          <strong>${FACTOR_META.C.quadrant}</strong>
          <span>${FACTOR_META.C.axis}</span>
        </div>
        <div class="quadrant-map__marker" style="left:${x}%; top:${y}%;"></div>
      </div>
    </div>
  `;
}

function renderBenchmarkBars(rows = []) {
  return `
    <div class="benchmark-bars">
      ${rows
        .map((row) => {
          const value = percentileFromScore(row.score);
          return `
            <article class="benchmark-row">
              <div class="benchmark-row__head">
                <span>${escapeHtml(fixPt(row.label))}</span>
                <strong>${value}</strong>
              </div>
              <div class="benchmark-row__track">
                <span class="benchmark-row__fill" style="width:${value}%;"></span>
              </div>
              <div class="benchmark-row__foot">Percentil ${value}%</div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderScaleBars(entries = []) {
  return `
    <div class="scale-bars">
      ${entries
        .map(
          (entry) => `
            <div class="scale-row">
              <div class="scale-row__label">${entry.factor} · ${escapeHtml(entry.label)}</div>
              <div class="scale-row__track">
                <span class="scale-row__fill" style="width:${entry.value}%; background:${entry.color};"></span>
              </div>
              <div class="scale-row__value">${entry.value}</div>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTimeline(plans = {}) {
  const blocks = [
    {
      title: "Fase 1",
      subtitle: "Diagnóstico e consciência",
      items: fixList(plans.days30, 3),
      className: "timeline-phase--one",
    },
    {
      title: "Fase 2",
      subtitle: "Prática e ajuste",
      items: fixList(plans.days60, 3),
      className: "timeline-phase--two",
    },
    {
      title: "Fase 3",
      subtitle: "Consolidação e resultados",
      items: fixList(plans.days90, 3),
      className: "timeline-phase--three",
    },
  ];

  return `
    <div class="timeline-90">
      <svg class="timeline-90__road" viewBox="0 0 1040 310" aria-hidden="true">
        <path d="M20 180 C 120 180, 160 290, 270 290 S 410 120, 520 120 640 290, 770 290 900 180, 1020 180" class="timeline-90__path"></path>
        <path d="M20 180 C 120 180, 160 290, 270 290 S 410 120, 520 120 640 290, 770 290 900 180, 1020 180" class="timeline-90__path timeline-90__path--dashed"></path>
      </svg>
      ${blocks
        .map(
          (block, index) => `
            <article class="timeline-phase ${block.className}">
              <div class="timeline-phase__pin">
                <span>${index + 1}</span>
              </div>
              <div class="timeline-phase__title">${escapeHtml(block.title)}</div>
              <div class="timeline-phase__subtitle">${escapeHtml(block.subtitle)}</div>
              ${renderList(block.items, "timeline-phase__list", 3)}
            </article>
          `
        )
        .join("")}
    </div>
  `;
}

function renderPageFrame({ className = "", body, pageNumber = "", footerBrand = true, pageLabel = "" }) {
  return `
    <section class="page ${className}" data-page-label="${escapeHtml(pageLabel)}">
      <div class="page-shell">
        <div class="page-aura page-aura--one" aria-hidden="true"></div>
        <div class="page-aura page-aura--two" aria-hidden="true"></div>
        <div class="page-content">${body}</div>
        ${
          footerBrand
            ? `
          <footer class="slide-footer">
            <div class="slide-footer__brand">InsightDISC – Plataforma de Análise Comportamental</div>
            <div class="slide-footer__page">${escapeHtml(pageNumber)}</div>
          </footer>
        `
            : ""
        }
      </div>
    </section>
  `;
}

function renderInstitutionalCover(context) {
  return renderPageFrame({
    className: "page--institutional-cover",
    footerBrand: false,
    pageLabel: "capa-institucional",
    body: `
      <div class="institutional-cover">
        <div class="institutional-cover__mesh" aria-hidden="true"></div>
        <div class="institutional-cover__hero">
          <img class="institutional-cover__logo" src="assets/insightdisc-logo-institutional.png" alt="Logo InsightDISC" />
          <div class="institutional-cover__kicker">${escapeHtml(context.brandName)}</div>
          <h1 class="institutional-cover__title">${escapeHtml(context.reportTitle)}</h1>
          <p class="institutional-cover__subtitle">${escapeHtml(context.brandLine)}</p>
          <div class="institutional-cover__mode">Modo ${escapeHtml(context.variantLabel)}</div>
        </div>

        <div class="institutional-cover__grid">
          <article class="institutional-card institutional-card--identity">
            <div class="institutional-card__label">Dados do avaliado</div>
            <div class="institutional-card__name">${escapeHtml(context.participantName)}</div>
            <div class="institutional-card__meta-grid">
              <div><span>E-mail</span><strong>${escapeHtml(context.participantEmail)}</strong></div>
              <div><span>Empresa</span><strong>${escapeHtml(context.participantCompany)}</strong></div>
              <div><span>Cargo / Função</span><strong>${escapeHtml(context.participantRole)}</strong></div>
              <div><span>Data da avaliação</span><strong>${escapeHtml(context.assessmentDate)}</strong></div>
              <div><span>Data de emissão</span><strong>${escapeHtml(context.issueDate)}</strong></div>
              <div><span>Código / ID do relatório</span><strong>${escapeHtml(context.reportId)}</strong></div>
            </div>
          </article>

          <div class="institutional-cover__stack">
            <article class="institutional-card">
              <div class="institutional-card__label">Emissão / aplicação</div>
              <strong>${escapeHtml(context.responsibleName)}</strong>
              <p>${escapeHtml(context.responsibleRole)}</p>
              <p><span>Organização emissora</span> ${escapeHtml(context.issuerOrganization)}</p>
              <p><span>Contato</span> ${escapeHtml(context.issuerContact)}</p>
            </article>

            <article class="institutional-card institutional-card--dual">
              <div class="institutional-subblock">
                <div class="institutional-card__label">Institucional</div>
                <strong>${escapeHtml(context.brandLine)}</strong>
                <p>${escapeHtml(context.brandWebsite)}</p>
              </div>
              <div class="institutional-subblock institutional-subblock--support">
                <div class="institutional-card__label">Respaldo técnico-profissional</div>
                <strong>${escapeHtml(context.supportName)}</strong>
                <p>${escapeHtml(context.supportRole)}</p>
                <p>${escapeHtml(context.supportTitle)}</p>
              </div>
            </article>
          </div>
        </div>

        <p class="institutional-cover__note">${escapeHtml(context.disclaimer)}</p>
      </div>
    `,
  });
}

function renderMasterCover(model, context) {
  const entries = factorEntries(model.scores?.natural);
  const variantKicker = `INSIGHTDISC · RELATÓRIO ${context.variantLabel.toUpperCase()}`;
  return renderPageFrame({
    className: "page--master-cover",
    footerBrand: false,
    pageLabel: "1",
    body: `
      <div class="master-cover">
        <div class="master-cover__visual">
          <div class="master-cover__portrait" style="background-image:url('assets/report-native/cover-portrait.png');"></div>
        </div>
        <div class="master-cover__content">
          <div class="master-cover__kicker">${escapeHtml(variantKicker)}</div>
          <h1 class="master-cover__title">Relatório Comportamental DISC</h1>
          <div class="master-cover__line">${escapeHtml(context.variantLabel)}</div>
          <p class="master-cover__lead">
            ${escapeHtml(
              fixPt(
                firstNonEmpty(
                  model.profileContent?.summary,
                  "Análise completa do perfil comportamental com foco em autoconhecimento, comunicação, liderança e performance."
                )
              )
            )}
          </p>

          <div class="master-cover__score-panel">
            ${entries
              .map(
                (entry) => `
                  <div class="master-cover__score-row" style="--accent:${entry.color};">
                    <strong>${entry.factor} · ${entry.value}%</strong>
                    <span>${escapeHtml(entry.label)}</span>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
      </div>
    `,
  });
}

function renderSummaryPage(variant) {
  const summary = SUMMARY_CONTENT[variant];
  return renderPageFrame({
    className: "page--summary",
    pageNumber: "2",
    pageLabel: "2",
    body: `
      <div class="summary-page">
        <div class="page-title-block">
          <h2>${escapeHtml(summary.title)}</h2>
          <p>${escapeHtml(summary.lead)}</p>
        </div>
        <div class="summary-grid">
          ${summary.items
            .map(
              (item) => `
                <article class="summary-card">
                  <div class="summary-card__index">${escapeHtml(item.index)}</div>
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.description)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    `,
  });
}

function renderIntroPage() {
  return renderPageFrame({
    className: "page--intro",
    pageNumber: "3",
    pageLabel: "3",
    body: `
      <div class="intro-page">
        <div class="intro-page__copy">
          <div class="page-title-block page-title-block--tight">
            <h2>Introdução ao Perfil DISC</h2>
            <p>
              A metodologia DISC é um dos instrumentos de mapeamento comportamental mais utilizados no mundo corporativo.
              Ela identifica padrões de comportamento em quatro dimensões complementares, permitindo compreender como o
              indivíduo age, comunica e reage em diferentes contextos.
            </p>
          </div>
          <div class="intro-factor-list">
            ${FACTORS.map(
              (factor) => `
                <article class="intro-factor" style="--accent:${FACTOR_META[factor].color};">
                  <div class="intro-factor__icon">${factor}</div>
                  <div class="intro-factor__body">
                    <h3>${escapeHtml(FACTOR_META[factor].label)} (${factor})</h3>
                    <p>${escapeHtml(FACTOR_META[factor].intro)}</p>
                  </div>
                </article>
              `
            ).join("")}
          </div>
        </div>
        <div class="intro-page__visual">
          ${renderWheel()}
        </div>
      </div>
    `,
  });
}

function renderOverviewPage(model) {
  const entries = sortedFactors(model.scores?.natural);
  const summary = fixPt(
    firstNonEmpty(
      model.profile?.label,
      model.profileContent?.summary,
      "Leitura executiva do equilíbrio entre os quatro fatores DISC."
    )
  );
  return renderPageFrame({
    className: "page--overview",
    pageNumber: "4",
    pageLabel: "4",
    body: `
      <div class="overview-page">
        <div class="page-title-block page-title-block--tight">
          <h2>Visão Geral do Perfil</h2>
          <p>${escapeHtml(summary)}</p>
        </div>
        <div class="score-grid">
          ${entries
            .map((entry, index) =>
              renderInfoStat(entry, ["Perfil primário", "Perfil secundário", "Terciário", "Quaternário"][index])
            )
            .join("")}
        </div>
        <article class="narrative-card narrative-card--wide">
          <strong>${escapeHtml(fixPt(model.profile?.title || "Perfil DISC"))}</strong>
          <p>${escapeHtml(fixPt(firstNonEmpty(model.profileContent?.executiveSummary?.[0], model.profileContent?.summary)))}</p>
          <p>${escapeHtml(fixPt(firstNonEmpty(model.profileContent?.executiveSummary?.[1], model.narratives?.summaryParagraphs?.[1])))}</p>
        </article>
      </div>
    `,
  });
}

function renderBarsPage(model) {
  const naturalEntries = factorEntries(model.scores?.natural);
  const adaptedEntries = factorEntries(model.scores?.adapted);
  return renderPageFrame({
    className: "page--bars",
    pageNumber: "5",
    pageLabel: "5",
    body: `
      <div class="bars-page two-col-layout">
        <div class="two-col-layout__main">
          <div class="page-title-block page-title-block--tight">
            <h2>Gráfico DISC — Barras & Natural vs. Adaptado</h2>
            <p>Pontuação DISC em leitura comparativa entre o comportamento espontâneo e o ajuste aplicado ao contexto.</p>
          </div>
          ${renderGroupedBarChart(model.scores?.natural, model.scores?.adapted)}
        </div>
        <aside class="two-col-layout__side">
          <article class="narrative-card">
            <strong>Natural vs. Adaptado</strong>
            <p>${escapeHtml(fixPt(model.adaptation?.interpretation))}</p>
          </article>
          <article class="narrative-card narrative-card--accent">
            <strong>Natural</strong>
            <p>${escapeHtml(factorSignature(naturalEntries))}</p>
            <p>${escapeHtml(fixPt(firstNonEmpty(model.narratives?.summaryParagraphs?.[1], model.profileContent?.summary)))}</p>
          </article>
          <article class="narrative-card narrative-card--accent-alt">
            <strong>Adaptado</strong>
            <p>${escapeHtml(factorSignature(adaptedEntries))}</p>
            <p>${escapeHtml(fixPt(firstNonEmpty(model.narratives?.summaryParagraphs?.[3], model.adaptation?.interpretation)))}</p>
          </article>
        </aside>
      </div>
    `,
  });
}

function renderQuadrantPage(model) {
  const entries = factorEntries(model.scores?.natural);
  return renderPageFrame({
    className: "page--quadrant",
    pageNumber: "6",
    pageLabel: "6",
    body: `
      <div class="quadrant-page two-col-layout">
        <div class="two-col-layout__main">
          <div class="page-title-block page-title-block--tight">
            <h2>Intensidade Comportamental & Mapa de Quadrante</h2>
            <p>Leitura da energia predominante por fator e posicionamento do perfil no eixo tarefa x pessoas.</p>
          </div>
          ${renderIntensityChart(entries)}
        </div>
        <aside class="two-col-layout__side">
          <article class="narrative-card">
            <strong>Mapa de Quadrante DISC</strong>
            <p>
              ${escapeHtml(
                fixPt(
                  firstNonEmpty(
                    model.narratives?.summaryParagraphs?.[2],
                    "O posicionamento no quadrante revela a orientação central do perfil e a forma como ele distribui atenção entre resultados, pessoas e estabilidade."
                  )
                )
              )}
            </p>
          </article>
          ${renderQuadrantMap(entries)}
        </aside>
      </div>
    `,
  });
}

function renderIndicesPage(model) {
  const indices = calcIndices({
    natural: model.scores?.natural || {},
    adaptationCost: model.adaptation?.avgAbsDelta || 0,
  });
  return renderPageFrame({
    className: "page--indices",
    pageNumber: "7",
    pageLabel: "7",
    body: `
      <div class="indices-page">
        <div class="page-title-block page-title-block--tight">
          <h2>Índices Comportamentais</h2>
          <p>Os índices quantificam a aptidão natural do perfil para funções estratégicas nas dimensões-chave de desempenho profissional.</p>
        </div>
        <div class="gauge-grid">
          ${renderGauge(indices.leadership, "Índice de Liderança", "Capacidade de direção, decisão e mobilização de times.", FACTOR_META.D.color)}
          ${renderGauge(indices.communication, "Índice de Comunicação", "Expressividade, persuasão e clareza relacional.", FACTOR_META.I.color)}
          ${renderGauge(indices.execution, "Índice de Execução", "Velocidade na implementação e foco em entrega tangível.", FACTOR_META.S.color)}
          ${renderGauge(indices.stability, "Estabilidade Emocional", "Gestão da tensão e constância comportamental sob demanda.", FACTOR_META.C.color)}
        </div>
      </div>
    `,
  });
}

function renderCombinationPage(model) {
  const primary = FACTOR_META[model.profile?.primary] || FACTOR_META.D;
  const secondary = FACTOR_META[model.profile?.secondary] || FACTOR_META.I;
  const synergy = fixPt(firstNonEmpty(model.profileContent?.executiveSummary?.[2], model.profileContent?.closingSummary));
  return renderPageFrame({
    className: "page--combination",
    pageNumber: "8",
    pageLabel: "8",
    body: `
      <div class="combination-page">
        <div class="combination-page__visual" style="background-image:url('assets/report-native/combo-visual.png');"></div>
        <div class="combination-page__content">
          <div class="page-title-block page-title-block--tight">
            <h2>Combinação DISC — Perfil ${escapeHtml(model.profile?.primary || "D")}/${escapeHtml(model.profile?.secondary || "I")}</h2>
          </div>
          <div class="stack-card-list">
            <article class="stack-card" style="--accent:${primary.color};">
              <div class="stack-card__icon">${escapeHtml(model.profile?.primary || "D")}</div>
              <div class="stack-card__body">
                <strong>Perfil Primário — ${escapeHtml(primary.label)} (${escapeHtml(model.profile?.primary || "D")})</strong>
                <p>${escapeHtml(fixPt(firstNonEmpty(model.factors?.[model.profile?.primary]?.headline, model.profileContent?.executiveSummary?.[0])))}</p>
              </div>
            </article>
            <article class="stack-card" style="--accent:${secondary.color};">
              <div class="stack-card__icon">${escapeHtml(model.profile?.secondary || "I")}</div>
              <div class="stack-card__body">
                <strong>Perfil Secundário — ${escapeHtml(secondary.label)} (${escapeHtml(model.profile?.secondary || "I")})</strong>
                <p>${escapeHtml(fixPt(firstNonEmpty(model.factors?.[model.profile?.secondary]?.headline, model.profileContent?.executiveSummary?.[1])))}</p>
              </div>
            </article>
            <article class="stack-card stack-card--synergy" style="--accent:#8a5cff;">
              <div class="stack-card__icon">+</div>
              <div class="stack-card__body">
                <strong>Sinergia ${escapeHtml(model.profile?.primary || "D")} + ${escapeHtml(model.profile?.secondary || "I")}</strong>
                <p>${escapeHtml(synergy)}</p>
              </div>
            </article>
          </div>
        </div>
      </div>
    `,
  });
}

function renderBenchmarkPage(model) {
  const topRows = (model.benchmark?.rows || []).slice(0, 4);
  return renderPageFrame({
    className: "page--benchmark",
    pageNumber: "9",
    pageLabel: "9",
    body: `
      <div class="benchmark-page two-col-layout">
        <div class="two-col-layout__main">
          <div class="page-title-block page-title-block--tight">
            <h2>Benchmark Populacional & Curva Percentil</h2>
            <p>Comparativo da leitura atual com as faixas de referência internas para interpretação do perfil.</p>
          </div>
          ${renderBenchmarkBars(topRows)}
        </div>
        <aside class="two-col-layout__side">
          <article class="narrative-card">
            <strong>Comparativo Populacional</strong>
            <p>${escapeHtml(fixPt(firstNonEmpty(topRows[0]?.reading, model.benchmark?.legend)))}</p>
          </article>
          ${topRows
            .slice(0, 2)
            .map(
              (row) => `
                <article class="mini-highlight">
                  <strong>${escapeHtml(fixPt(row.label))}</strong>
                  <p>Percentil ${percentileFromScore(row.score)} · ${escapeHtml(fixPt(row.reading))}</p>
                </article>
              `
            )
            .join("")}
        </aside>
      </div>
    `,
  });
}

function renderStrengthsPage(model) {
  const editorial = PROFILE_EDITORIAL[getProfileKey(model)] || {};
  const strengths = fixList(model.profileContent?.workStrengths, 5);
  const risks = fixList(model.profileContent?.workRisks, 5);
  return renderPageFrame({
    className: "page--strengths",
    pageNumber: "10",
    pageLabel: "10",
    body: `
      <div class="strengths-page">
        <div class="page-title-block page-title-block--tight">
          <h2>Pontos Fortes & Limitações</h2>
        </div>
        <div class="dual-table">
          <article class="table-card">
            <h3>Pontos Fortes</h3>
            <div class="table-card__rows">
              ${strengths
                .map(
                  (item, index) => `
                    <div class="table-row">
                      <strong>${escapeHtml(item)}</strong>
                      <span>${escapeHtml(fixPt(firstNonEmpty(editorial.strengths?.[item], model.narratives?.leadershipStrengths?.[index], model.narratives?.communicationPrinciples?.[index], item)))}</span>
                    </div>
                  `
                )
                .join("")}
            </div>
          </article>

          <article class="table-card table-card--alert">
            <h3>Limitações</h3>
            <div class="table-card__rows">
              ${risks
                .map(
                  (item, index) => `
                    <div class="table-row">
                      <strong>${escapeHtml(item)}</strong>
                      <span>${escapeHtml(fixPt(firstNonEmpty(editorial.risks?.[item], model.narratives?.developmentRisks?.[index], model.narratives?.stressSignals?.[index], item)))}</span>
                    </div>
                  `
                )
                .join("")}
            </div>
          </article>
        </div>
      </div>
    `,
  });
}

function renderMotivatorsPage(model) {
  const motivators = fixList(model.profileContent?.motivators, 4);
  const environment = fixList(model.profileContent?.idealEnvironment, 4);
  return renderPageFrame({
    className: "page--motivators",
    pageNumber: "11",
    pageLabel: "11",
    body: `
      <div class="motivators-page">
        <div class="page-title-block page-title-block--tight">
          <h2>Motivadores & Ambiente Ideal</h2>
        </div>
        <div class="dual-list-layout">
          <article class="pill-panel">
            <h3>Motivadores</h3>
            ${motivators
              .map((item, index) => `<div class="pill-panel__item"><span>${index + 1}</span>${escapeHtml(item)}</div>`)
              .join("")}
          </article>
          <article class="pill-panel pill-panel--alt">
            <h3>Ambiente Ideal</h3>
            ${environment
              .map((item, index) => `<div class="pill-panel__item"><span>${index + 1}</span>${escapeHtml(item)}</div>`)
              .join("")}
          </article>
        </div>
      </div>
    `,
  });
}

function renderCommunicationPage(model) {
  const editorial = PROFILE_EDITORIAL[getProfileKey(model)] || {};
  const needs = fixList(model.profileContent?.communicationNeeds, 4);
  const decisions = fixList(model.narratives?.decisionParagraphs, 3);
  return renderPageFrame({
    className: "page--communication",
    pageNumber: "12",
    pageLabel: "12",
    body: `
      <div class="communication-page two-col-layout">
        <div class="two-col-layout__main">
          <div class="page-title-block page-title-block--tight">
            <h2>Comunicação & Tomada de Decisão</h2>
            <p>${escapeHtml(fixPt(firstNonEmpty(editorial.communication?.intro, model.profileContent?.communicationStyle?.[0], model.narratives?.communicationStyle?.[0])))}</p>
          </div>
          <article class="table-card">
            <h3>Como se comunica</h3>
            <div class="table-card__rows">
              <div class="table-row"><strong>Tom</strong><span>${escapeHtml(fixPt(firstNonEmpty(editorial.communication?.tone, model.narratives?.communicationStyle?.[1], "Respeitoso, acolhedor e orientado à relação de confiança.")))}</span></div>
              <div class="table-row"><strong>Velocidade</strong><span>${escapeHtml(fixPt(firstNonEmpty(editorial.communication?.pace, needs[1], "Ritmo estável, com clareza e cuidado ao expor a mensagem.")))}</span></div>
              <div class="table-row"><strong>Canal preferido</strong><span>${escapeHtml(fixPt(firstNonEmpty(editorial.communication?.channel, "Conversas estruturadas, com contexto humano, objetivo claro e próximo passo definido.")))}</span></div>
              <div class="table-row"><strong>Escuta</strong><span>${escapeHtml(fixPt(firstNonEmpty(editorial.communication?.listening, needs[3], model.narratives?.communicationNeeds?.[0], "Escuta construtiva, com atenção ao impacto da mensagem sobre as pessoas.")))}</span></div>
            </div>
          </article>
        </div>
        <aside class="two-col-layout__side">
          <article class="steps-card">
            <h3>Tomada de Decisão</h3>
            <div class="steps-card__item"><span>1</span><div><strong>Lê o cenário</strong><p>${escapeHtml(fixPt(firstNonEmpty(editorial.communication?.decisions?.[0], decisions[0], "Identifica rapidamente variáveis críticas e padrões do contexto.")))}</p></div></div>
            <div class="steps-card__item"><span>2</span><div><strong>Decide com convicção</strong><p>${escapeHtml(fixPt(firstNonEmpty(editorial.communication?.decisions?.[1], decisions[1], "Escolhe o rumo com clareza e senso de responsabilidade.")))}</p></div></div>
            <div class="steps-card__item"><span>3</span><div><strong>Ajusta em movimento</strong><p>${escapeHtml(fixPt(firstNonEmpty(editorial.communication?.decisions?.[2], decisions[2], "Refina a rota sem perder o momentum de execução.")))}</p></div></div>
          </article>
        </aside>
      </div>
    `,
  });
}

function renderLeadershipPage(model) {
  const roleItems = [
    {
      title: "Estilo de Liderança",
      image: "assets/page-13-image-01.png",
      text: fixPt(firstNonEmpty(model.profileContent?.leadershipStyle?.[0], model.narratives?.leadershipStrengths?.[0], model.profileContent?.leadershipStyle)),
    },
    {
      title: "Papel na Equipe",
      image: "assets/page-13-image-02.png",
      text: fixPt(firstNonEmpty(model.profileContent?.teamContribution?.[0], model.profileContent?.teamContribution?.[1], model.profileContent?.teamContribution)),
    },
    {
      title: "Gestão de Conflitos",
      image: "assets/page-13-image-03.png",
      text: fixPt(firstNonEmpty(model.profileContent?.conflictStyle?.[0], model.narratives?.conflictPrinciples?.[0], model.profileContent?.conflictStyle)),
    },
  ];

  return renderPageFrame({
    className: "page--leadership",
    pageNumber: "13",
    pageLabel: "13",
    body: `
      <div class="leadership-page">
        <div class="page-title-block page-title-block--tight">
          <h2>Liderança & Trabalho em Equipe</h2>
        </div>
        <div class="feature-grid">
          ${roleItems
            .map(
              (item) => `
                <article class="feature-card">
                  <img src="${item.image}" alt="" loading="eager" decoding="sync" />
                  <h3>${escapeHtml(item.title)}</h3>
                  <p>${escapeHtml(item.text)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    `,
  });
}

function renderPressurePage(model) {
  const editorial = PROFILE_EDITORIAL[getProfileKey(model)] || {};
  const normal = fixList(model.profileContent?.naturalStrengths, 4);
  const stress = fixList(model.profileContent?.stressSignals, 4);
  return renderPageFrame({
    className: "page--pressure",
    pageNumber: "14",
    pageLabel: "14",
    body: `
      <div class="pressure-page">
        <div class="page-title-block page-title-block--tight">
          <h2>Comportamento sob Pressão</h2>
          <p>${escapeHtml(fixPt(firstNonEmpty(model.profileContent?.stressPattern?.[0], model.profileContent?.stressPattern?.[1], model.profileContent?.stressPattern, model.adaptation?.interpretation)))}</p>
        </div>
        <div class="pressure-grid">
          <article class="pressure-column">
            <h3>No estado equilibrado</h3>
            <div class="pressure-cards">
              ${normal
                .map(
                  (item, index) => `
                    <div class="pressure-card">
                      <strong>${escapeHtml(item)}</strong>
                      <p>${escapeHtml(fixPt(firstNonEmpty(editorial.balanced?.[item], model.narratives?.summaryParagraphs?.[index], item)))}</p>
                    </div>
                  `
                )
                .join("")}
            </div>
          </article>
          <article class="pressure-column pressure-column--alert">
            <h3>Sob pressão</h3>
            <div class="pressure-cards">
              ${stress
                .map(
                  (item, index) => `
                    <div class="pressure-card pressure-card--alert">
                      <strong>${escapeHtml(item)}</strong>
                      <p>${escapeHtml(fixPt(firstNonEmpty(editorial.pressure?.[item], model.narratives?.stressRecovery?.[index], item)))}</p>
                    </div>
                  `
                )
                .join("")}
            </div>
          </article>
        </div>
      </div>
    `,
  });
}

function renderPerceptionPage(model) {
  const editorial = PROFILE_EDITORIAL[getProfileKey(model)] || {};
  const cards = [
    {
      label: "Pelos pares",
      text: fixPt(firstNonEmpty(editorial.perception?.peers, model.narratives?.communicationManagerNotes?.[0], "Competente, confiável e mobilizador, com forte presença relacional.")),
    },
    {
      label: "Pelos liderados",
      text: fixPt(firstNonEmpty(editorial.perception?.reports, model.narratives?.leadershipPitfalls?.[3], "Inspirador, exigente e orientado a ritmo, mas sensível à qualidade do vínculo.")),
    },
    {
      label: "Pelos superiores",
      text: fixPt(firstNonEmpty(editorial.perception?.leaders, model.insights?.managerLens?.headline, "Confiável para gerar alinhamento, engajamento e consistência.")),
    },
  ];
  return renderPageFrame({
    className: "page--perception",
    pageNumber: "15",
    pageLabel: "15",
    body: `
      <div class="perception-page">
        <div class="page-title-block page-title-block--tight">
          <h2>Percepção Externa & Relacionamentos</h2>
        </div>
        <div class="perception-grid">
          ${cards
            .map(
              (card) => `
                <article class="mini-highlight mini-highlight--full">
                  <strong>${escapeHtml(card.label)}</strong>
                  <p>${escapeHtml(card.text)}</p>
                </article>
              `
            )
            .join("")}
        </div>
        <article class="table-card table-card--wide">
          <h3>Comunicação entre Perfis</h3>
          <div class="table-card__rows">
            ${FACTORS.map(
              (factor) => `
                <div class="table-row table-row--three">
                  <strong>${factor}</strong>
                  <span>${escapeHtml(fixPt(FACTOR_META[factor].relationship.synergy))}</span>
                  <span>${escapeHtml(fixPt(`${FACTOR_META[factor].relationship.challenge} ${FACTOR_META[factor].relationship.strategy}`))}</span>
                </div>
              `
            ).join("")}
          </div>
        </article>
      </div>
    `,
  });
}

function renderNegotiationPage(model) {
  const editorial = PROFILE_EDITORIAL[getProfileKey(model)] || {};
  const cards = [
    {
      title: "Estilo de Negociação",
      text: fixPt(firstNonEmpty(editorial.negotiation?.negotiation, model.insights?.executiveByPage?.decision?.headline, model.narratives?.decisionParagraphs?.[0])),
    },
    {
      title: "Estilo de Vendas",
      text: fixPt(firstNonEmpty(editorial.negotiation?.sales, model.insights?.executiveByPage?.communication?.headline, model.narratives?.communicationStyle?.[0])),
    },
    {
      title: "Estilo de Aprendizado",
      text: fixPt(firstNonEmpty(editorial.negotiation?.learning, model.narratives?.developmentHabits?.[0], model.profileContent?.developmentPoints?.[0])),
    },
  ];
  return renderPageFrame({
    className: "page--negotiation",
    pageNumber: "16",
    pageLabel: "16",
    body: `
      <div class="columns-page">
        <div class="page-title-block page-title-block--tight">
          <h2>Estilos de Negociação, Vendas e Aprendizado</h2>
        </div>
        <div class="feature-grid feature-grid--narrow">
          ${cards
            .map(
              (card) => `
                <article class="feature-card feature-card--text-only">
                  <h3>${escapeHtml(card.title)}</h3>
                  <p>${escapeHtml(card.text)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    `,
  });
}

function renderDnaPage(model) {
  const editorial = PROFILE_EDITORIAL[getProfileKey(model)] || {};
  const traits = fixList(model.profileContent?.naturalStrengths, 4);
  const entries = factorEntries(model.scores?.natural);
  return renderPageFrame({
    className: "page--dna",
    pageNumber: "17",
    pageLabel: "17",
    body: `
      <div class="dna-page">
        <div class="page-title-block page-title-block--tight">
          <h2>DNA Comportamental & Escala Comportamental</h2>
          <p>Os traços abaixo sintetizam padrões estáveis do perfil, preservando identidade e forma de responder ao contexto.</p>
        </div>
        <div class="dna-layout">
          <div class="trait-grid">
            ${traits
              .map(
                (trait, index) => `
                  <article class="trait-card">
                    <span>${index + 1}</span>
                    <strong>${escapeHtml(trait)}</strong>
                    <p>${escapeHtml(fixPt(firstNonEmpty(editorial.dna?.[trait], model.narratives?.summaryParagraphs?.[index], trait)))}</p>
                  </article>
                `
              )
              .join("")}
          </div>
          <article class="narrative-card narrative-card--wide">
            <strong>Escala Comportamental (0–100)</strong>
            ${renderScaleBars(entries)}
          </article>
        </div>
      </div>
    `,
  });
}

function renderMatrixPage(model) {
  const rows = [
    ["Liderança", "Diretiva", "Inspiracional", "Colaborativa", "Analítica"],
    ["Comunicação", "Direta", "Expressiva", "Calma", "Precisa"],
    ["Decisão", "Rápida", "Intuitiva", "Consensual", "Metódica"],
    ["Conflito", "Enfrenta", "Negocia", "Evita", "Analisa"],
    ["Execução", "Acelera", "Mobiliza", "Sustenta", "Refina"],
  ];
  return renderPageFrame({
    className: "page--matrix",
    pageNumber: "18",
    pageLabel: "18",
    body: `
      <div class="matrix-page">
        <div class="page-title-block page-title-block--tight">
          <h2>Matriz DISC Avançada</h2>
          <p>${escapeHtml(fixPt(firstNonEmpty(model.benchmark?.legend, "A matriz avançada cruza os quatro fatores DISC com dimensões-chave de desempenho.")))}</p>
        </div>
        <table class="matrix-table">
          <thead>
            <tr>
              <th>Dimensão</th>
              ${factorEntries(model.scores?.natural)
                .map((entry) => `<th>${entry.factor} (${entry.value}%)</th>`)
                .join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row) => `
                  <tr>
                    <th>${row[0]}</th>
                    <td>${row[1]}</td>
                    <td>${row[2]}</td>
                    <td>${row[3]}</td>
                    <td>${row[4]}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `,
  });
}

function renderCareerPage(model) {
  const editorial = PROFILE_EDITORIAL[getProfileKey(model)] || {};
  const roles = fixList(model.profileContent?.recommendedRoles, 4);
  const dev = fixList(model.profileContent?.developmentPoints, 4);
  const developmentRows = dev.map((item, index) => ({
    item,
    text: fixPt(
      firstNonEmpty(
        editorial.developmentFocus?.[item],
        `${safeText(model.narratives?.developmentQuestions?.[index])} ${safeText(model.narratives?.developmentHabits?.[index])}`.trim(),
        model.narratives?.developmentQuestions?.[index],
        model.narratives?.developmentHabits?.[index],
        item
      )
    ),
  }));
  return renderPageFrame({
    className: "page--career",
    pageNumber: "19",
    pageLabel: "19",
    body: `
      <div class="career-page">
        <div class="page-title-block page-title-block--tight">
          <h2>Carreira & Desenvolvimento Profissional</h2>
        </div>
        <div class="role-grid">
          ${roles
            .map(
              (role) => `
                <article class="role-card">
                  <strong>${escapeHtml(role)}</strong>
                  <p>${escapeHtml(fixPt(firstNonEmpty(editorial.careers?.[role], "Contexto com espaço para autonomia, relacionamento e construção de impacto consistente.")))}</p>
                </article>
              `
            )
            .join("")}
        </div>
        <article class="table-card table-card--wide">
          <h3>Focos de Desenvolvimento Prioritário</h3>
          <div class="table-card__rows">
            ${developmentRows
              .map(
                  (row) => `
                    <div class="table-row">
                      <strong>${escapeHtml(row.item)}</strong>
                      <span>${escapeHtml(row.text)}</span>
                    </div>
                  `
              )
              .join("")}
          </div>
        </article>
      </div>
    `,
  });
}

function renderGrowthPage(model) {
  const editorial = PROFILE_EDITORIAL[getProfileKey(model)] || {};
  const cards = [
    {
      title: "Autoconhecimento",
      text: fixPt(firstNonEmpty(editorial.growth?.Autoconhecimento, model.narratives?.developmentQuestions?.[0], model.profileContent?.developmentPoints?.[0])),
    },
    {
      title: "Mentoria e Coaching",
      text: fixPt(firstNonEmpty(editorial.growth?.["Mentoria e Coaching"], model.narratives?.developmentHabits?.[1], model.narratives?.developmentHabits?.[0])),
    },
    {
      title: "Relacionamentos Estratégicos",
      text: fixPt(firstNonEmpty(editorial.growth?.["Relacionamentos Estratégicos"], model.narratives?.communicationManagerNotes?.[1], model.profileContent?.bestMatches?.[0])),
    },
    {
      title: "Excelência Sustentável",
      text: fixPt(firstNonEmpty(editorial.growth?.["Excelência Sustentável"], model.narratives?.executiveClosing?.[0], model.profileContent?.closingSummary)),
    },
  ];
  return renderPageFrame({
    className: "page--growth",
    pageNumber: "20",
    pageLabel: "20",
    body: `
      <div class="feature-page">
        <div class="page-title-block page-title-block--tight">
          <h2>Desenvolvimento Pessoal & Crescimento</h2>
        </div>
        <div class="feature-page__stack">
          ${cards
            .map(
              (card) => `
                <article class="feature-stripe">
                  <strong>${escapeHtml(card.title)}</strong>
                  <p>${escapeHtml(card.text)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </div>
    `,
  });
}

function renderActionPlanPage(model) {
  return renderPageFrame({
    className: "page--action-plan",
    pageNumber: "21",
    pageLabel: "21",
    body: `
      <div class="action-page">
        <div class="page-title-block page-title-block--tight">
          <h2>Plano de Ação — 90 Dias</h2>
        </div>
        ${renderTimeline(model.plans)}
        <p class="action-page__note">
          O plano de 90 dias combina autoconsciência, prática comportamental e consolidação de novos padrões de liderança,
          transformando insights em impacto real e sustentável.
        </p>
      </div>
    `,
  });
}

function renderAdvancedStylesPage(model) {
  const editorial = PROFILE_EDITORIAL[getProfileKey(model)] || {};
  const leadership = fixList(model.narratives?.leadershipPrinciples, 3);
  const rows = editorial.advanced?.communication || [
    ["1:1 com liderados", fixPt(firstNonEmpty(model.narratives?.communicationPrinciples?.[0], "Ouvir antes de orientar e alinhar o objetivo da conversa."))],
    ["Reuniões de equipe", fixPt(firstNonEmpty(model.narratives?.communicationPrinciples?.[1], "Deixar espaço para contribuições sem perder clareza de direção."))],
    ["Com perfil C", "Apresentar dados, critérios e passos de decisão."],
    ["Com perfil S", "Ser gentil, dar tempo de resposta e reduzir urgência desnecessária."],
  ];
  return renderPageFrame({
    className: "page--advanced-styles",
    pageNumber: "22",
    pageLabel: "22",
    body: `
      <div class="advanced-page two-col-layout">
        <div class="two-col-layout__main">
          <div class="page-title-block page-title-block--tight">
            <h2>Estilos Avançados — Liderança, Comunicação & Negociação</h2>
          </div>
          <article class="narrative-card narrative-card--wide">
            <strong>Estilo de Liderança</strong>
            ${renderList(editorial.advanced?.leadership || leadership, "bullet-list bullet-list--spacious", 3)}
          </article>
        </div>
        <aside class="two-col-layout__side">
          <article class="table-card">
            <h3>Ideal de Comunicação</h3>
            <div class="table-card__rows">
              ${rows
                .map(
                  (row) => `
                    <div class="table-row">
                      <strong>${escapeHtml(row[0])}</strong>
                      <span>${escapeHtml(row[1])}</span>
                    </div>
                  `
                )
                .join("")}
            </div>
          </article>
        </aside>
      </div>
    `,
  });
}

function renderRelationshipsPage(model) {
  const profileKey = `${model.profile?.primary || "D"}/${model.profile?.secondary || "I"}`;
  return renderPageFrame({
    className: "page--relationships",
    pageNumber: "23",
    pageLabel: "23",
    body: `
      <div class="relationships-page">
        <div class="page-title-block page-title-block--tight">
          <h2>Relacionamento entre Perfis DISC</h2>
          <p>Compreender como este perfil ${escapeHtml(profileKey)} se relaciona com os demais perfis é essencial para otimizar parcerias, minimizar conflitos e maximizar resultados em equipe.</p>
        </div>
        <table class="relationship-table">
          <thead>
            <tr>
              <th>Perfil</th>
              <th>Sinergia</th>
              <th>Desafio</th>
              <th>Estratégia de Relacionamento</th>
            </tr>
          </thead>
          <tbody>
            ${FACTORS.map(
              (factor) => `
                <tr>
                  <th>${factor}</th>
                  <td>${escapeHtml(fixPt(FACTOR_META[factor].relationship.synergy))}</td>
                  <td>${escapeHtml(fixPt(FACTOR_META[factor].relationship.challenge))}</td>
                  <td>${escapeHtml(fixPt(FACTOR_META[factor].relationship.strategy))}</td>
                </tr>
              `
            ).join("")}
          </tbody>
        </table>
        <article class="mini-highlight mini-highlight--tip">
          <strong>Dica executiva</strong>
          <p>${escapeHtml(fixPt(firstNonEmpty(model.insights?.managerCallout?.headline, model.insights?.managerLens?.headline, "Ajustar ritmo, clareza e contexto é o caminho mais curto para ampliar confiança e cooperação entre perfis.")))}</p>
        </article>
      </div>
    `,
  });
}

function renderRecommendationsPage(model, context) {
  const editorial = PROFILE_EDITORIAL[getProfileKey(model)] || {};
  const variantRecommendations = editorial.recommendations?.[context.variant];
  const recommendations =
    variantRecommendations ||
    [
      {
        title: "Potencialize a Liderança",
        text: fixPt(firstNonEmpty(model.narratives?.leadershipPrinciples?.[0], "Invista em liderança situacional para adaptar firmeza, ritmo e escuta ao contexto.")),
      },
      {
        title: "Desenvolva a Inteligência Emocional",
        text: fixPt(firstNonEmpty(model.narratives?.stressRecovery?.[0], "Autocontrole sob pressão amplia impacto, clareza e consistência de decisão.")),
      },
      {
        title: "Monte Equipes Complementares",
        text: fixPt(firstNonEmpty(model.narratives?.communicationManagerNotes?.[2], "Cerque-se de perfis complementares para compensar pontos cegos e ampliar qualidade de execução.")),
      },
      {
        title: "Construa Resultados Sustentáveis",
        text: fixPt(firstNonEmpty(model.narratives?.executiveClosing?.[1], "Alta performance exige consistência, processo e atenção à energia do time.")),
      },
    ];
  return renderPageFrame({
    className: "page--recommendations",
    pageNumber: "24",
    pageLabel: "24",
    body: `
      <div class="recommendations-page">
        <div class="recommendations-page__copy">
          <div class="page-title-block page-title-block--tight">
            <img
              class="page-title-image page-title-image--recommendations"
              src="assets/report-native/recommendations-title.png"
              alt="Recomendações Finais"
            />
          </div>
          <div class="recommendation-list">
            ${recommendations
              .map(
                (item) => `
                  <article class="recommendation-item">
                    <h3>${escapeHtml(item.title)}</h3>
                    <p>${escapeHtml(item.text)}</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </div>
        <div class="recommendations-page__visual" style="background-image:url('assets/report-native/recommendations-visual.png');"></div>
      </div>
    `,
  });
}

function renderConclusionPage(model, context) {
  const cards = [
    {
      title: `Perfil ${model.profile?.primary || "D"}/${model.profile?.secondary || "I"} — Síntese`,
      text: fixPt(firstNonEmpty(model.profileContent?.executiveSummary?.[0], model.profileContent?.summary)),
    },
    {
      title: "Principal Força",
      text: fixPt(firstNonEmpty(model.profileContent?.naturalStrengths?.[0], model.insights?.executive?.headline)),
    },
    {
      title: "Principal Desenvolvimento",
      text: fixPt(firstNonEmpty(model.profileContent?.developmentPoints?.[0], model.insights?.developmentLens?.headline)),
    },
  ];
  const quote = fixPt(
    firstNonEmpty(
      model.profileContent?.closingSummary,
      `O perfil ${model.profile?.key || "DISC"} gera valor quando transforma traços naturais em impacto consistente e relacional.`
    )
  );
  return renderPageFrame({
    className: "page--conclusion",
    pageNumber: "25",
    pageLabel: "25",
    body: `
      <div class="conclusion-page">
        <div class="page-title-block page-title-block--tight">
          <h2>Síntese & Conclusão</h2>
          <blockquote>“${escapeHtml(quote)}”</blockquote>
        </div>
        <div class="summary-grid summary-grid--conclusion">
          ${cards
            .map(
              (card) => `
                <article class="summary-card summary-card--conclusion">
                  <h3>${escapeHtml(card.title)}</h3>
                  <p>${escapeHtml(card.text)}</p>
                </article>
              `
            )
            .join("")}
        </div>
        <p class="conclusion-page__footer">
          ${escapeHtml(
            fixPt(
              firstNonEmpty(
                context.variant === "business"
                  ? "Leitura executiva orientada a liderança, relacionamento, clientes, people e desenvolvimento organizacional."
                  : "",
                context.variant === "professional"
                  ? "Leitura aplicada ao contexto profissional, com foco em comunicação, desenvolvimento e clareza de ação."
                  : "",
                context.variant === "personal"
                  ? "Leitura orientada a autoconhecimento, comunicação e evolução prática no dia a dia."
                  : "",
                model.narratives?.executiveClosing?.[2],
                "Este relatório foi gerado pela plataforma InsightDISC para apoiar leitura comportamental, desenvolvimento e decisões mais conscientes."
              )
            )
          )}
        </p>
      </div>
    `,
  });
}

function renderInstitutionalClosing(context) {
  return renderPageFrame({
    className: "page--institutional-closing",
    footerBrand: false,
    pageLabel: "encerramento",
    body: `
      <div class="institutional-closing">
        <img class="institutional-closing__logo" src="assets/insightdisc-logo-institutional.png" alt="Logo InsightDISC" />
        <h2>InsightDISC</h2>
        <p class="institutional-closing__subtitle">Plataforma de Análise Comportamental</p>

        <div class="institutional-closing__panel">
          <div class="institutional-closing__column">
            <div class="institutional-closing__heading">Contato institucional</div>
            <p><strong>Site:</strong> ${escapeHtml(context.brandWebsite)}</p>
            <p><strong>E-mail:</strong> ${escapeHtml(context.brandEmail)}</p>
            <p><strong>Instagram:</strong> ${escapeHtml(context.brandInstagram)}</p>
          </div>
          <div class="institutional-closing__column">
            <div class="institutional-closing__heading">Respaldo técnico-profissional</div>
            <p><strong>${escapeHtml(context.supportName)}</strong> – ${escapeHtml(context.supportRole)}</p>
            <p>${escapeHtml(context.supportTitle)}</p>
          </div>
        </div>

        <p class="institutional-closing__note">Relatório gerado automaticamente pela plataforma InsightDISC.</p>
      </div>
    `,
  });
}

function renderPageByKey(key, model, context) {
  switch (key) {
    case 1:
      return renderMasterCover(model, context);
    case 2:
    case "personal-summary":
      return renderSummaryPage(context.variant);
    case 3:
      return renderIntroPage();
    case 4:
      return renderOverviewPage(model);
    case 5:
      return renderBarsPage(model);
    case 6:
      return renderQuadrantPage(model);
    case 7:
      return renderIndicesPage(model);
    case 8:
      return renderCombinationPage(model);
    case 9:
      return renderBenchmarkPage(model);
    case 10:
      return renderStrengthsPage(model);
    case 11:
      return renderMotivatorsPage(model);
    case 12:
      return renderCommunicationPage(model);
    case 13:
      return renderLeadershipPage(model);
    case 14:
      return renderPressurePage(model);
    case 15:
      return renderPerceptionPage(model);
    case 16:
      return renderNegotiationPage(model);
    case 17:
      return renderDnaPage(model);
    case 18:
      return renderMatrixPage(model);
    case 19:
      return renderCareerPage(model);
    case 20:
      return renderGrowthPage(model);
    case 21:
      return renderActionPlanPage(model);
    case 22:
      return renderAdvancedStylesPage(model);
    case 23:
      return renderRelationshipsPage(model);
    case 24:
      return renderRecommendationsPage(model, context);
    case 25:
      return renderConclusionPage(model, context);
    default:
      return "";
  }
}

function renderHtmlDocument({ variant, model }) {
  const context = buildContext(model, variant);
  const config = VARIANT_CONFIG[variant];
  const pages = [
    renderInstitutionalCover(context),
    ...config.sequence.map((key) => renderPageByKey(key, model, context)),
    renderInstitutionalClosing(context),
  ].map((pageHtml, index) => {
    if (!pageHtml.includes("slide-footer__page")) return pageHtml;
    return pageHtml.replace(
      /<div class="slide-footer__page">.*?<\/div>/,
      `<div class="slide-footer__page">${index + 1}</div>`
    );
  }).join("");

  return `
    <!doctype html>
    <html lang="pt-BR" data-report-ready="false">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${escapeHtml(context.reportTitle)} · ${escapeHtml(context.variantLabel)}</title>
        <link rel="stylesheet" href="report.css" />
      </head>
      <body data-report="${escapeHtml(variant)}">
        <main class="report" role="document" aria-label="Relatório InsightDISC em HTML/CSS nativo">
          ${pages}
        </main>
        <script>
          window.addEventListener('load', () => {
            document.documentElement.setAttribute('data-report-ready', 'true');
          });
        </script>
      </body>
    </html>
  `;
}

export function renderOfficialSlidesHtml({ variant = "business", model } = {}) {
  return renderHtmlDocument({ variant: VARIANT_CONFIG[variant] ? variant : "business", model });
}

export default renderOfficialSlidesHtml;
