// Full 40-question DISC bank – each block has exactly 1 option per factor (D, I, S, C)
export const FULL_QUESTION_BANK = [
  { id: 'q01', category: 'work_style', question_text: 'No trabalho, eu me destaco quando...',
    options: [
      { id: 'q01D', text: 'Lidero e tomo decisões rápidas', factor: 'D' },
      { id: 'q01I', text: 'Inspiro e entusiasmo as pessoas', factor: 'I' },
      { id: 'q01S', text: 'Apoio e mantenho a harmonia', factor: 'S' },
      { id: 'q01C', text: 'Analiso com precisão e rigor', factor: 'C' },
    ]},
  { id: 'q02', category: 'work_style', question_text: 'Minha abordagem a novos projetos é...',
    options: [
      { id: 'q02D', text: 'Assumir o controle imediatamente', factor: 'D' },
      { id: 'q02I', text: 'Mobilizar o time com entusiasmo', factor: 'I' },
      { id: 'q02S', text: 'Planejar com calma e consistência', factor: 'S' },
      { id: 'q02C', text: 'Levantar todos os dados antes de agir', factor: 'C' },
    ]},
  { id: 'q03', category: 'work_style', question_text: 'Quando recebo uma tarefa difícil, eu...',
    options: [
      { id: 'q03D', text: 'Ataco o problema de frente', factor: 'D' },
      { id: 'q03I', text: 'Faço brainstorming com a equipe', factor: 'I' },
      { id: 'q03S', text: 'Sigo o processo passo a passo', factor: 'S' },
      { id: 'q03C', text: 'Pesquiso profundamente antes de começar', factor: 'C' },
    ]},
  { id: 'q04', category: 'work_style', question_text: 'Meu ritmo de trabalho ideal é...',
    options: [
      { id: 'q04D', text: 'Intenso e voltado a resultados', factor: 'D' },
      { id: 'q04I', text: 'Dinâmico, com muita interação', factor: 'I' },
      { id: 'q04S', text: 'Constante e previsível', factor: 'S' },
      { id: 'q04C', text: 'Metódico e sem erros', factor: 'C' },
    ]},
  { id: 'q05', category: 'work_style', question_text: 'Para mim, produtividade significa...',
    options: [
      { id: 'q05D', text: 'Bater metas agressivas', factor: 'D' },
      { id: 'q05I', text: 'Engajar e influenciar pessoas', factor: 'I' },
      { id: 'q05S', text: 'Entregar com consistência', factor: 'S' },
      { id: 'q05C', text: 'Entregar com alta qualidade', factor: 'C' },
    ]},
  { id: 'q06', category: 'communication', question_text: 'Em reuniões, meu estilo é...',
    options: [
      { id: 'q06D', text: 'Ir direto ao ponto', factor: 'D' },
      { id: 'q06I', text: 'Criar energia e participação', factor: 'I' },
      { id: 'q06S', text: 'Ouvir atentamente a todos', factor: 'S' },
      { id: 'q06C', text: 'Apresentar dados e fatos', factor: 'C' },
    ]},
  { id: 'q07', category: 'communication', question_text: 'Quando preciso convencer alguém, eu...',
    options: [
      { id: 'q07D', text: 'Apresento os resultados esperados', factor: 'D' },
      { id: 'q07I', text: 'Uso entusiasmo e histórias', factor: 'I' },
      { id: 'q07S', text: 'Busco consenso e acordo mútuo', factor: 'S' },
      { id: 'q07C', text: 'Apresento evidências e lógica', factor: 'C' },
    ]},
  { id: 'q08', category: 'communication', question_text: 'Em conversas, eu prefiro...',
    options: [
      { id: 'q08D', text: 'Ser direto e breve', factor: 'D' },
      { id: 'q08I', text: 'Conversar animadamente por horas', factor: 'I' },
      { id: 'q08S', text: 'Ouvir mais do que falar', factor: 'S' },
      { id: 'q08C', text: 'Ser preciso e detalhado', factor: 'C' },
    ]},
  { id: 'q09', category: 'communication', question_text: 'Ao dar feedback, costumo ser...',
    options: [
      { id: 'q09D', text: 'Direto e objetivo, sem rodeios', factor: 'D' },
      { id: 'q09I', text: 'Encorajador e motivador', factor: 'I' },
      { id: 'q09S', text: 'Gentil e cuidadoso com as palavras', factor: 'S' },
      { id: 'q09C', text: 'Específico e baseado em critérios', factor: 'C' },
    ]},
  { id: 'q10', category: 'decision_making', question_text: 'Ao tomar uma decisão importante, eu...',
    options: [
      { id: 'q10D', text: 'Decido rápido e sigo em frente', factor: 'D' },
      { id: 'q10I', text: 'Consulto pessoas e confio no feeling', factor: 'I' },
      { id: 'q10S', text: 'Tomo o tempo necessário para refletir', factor: 'S' },
      { id: 'q10C', text: 'Analiso todos os cenários possíveis', factor: 'C' },
    ]},
  { id: 'q11', category: 'decision_making', question_text: 'Prefiro decisões que priorizam...',
    options: [
      { id: 'q11D', text: 'Resultados e velocidade', factor: 'D' },
      { id: 'q11I', text: 'Aceitação e entusiasmo do grupo', factor: 'I' },
      { id: 'q11S', text: 'Harmonia e impacto nas pessoas', factor: 'S' },
      { id: 'q11C', text: 'Precisão e qualidade da escolha', factor: 'C' },
    ]},
  { id: 'q12', category: 'decision_making', question_text: 'Quando enfrento incerteza, eu...',
    options: [
      { id: 'q12D', text: 'Ajo mesmo sem todas as informações', factor: 'D' },
      { id: 'q12I', text: 'Confio no otimismo e na intuição', factor: 'I' },
      { id: 'q12S', text: 'Espero por mais clareza antes de agir', factor: 'S' },
      { id: 'q12C', text: 'Levanto mais dados para reduzir o risco', factor: 'C' },
    ]},
  { id: 'q13', category: 'decision_making', question_text: 'O que mais pesa na minha decisão é...',
    options: [
      { id: 'q13D', text: 'O impacto nos resultados do negócio', factor: 'D' },
      { id: 'q13I', text: 'O quanto vai engajar e empolgar as pessoas', factor: 'I' },
      { id: 'q13S', text: 'O quanto mantém a estabilidade do time', factor: 'S' },
      { id: 'q13C', text: 'O quanto está correto e bem embasado', factor: 'C' },
    ]},
  { id: 'q14', category: 'stress_response', question_text: 'Sob pressão extrema, eu tendo a...',
    options: [
      { id: 'q14D', text: 'Ficar mais impaciente e assertivo', factor: 'D' },
      { id: 'q14I', text: 'Buscar conversas e apoio emocional', factor: 'I' },
      { id: 'q14S', text: 'Me recolher e processar internamente', factor: 'S' },
      { id: 'q14C', text: 'Me tornar mais crítico e exigente', factor: 'C' },
    ]},
  { id: 'q15', category: 'stress_response', question_text: 'Quando algo dá errado, eu...',
    options: [
      { id: 'q15D', text: 'Quero resolver e seguir em frente logo', factor: 'D' },
      { id: 'q15I', text: 'Falo sobre o problema e busco suporte', factor: 'I' },
      { id: 'q15S', text: 'Fico quieto e evito conflitos', factor: 'S' },
      { id: 'q15C', text: 'Analiso o que causou o erro', factor: 'C' },
    ]},
  { id: 'q16', category: 'stress_response', question_text: 'Para me recuperar do estresse, prefiro...',
    options: [
      { id: 'q16D', text: 'Ter controle sobre a situação', factor: 'D' },
      { id: 'q16I', text: 'Estar com pessoas que me animem', factor: 'I' },
      { id: 'q16S', text: 'Ter tempo e espaço para descansar', factor: 'S' },
      { id: 'q16C', text: 'Entender completamente o que aconteceu', factor: 'C' },
    ]},
  { id: 'q17', category: 'leadership', question_text: 'Como líder, meu foco principal é...',
    options: [
      { id: 'q17D', text: 'Definir metas arrojadas e cobrar resultados', factor: 'D' },
      { id: 'q17I', text: 'Inspirar e motivar o time continuamente', factor: 'I' },
      { id: 'q17S', text: 'Desenvolver as pessoas com paciência', factor: 'S' },
      { id: 'q17C', text: 'Garantir padrões de excelência', factor: 'C' },
    ]},
  { id: 'q18', category: 'leadership', question_text: 'Meu estilo natural de liderança é...',
    options: [
      { id: 'q18D', text: 'Diretivo: dou a direção e espero execução', factor: 'D' },
      { id: 'q18I', text: 'Inspirador: vendo o sonho e contagio todos', factor: 'I' },
      { id: 'q18S', text: 'Apoiador: removo obstáculos e cuido do time', factor: 'S' },
      { id: 'q18C', text: 'Analítico: ensino pelo rigor e precisão', factor: 'C' },
    ]},
  { id: 'q19', category: 'teamwork', question_text: 'Em equipe, meu papel natural é...',
    options: [
      { id: 'q19D', text: 'Assumir a liderança e direcionar', factor: 'D' },
      { id: 'q19I', text: 'Motivar e manter o grupo unido', factor: 'I' },
      { id: 'q19S', text: 'Ser o suporte confiável de todos', factor: 'S' },
      { id: 'q19C', text: 'Garantir qualidade e rigor técnico', factor: 'C' },
    ]},
  { id: 'q20', category: 'teamwork', question_text: 'O que mais valorizo em um time é...',
    options: [
      { id: 'q20D', text: 'Alta performance e entrega de resultados', factor: 'D' },
      { id: 'q20I', text: 'Criatividade, energia e boa comunicação', factor: 'I' },
      { id: 'q20S', text: 'Cooperação, lealdade e ambiente seguro', factor: 'S' },
      { id: 'q20C', text: 'Organização, processos e padrão elevado', factor: 'C' },
    ]},
  { id: 'q21', category: 'work_style', question_text: 'Me sinto mais motivado quando...',
    options: [
      { id: 'q21D', text: 'Tenho desafios e autonomia', factor: 'D' },
      { id: 'q21I', text: 'Recebo reconhecimento e admiração', factor: 'I' },
      { id: 'q21S', text: 'Tenho estabilidade e previsibilidade', factor: 'S' },
      { id: 'q21C', text: 'Faço um trabalho correto e de qualidade', factor: 'C' },
    ]},
  { id: 'q22', category: 'stress_response', question_text: 'Meu maior medo no trabalho é...',
    options: [
      { id: 'q22D', text: 'Perder o controle ou a autoridade', factor: 'D' },
      { id: 'q22I', text: 'Ser ignorado ou rejeitado pelo grupo', factor: 'I' },
      { id: 'q22S', text: 'Conflitos e mudanças repentinas', factor: 'S' },
      { id: 'q22C', text: 'Cometer erros e ser criticado', factor: 'C' },
    ]},
  { id: 'q23', category: 'communication', question_text: 'Ao receber um elogio, eu...',
    options: [
      { id: 'q23D', text: 'Aprecio, mas logo penso no próximo objetivo', factor: 'D' },
      { id: 'q23I', text: 'Fico genuinamente feliz e compartilho', factor: 'I' },
      { id: 'q23S', text: 'Fico contente, mas com humildade', factor: 'S' },
      { id: 'q23C', text: 'Verifico se é realmente merecido', factor: 'C' },
    ]},
  { id: 'q24', category: 'decision_making', question_text: 'Em situações de crise, eu...',
    options: [
      { id: 'q24D', text: 'Assumo o comando e ajo rapidamente', factor: 'D' },
      { id: 'q24I', text: 'Mantenho o ânimo do time elevado', factor: 'I' },
      { id: 'q24S', text: 'Mantenho a calma e estabilizo o grupo', factor: 'S' },
      { id: 'q24C', text: 'Analiso a causa-raiz do problema', factor: 'C' },
    ]},
  { id: 'q25', category: 'work_style', question_text: 'Prefiro ambientes de trabalho...',
    options: [
      { id: 'q25D', text: 'Competitivos e orientados a resultados', factor: 'D' },
      { id: 'q25I', text: 'Dinâmicos, criativos e sociais', factor: 'I' },
      { id: 'q25S', text: 'Estáveis, colaborativos e harmoniosos', factor: 'S' },
      { id: 'q25C', text: 'Organizados, sistemáticos e precisos', factor: 'C' },
    ]},
  { id: 'q26', category: 'leadership', question_text: 'Quando discordo de uma decisão, eu...',
    options: [
      { id: 'q26D', text: 'Expresso minha discordância diretamente', factor: 'D' },
      { id: 'q26I', text: 'Tento persuadir com entusiasmo', factor: 'I' },
      { id: 'q26S', text: 'Aceito para manter a harmonia do grupo', factor: 'S' },
      { id: 'q26C', text: 'Apresento dados que contradizem a decisão', factor: 'C' },
    ]},
  { id: 'q27', category: 'communication', question_text: 'Minhas apresentações são normalmente...',
    options: [
      { id: 'q27D', text: 'Rápidas, diretas e focadas no resultado', factor: 'D' },
      { id: 'q27I', text: 'Envolventes, cheias de histórias', factor: 'I' },
      { id: 'q27S', text: 'Calmas e focadas em como afeta as pessoas', factor: 'S' },
      { id: 'q27C', text: 'Detalhadas, com muitos dados e gráficos', factor: 'C' },
    ]},
  { id: 'q28', category: 'teamwork', question_text: 'Conflitos no time me fazem...',
    options: [
      { id: 'q28D', text: 'Querer resolver de forma assertiva imediatamente', factor: 'D' },
      { id: 'q28I', text: 'Tentar mediar e animar o grupo', factor: 'I' },
      { id: 'q28S', text: 'Me desconfortar e tentar suavizar a situação', factor: 'S' },
      { id: 'q28C', text: 'Analisar o que gerou o conflito', factor: 'C' },
    ]},
  { id: 'q29', category: 'work_style', question_text: 'Ao receber uma crítica, eu...',
    options: [
      { id: 'q29D', text: 'Avalio rapidamente se é relevante e sigo em frente', factor: 'D' },
      { id: 'q29I', text: 'Me preocupo com o que a pessoa pensa de mim', factor: 'I' },
      { id: 'q29S', text: 'Absorvo com calma e reflito', factor: 'S' },
      { id: 'q29C', text: 'Analiso se a crítica é factualmente correta', factor: 'C' },
    ]},
  { id: 'q30', category: 'leadership', question_text: 'Prefiro ser reconhecido por...',
    options: [
      { id: 'q30D', text: 'Atingir metas impossíveis', factor: 'D' },
      { id: 'q30I', text: 'Influenciar e inspirar pessoas', factor: 'I' },
      { id: 'q30S', text: 'Ser confiável e estar sempre presente', factor: 'S' },
      { id: 'q30C', text: 'Entregar com excelência e precisão', factor: 'C' },
    ]},
  { id: 'q31', category: 'decision_making', question_text: 'Quando tenho muitas tarefas, eu...',
    options: [
      { id: 'q31D', text: 'Priorizo as de maior impacto e delego o resto', factor: 'D' },
      { id: 'q31I', text: 'Peço ajuda e distribuo energicamente', factor: 'I' },
      { id: 'q31S', text: 'Faço uma por vez com calma e cuidado', factor: 'S' },
      { id: 'q31C', text: 'Crio uma lista detalhada e sigo à risca', factor: 'C' },
    ]},
  { id: 'q32', category: 'stress_response', question_text: 'Quando erro, minha primeira reação é...',
    options: [
      { id: 'q32D', text: 'Corrigir rapidamente e não olhar para trás', factor: 'D' },
      { id: 'q32I', text: 'Falar com alguém para me sentir melhor', factor: 'I' },
      { id: 'q32S', text: 'Me culpar e querer garantir que não afetou ninguém', factor: 'S' },
      { id: 'q32C', text: 'Investigar detalhadamente o que deu errado', factor: 'C' },
    ]},
  { id: 'q33', category: 'communication', question_text: 'Em e-mails e mensagens, costumo ser...',
    options: [
      { id: 'q33D', text: 'Curto e direto ao ponto', factor: 'D' },
      { id: 'q33I', text: 'Caloroso, com expressão pessoal', factor: 'I' },
      { id: 'q33S', text: 'Gentil e cuidadoso com o tom', factor: 'S' },
      { id: 'q33C', text: 'Formal, detalhado e sem ambiguidades', factor: 'C' },
    ]},
  { id: 'q34', category: 'teamwork', question_text: 'Para mim, o sucesso de um time é...',
    options: [
      { id: 'q34D', text: 'Bater a meta e superar concorrentes', factor: 'D' },
      { id: 'q34I', text: 'Ter um time engajado e apaixonado', factor: 'I' },
      { id: 'q34S', text: 'Manter um ambiente saudável e colaborativo', factor: 'S' },
      { id: 'q34C', text: 'Entregar produtos/serviços de alta qualidade', factor: 'C' },
    ]},
  { id: 'q35', category: 'work_style', question_text: 'Minha maior força no trabalho é...',
    options: [
      { id: 'q35D', text: 'Determinação e foco em resultados', factor: 'D' },
      { id: 'q35I', text: 'Comunicação e capacidade de engajar', factor: 'I' },
      { id: 'q35S', text: 'Paciência, confiabilidade e lealdade', factor: 'S' },
      { id: 'q35C', text: 'Análise crítica e atenção ao detalhe', factor: 'C' },
    ]},
  { id: 'q36', category: 'leadership', question_text: 'Quando um membro do time erra, eu...',
    options: [
      { id: 'q36D', text: 'Aponto diretamente e cobro solução', factor: 'D' },
      { id: 'q36I', text: 'Encorajo e ajudo a reconstruir a confiança', factor: 'I' },
      { id: 'q36S', text: 'Converso com empatia e paciência', factor: 'S' },
      { id: 'q36C', text: 'Reviso o processo para evitar reincidência', factor: 'C' },
    ]},
  { id: 'q37', category: 'decision_making', question_text: 'Mudanças bruscas de rota me fazem...',
    options: [
      { id: 'q37D', text: 'Adaptar rapidamente e virar oportunidade', factor: 'D' },
      { id: 'q37I', text: 'Ver o lado positivo e animar todos', factor: 'I' },
      { id: 'q37S', text: 'Sentir desconforto e precisar de tempo', factor: 'S' },
      { id: 'q37C', text: 'Questionar se a mudança é bem fundamentada', factor: 'C' },
    ]},
  { id: 'q38', category: 'communication', question_text: 'Ao explicar algo complexo, eu prefiro...',
    options: [
      { id: 'q38D', text: 'Ir direto ao que importa', factor: 'D' },
      { id: 'q38I', text: 'Usar metáforas e histórias envolventes', factor: 'I' },
      { id: 'q38S', text: 'Ir no ritmo da outra pessoa, com paciência', factor: 'S' },
      { id: 'q38C', text: 'Usar exemplos precisos e estrutura lógica', factor: 'C' },
    ]},
  { id: 'q39', category: 'teamwork', question_text: 'Numa equipe nova, eu costumo...',
    options: [
      { id: 'q39D', text: 'Tomar a iniciativa e mostrar liderança', factor: 'D' },
      { id: 'q39I', text: 'Fazer amizades e quebrar o gelo rapidamente', factor: 'I' },
      { id: 'q39S', text: 'Observar antes de agir e ganhar confiança', factor: 'S' },
      { id: 'q39C', text: 'Entender como as coisas funcionam antes de me posicionar', factor: 'C' },
    ]},
  { id: 'q40', category: 'stress_response', question_text: 'O que mais me energiza é...',
    options: [
      { id: 'q40D', text: 'Superar um grande desafio', factor: 'D' },
      { id: 'q40I', text: 'Estar com pessoas animadas e criativas', factor: 'I' },
      { id: 'q40S', text: 'Saber que ajudei alguém de verdade', factor: 'S' },
      { id: 'q40C', text: 'Concluir um projeto com perfeição', factor: 'C' },
    ]},
];

