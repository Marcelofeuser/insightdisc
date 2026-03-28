export const PLANS = Object.freeze({
  disc: {
    key: 'disc',
    enginePlanCode: 'disc',
    name: 'DISC INDIVIDUAL',
    price: 'R$ 98',
    billingLabel: 'pagamento único',
    ctaLabel: 'Gerar meu relatório',
    checkoutPath: '/checkout/disc',
    benefits: [
      '1 relatório DISC completo com leitura estruturada',
      'Download profissional em PDF',
      'Acesso imediato ao relatório',
      'Sem acesso à plataforma contínua',
    ],
    description: 'Avaliação individual com entrega imediata para quem quer leitura objetiva sem assinatura.',
    indication: 'Uso individual pontual e rápido',
  },
  personal: {
    key: 'personal',
    enginePlanCode: 'personal',
    name: 'PERSONAL',
    price: 'R$ 197',
    billingLabel: '2 meses',
    ctaLabel: 'Acompanhar minha evolução',
    checkoutPath: '/checkout/personal',
    benefits: [
      'Acesso à plataforma por 2 meses',
      '1 relatório por ciclo mensal (não acumulativo)',
      'Histórico de evolução comportamental',
      'Acompanhamento contínuo do perfil',
      'Coach DISC com recomendações práticas',
    ],
    description: 'Plano pessoal para autoconhecimento contínuo com acompanhamento do perfil e orientação prática.',
    indication: 'Autoconhecimento com evolução guiada',
  },
  profissional: {
    key: 'profissional',
    enginePlanCode: 'professional',
    name: 'PROFISSIONAL',
    price: 'R$ 298',
    billingLabel: '/mês',
    ctaLabel: 'Adquirir acesso profissional',
    checkoutPath: '/checkout/profissional',
    highlight: 'Mais escolhido',
    benefits: [
      'Tudo do Personal',
      '10 créditos mensais com renovação automática',
      'Envio de avaliações DISC para clientes e candidatos',
      'Gestão completa das avaliações realizadas',
      'Comparação inteligente de perfis comportamentais',
      'Dossiê comportamental completo para devolutiva',
      'Relatórios técnicos avançados com leitura aplicada',
      'Biblioteca DISC aplicada (conteúdo em expansão contínua)',
      'Arquétipos comportamentais (evolução contínua de funcionalidades)',
      'Coach DISC com recomendações práticas',
      'AI Lab para aprofundamento analítico (preview de IA)',
      'Exportação profissional em PDF',
    ],
    description: 'Plano técnico para especialistas que precisam de consistência analítica e produtividade comercial.',
    indication: 'RH, consultores, analistas e coaches',
  },
  business: {
    key: 'business',
    enginePlanCode: 'business',
    name: 'BUSINESS',
    price: 'R$ 598',
    billingLabel: '/mês',
    ctaLabel: 'Adquirir plano business',
    checkoutPath: '/checkout/business',
    benefits: [
      'Tudo do Profissional (herança completa)',
      '25 créditos mensais com renovação automática',
      'Team Map com visual estratégico de equipe',
      'Análise de perfis em grupo por contexto',
      'Comparação entre colaboradores',
      'Apoio à liderança e tomada de decisão',
      'Visão estratégica para equipes e cultura',
      'Aplicação DISC em processos internos',
      'Estrutura para RH e gestão de pessoas',
      'Gestão de múltiplos usuários',
    ],
    description: 'Camada corporativa com herança completa do Profissional e recursos para decisões em escala de equipe.',
    indication: 'Empresas e operações com equipes',
  },
  diamond: {
    key: 'diamond',
    enginePlanCode: 'diamond',
    name: 'DIAMOND',
    price: 'R$ 998',
    billingLabel: '/mês',
    ctaLabel: 'Escalar sem limites',
    checkoutPath: '/checkout/diamond',
    benefits: [
      'Tudo do Business',
      'Uso ilimitado de créditos',
      'Operação DISC em escala empresarial',
      'Ideal para empresas acima de 50 colaboradores',
    ],
    description: 'Camada enterprise para operações amplas com alta demanda de análises comportamentais.',
    indication: 'Empresas acima de 50 colaboradores',
  },
});

export const PLAN_ORDER = Object.freeze(['disc', 'personal', 'profissional', 'business', 'diamond']);

export function resolveCheckoutPlan(slug = '', tier = '') {
  const normalizedSlug = String(slug || '').toLowerCase();
  const normalizedTier = String(tier || '').toLowerCase();
  if (normalizedSlug === 'professional') return PLANS.profissional;
  if (normalizedSlug === 'profissional') return PLANS.profissional;

  if (normalizedSlug === 'business' && normalizedTier === 'diamond') {
    return PLANS.diamond;
  }

  return PLANS[normalizedSlug] || null;
}
