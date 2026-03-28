export const PLANS = Object.freeze({
  disc: {
    key: 'disc',
    enginePlanCode: 'disc',
    name: 'DISC INDIVIDUAL',
    price: 'R$ 98',
    billingLabel: 'pagamento único',
    ctaLabel: 'Gerar meu relatório',
    checkoutPath: '/checkout/disc',
    benefits: ['1 relatório DISC completo', 'Download em PDF', 'Sem acesso à plataforma'],
    description: 'Avaliação individual com entrega imediata de relatório completo em PDF.',
    indication: 'Ideal para uso individual pontual',
  },
  personal: {
    key: 'personal',
    enginePlanCode: 'personal',
    name: 'PERSONAL',
    price: 'R$ 197',
    billingLabel: '2 meses',
    ctaLabel: 'Acompanhar minha evolução',
    checkoutPath: '/checkout/personal',
    benefits: ['Acesso à plataforma por 2 meses', '1 relatório por ciclo mensal', 'Histórico e evolução'],
    description: 'Plano para evolução pessoal contínua com histórico e acompanhamento de comportamento.',
    indication: 'Autoconhecimento com recorrência leve',
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
    benefits: ['Tudo do Personal', '10 créditos por mês', 'Dossiê completo', 'Recursos profissionais'],
    description: 'Plano técnico para especialistas que precisam de análise consistente e escala operacional.',
    indication: 'RH, consultores e especialistas DISC',
  },
  business: {
    key: 'business',
    enginePlanCode: 'business',
    name: 'BUSINESS',
    price: 'R$ 598',
    billingLabel: '/mês',
    ctaLabel: 'Adquirir plano business',
    checkoutPath: '/checkout/business',
    benefits: ['Tudo do Profissional', '25 créditos por mês', 'Team Map', 'Recursos para equipes'],
    description: 'Leitura organizacional para lideranças, RH e decisões estratégicas de equipe.',
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
    benefits: ['Tudo do Business', 'Uso ilimitado', 'Ideal para empresas acima de 50 funcionários'],
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