/**
 * Returns `count` questions shuffled, proportionally balanced across categories.
 */
export function selectBalancedQuestions(count = 40) {
  const byCategory = {};
  FULL_QUESTION_BANK.forEach(q => {
    if (!byCategory[q.category]) byCategory[q.category] = [];
    byCategory[q.category].push({ ...q });
  });

  Object.keys(byCategory).forEach(cat => {
    byCategory[cat] = byCategory[cat].sort(() => Math.random() - 0.5);
  });

  const categories = Object.keys(byCategory);
  const perCat = Math.floor(count / categories.length);
  const selected = [];
  categories.forEach(cat => selected.push(...byCategory[cat].slice(0, perCat)));

  const remaining = FULL_QUESTION_BANK
    .filter(q => !selected.find(s => s.id === q.id))
    .sort(() => Math.random() - 0.5);

  while (selected.length < count && remaining.length > 0) selected.push(remaining.shift());
  return selected.slice(0, count).sort(() => Math.random() - 0.5);
}

/**
 * Ipsative DISC scoring — produces 3 profiles:
 * - naturalScores  (Gráfico "Mais"): MOST selections
 * - adaptedScores  (Gráfico "Menos"): what is suppressed (LEAST selections drive this)
 * - summaryScores  (Gráfico Resumo): 60% natural + 40% adapted
 */
