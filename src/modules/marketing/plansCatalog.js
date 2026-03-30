export const PLANS = Object.freeze({
  disc: {
    key: 'disc',
    enginePlanCode: 'disc',
    name: 'DISC INDIVIDUAL',
    price: 'R$ 98',
    billingLabel: 'pagamento único',
    ctaLabel: 'Gerar meu relatório agora',
    checkoutPath: '/checkout/disc',
    benefits: [
      'Relatório DISC completo com leitura estruturada',
      'Download profissional em PDF pronto para usar',
      'Acesso imediato — resultado em minutos',
      'Sem assinatura, sem compromisso',
    ],
    description: 'Para quem precisa de uma leitura comportamental objetiva agora, sem assinatura.',
    indication: 'Avaliação pontual e imediata',
  },
  personal: {
    key: 'personal',
    enginePlanCode: 'personal',
    name: 'PERSONAL',
    price: 'R$ 79,90',
    billingLabel: '2 meses',
    ctaLabel: 'Começar minha evolução',
    checkoutPath: '/checkout/plan/personal',
    benefits: [
      'Acesso à plataforma por 2 meses',
      '1 relatório por ciclo mensal',
      'Histórico de evolução comportamental',
      'Acompanhamento contínuo do perfil',
      'Direcionamentos práticos de desenvolvimento pessoal',
    ],
    description: 'Para quem quer se conhecer melhor e acompanhar sua evolução comportamental ao longo do tempo.',
    indication: 'Autoconhecimento com acompanhamento',
  },
  insider: {
    key: 'insider',
    enginePlanCode: 'insider',
    name: 'INSIDER',
    price: 'R$ 129,90',
    billingLabel: '/mês',
    ctaLabel: 'Assinar Insider',
    checkoutPath: '/checkout/plan/insider',
    benefits: [
      'Tudo do Personal incluso',
      'Relatórios mais completos com IA',
      'Histórico e evolução comportamental',
      'Comparação entre avaliações',
      'Insights mais profundos de perfil',
      'Recomendações estratégicas personalizadas',
    ],
    description: 'Plano avançado para usuários que desejam mais profundidade e consistência na análise DISC.',
    indication: 'Uso individual avançado com foco em profundidade',
    highlight: false,
  },
  profissional: {
    key: 'profissional',
    enginePlanCode: 'professional',
    name: 'PROFISSIONAL',
    price: 'R$ 197',
    billingLabel: '/mês',
    ctaLabel: 'Começar agora — 7 dias grátis',
    checkoutPath: '/checkout/plan/professional',
    highlight: 'Mais escolhido por RH',
    benefits: [
      '10 avaliações DISC por mês — renova automaticamente',
      'Envie avaliações para candidatos e colaboradores',
      'Dossiê comportamental completo para devolutiva',
      'Compare perfis lado a lado com inteligência',
      'Relatórios técnicos prontos para apresentar',
      'Direcionamentos comportamentais para decisões de pessoas',
      'AI Lab para análises mais profundas (preview)',
      'Exportação em PDF profissional',
    ],
    description: 'A ferramenta que profissionais de RH usam para mapear, comparar e desenvolver pessoas com precisão.',
    indication: 'RH, consultores e gestores de pessoas',
  },
  business: {
    key: 'business',
    enginePlanCode: 'business',
    name: 'BUSINESS',
    price: 'R$ 397',
    billingLabel: '/mês',
    ctaLabel: 'Quero gestão de equipe',
    checkoutPath: '/checkout/plan/business',
    benefits: [
      'Tudo do Profissional incluso',
      '25 avaliações por mês — para equipes maiores',
      'Team Map visual — veja o perfil coletivo da equipe',
      'Análise comportamental em grupo por contexto',
      'Apoio direto à liderança e tomada de decisão',
      'Identifique lacunas culturais e de performance',
      'Estrutura completa para RH estratégico',
      'Gestão de múltiplos usuários',
    ],
    description: 'Para empresas que precisam de visão estratégica sobre equipes, cultura e decisões de liderança.',
    indication: 'Empresas com equipes a desenvolver',
  },
  diamond: {
    key: 'diamond',
    enginePlanCode: 'diamond',
    name: 'DIAMOND',
    price: 'R$ 697',
    billingLabel: '/mês',
    ctaLabel: 'Falar com consultor',
    checkoutPath: '/checkout/plan/diamond',
    benefits: [
      'Tudo do Business incluso',
      'Avaliações ilimitadas — sem teto de uso',
      'Operação DISC em escala empresarial',
      'Para empresas com mais de 50 colaboradores',
    ],
    description: 'Para operações de RH em larga escala que não podem ter limite no volume de avaliações.',
    indication: 'Empresas acima de 50 colaboradores',
  },
});

export const PLAN_ORDER = Object.freeze(['disc', 'personal', 'insider', 'profissional', 'business', 'diamond']);

export function resolveCheckoutPlan(slug = '', tier = '') {
  const normalizedSlug = String(slug || '').toLowerCase();
  const normalizedTier = String(tier || '').toLowerCase();
  if (normalizedSlug === 'professional') return PLANS.profissional;
  if (normalizedSlug === 'profissional') return PLANS.profissional;
  if (normalizedSlug === 'insider') return PLANS.insider;

  if (normalizedSlug === 'business' && normalizedTier === 'diamond') {
    return PLANS.diamond;
  }

  return PLANS[normalizedSlug] || null;
}
