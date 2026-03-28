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
    description: 'Ideal para quem busca uma leitura objetiva e rápida do próprio perfil comportamental.',
  },
  personal: {
    key: 'personal',
    enginePlanCode: 'personal',
    name: 'PERSONAL',
    price: 'R$ 197',
    billingLabel: '2 meses',
    ctaLabel: 'Acompanhar minha evolução',
    checkoutPath: '/checkout/personal',
    benefits: ['Acesso à plataforma por 2 meses', '1 relatório por ciclo mensal (total 2)', 'Histórico e evolução'],
    description: 'Acompanhamento contínuo para transformar autoconhecimento em evolução prática.',
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
    benefits: ['Tudo do Personal', '10 créditos/mês', 'Leitura técnica', 'Dossiê completo'],
    description: 'Plano técnico para RH, analistas, consultores e especialistas em devolutiva estruturada.',
  },
  business: {
    key: 'business',
    enginePlanCode: 'business',
    name: 'BUSINESS',
    price: 'R$ 598',
    billingLabel: '/mês',
    ctaLabel: 'Adquirir plano business',
    checkoutPath: '/checkout/business',
    benefits: ['Tudo do Profissional', '25 créditos/mês', 'Team Map'],
    description: 'Visão de equipe e operação em escala para áreas de RH, liderança e gestão estratégica.',
  },
  diamond: {
    key: 'diamond',
    enginePlanCode: 'diamond',
    name: 'DIAMOND',
    price: 'R$ 998',
    billingLabel: '/mês',
    ctaLabel: 'Escalar sem limites',
    checkoutPath: '/checkout/diamond',
    benefits: ['Tudo do Business', 'Créditos ilimitados'],
    description: 'Máxima capacidade para operações de grande volume com inteligência comportamental contínua.',
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