export function calculateDISCResults(answers, questions) {
  const natural  = { D: 0, I: 0, S: 0, C: 0 };
  const suppressed = { D: 0, I: 0, S: 0, C: 0 };
  const factors = ['D', 'I', 'S', 'C'];

  answers.forEach(answer => {
    const question = questions.find(q => q.id === answer.question_id);
    if (!question) return;

    const mostOpt  = question.options.find(o => o.id === answer.most);
    const leastOpt = question.options.find(o => o.id === answer.least);

    if (mostOpt)  natural[mostOpt.factor]     += 1;
    if (leastOpt) suppressed[leastOpt.factor] += 1;
  });

  // Adapted = inverse of suppressed (high suppression → low adaptation for that factor)
  const adapted = {};
  const totalSuppressed = Object.values(suppressed).reduce((a, b) => a + b, 0) || 1;
  factors.forEach(f => {
    adapted[f] = Math.max(0, totalSuppressed - suppressed[f]);
  });

  const normalize = (scores) => {
    const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
    const out = {};
    factors.forEach(f => { out[f] = Math.round((scores[f] / total) * 100); });
    return out;
  };

  const n = normalize(natural);
  const a = normalize(adapted);
  const summary = {};
  factors.forEach(f => { summary[f] = Math.round(n[f] * 0.6 + a[f] * 0.4); });

  const dominant  = factors.reduce((x, y) => n[x] > n[y] ? x : y);
  const secondary = factors.filter(f => f !== dominant).reduce((x, y) => n[x] > n[y] ? x : y);

  let adjEnergy = 0;
  factors.forEach(f => { adjEnergy += Math.abs(n[f] - a[f]); });
  adjEnergy = Math.round(adjEnergy / 4);

  return {
    natural_profile:   n,
    adapted_profile:   a,
    summary_profile:   summary,
    dominant_factor:   dominant,
    secondary_factor:  secondary,
    adjustment_energy: adjEnergy,
  };
}