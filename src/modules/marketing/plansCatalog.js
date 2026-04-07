export const PLANS = Object.freeze({
  disc: {
    key: 'disc',
    enginePlanCode: 'disc',
    name: 'DISC Individual — Relatório Completo',
    price: 'R$ 59,90',
    billingLabel: 'pagamento único',
    ctaLabel: 'Comprar DISC Individual',
    checkoutPath: '/checkout/disc',
    benefits: [
      'Relatório completo instantâneo (tela + PDF)',
      'Análise comportamental detalhada',
      'Perfil predominante e secundário',
      'Pontos fortes e de atenção',
      'Aplicação pessoal e profissional',
    ],
    description:
      'Avaliação comportamental DISC com entrega imediata de um relatório detalhado, ideal para autoconhecimento e tomada de decisão.',
    indication: 'Avaliação pontual e imediata',
  },
  personal: {
    key: 'personal',
    enginePlanCode: 'personal',
    name: 'Plano Personal — Uso contínuo individual',
    price: 'R$ 99,90',
    billingLabel: '/mês',
    ctaLabel: 'Assinar Personal',
    checkoutPath: '/checkout/plan/personal',
    benefits: [
      'Acesso contínuo à plataforma',
      'Geração de relatórios individuais',
      'Histórico de avaliações',
      'Evolução comportamental ao longo do tempo',
    ],
    description:
      'Ideal para quem deseja acompanhar evolução comportamental e utilizar o DISC de forma recorrente no dia a dia.',
    indication: 'Autoconhecimento com acompanhamento',
  },
  insider: {
    key: 'insider',
    enginePlanCode: 'insider',
    name: 'Plano Insider — Mais recursos e profundidade',
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
    description:
      'Para usuários que desejam mais controle, análise e profundidade na utilização do DISC.',
    indication: 'Uso individual avançado com foco em profundidade',
    highlight: false,
  },
  profissional: {
    key: 'profissional',
    enginePlanCode: 'professional',
    name: 'Plano Professional — Aplicação profissional',
    price: 'R$ 199,90',
    billingLabel: '/mês',
    ctaLabel: 'Assinar Professional',
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
    description:
      'Plano ideal para uso individual com aplicação profissional, relatórios e 10 créditos mensais.',
    indication: 'RH, consultores e gestores de pessoas',
  },
  business: {
    key: 'business',
    enginePlanCode: 'business',
    name: 'Plano Business — Uso empresarial',
    price: 'R$ 399,90',
    billingLabel: '/mês',
    ctaLabel: 'Assinar Business',
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
    description:
      'Plano voltado para empresas e profissionais que atuam com equipes, clientes e contexto corporativo.',
    indication: 'Empresas com equipes a desenvolver',
  },
  business_corporation: {
    key: 'business_corporation',
    enginePlanCode: 'business_corporation',
    name: 'Business Corporation — Estrutura corporativa completa',
    price: 'R$ 999,90',
    billingLabel: '/mês',
    ctaLabel: 'Assinar Business Corporation',
    checkoutPath: '/checkout/plan/business-corporation',
    benefits: [
      'Uso ilimitado sob política de uso justo',
      'Operação em larga escala',
      'Gestão completa de usuários',
      'White Label incluso',
      'Ideal para empresas estruturadas',
    ],
    description:
      'Solução corporativa com uso ilimitado, recursos avançados e White Label incluso.',
    indication: 'Empresas estruturadas e operação em escala',
  },
  diamond_consulting: {
    key: 'diamond_consulting',
    enginePlanCode: 'diamond_consulting',
    name: 'Diamond Consulting — Nível estratégico premium',
    price: 'R$ 9.990,00',
    billingLabel: '/mês',
    ctaLabel: 'Assinar Diamond Consulting',
    checkoutPath: '/checkout/plan/diamond-consulting',
    benefits: [
      'Consultoria estratégica especializada',
      'Acompanhamento com psicanalista (interpretação clínica e estratégica)',
      'Uso avançado da plataforma',
      'Estrutura para alta performance',
      'Aplicação em nível executivo',
      'White Label incluso',
    ],
    description:
      'Solução premium com acompanhamento estratégico (inclui psicanalista) e estrutura avançada para operação consultiva.',
    indication: 'Operação executiva e consultiva premium',
  },
  diamond: {
    key: 'diamond',
    enginePlanCode: 'diamond_consulting',
    name: 'Diamond Consulting — Nível estratégico premium',
    price: 'R$ 9.990,00',
    billingLabel: '/mês',
    ctaLabel: 'Assinar Diamond Consulting',
    checkoutPath: '/checkout/plan/diamond-consulting',
    benefits: [
      'Consultoria estratégica especializada',
      'Acompanhamento com psicanalista (interpretação clínica e estratégica)',
      'Uso avançado da plataforma',
      'Estrutura para alta performance',
      'Aplicação em nível executivo',
      'White Label incluso',
    ],
    description:
      'Solução premium com acompanhamento estratégico (inclui psicanalista) e estrutura avançada para operação consultiva.',
    indication: 'Operação executiva e consultiva premium',
  },
});

export const PLAN_ORDER = Object.freeze([
  'disc',
  'personal',
  'insider',
  'profissional',
  'business',
  'business_corporation',
  'diamond_consulting',
]);

export function resolveCheckoutPlan(slug = '', tier = '') {
  const normalizedSlug = String(slug || '').toLowerCase();
  const normalizedTier = String(tier || '').toLowerCase();
  if (normalizedSlug === 'professional') return PLANS.profissional;
  if (normalizedSlug === 'profissional') return PLANS.profissional;
  if (normalizedSlug === 'insider') return PLANS.insider;
  if (normalizedSlug === 'business-corporation' || normalizedSlug === 'business_corporation') return PLANS.business_corporation;
  if (normalizedSlug === 'diamond-consulting' || normalizedSlug === 'diamond_consulting') return PLANS.diamond_consulting;
  if (normalizedSlug === 'diamond') return PLANS.diamond_consulting || PLANS.diamond;

  if (normalizedSlug === 'business' && normalizedTier === 'diamond') {
    return PLANS.diamond_consulting || PLANS.diamond;
  }

  return PLANS[normalizedSlug] || null;
}
