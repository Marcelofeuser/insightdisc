const V21_CORPORATE_PLANS_ENABLED =
  String(import.meta.env.VITE_V21_CORPORATE_PLANS || '').trim().toLowerCase() === 'true';

export const V21_FLAGS = Object.freeze({
  CORPORATE_PLANS: V21_CORPORATE_PLANS_ENABLED,
});

export const V21_PLAN_KEYS = Object.freeze({
  BUSINESS_CORPORATION: 'business_corporation',
  DIAMOND_CONSULTING: 'diamond_consulting',
});

export const V21_WHITELABEL_LABELS = Object.freeze({
  OPTIONAL_ADDON: 'White-label (add-on opcional)',
  INCLUDED: 'White-label incluso',
  INCLUDED_ADVANCED: 'White-label avançado incluso',
});

export const V21_PLANS = Object.freeze({
  [V21_PLAN_KEYS.BUSINESS_CORPORATION]: Object.freeze({
    id: V21_PLAN_KEYS.BUSINESS_CORPORATION,
    name: 'Business Corporation',
    price: 'Sob consulta',
    audience: 'RH estruturado, múltiplas áreas e governança corporativa',
    cta: 'Falar com Vendas',
    ctaKind: 'sales',
    badge: 'CORPORATE',
    features: [
      'Uso ilimitado sob política de uso justo',
      'White-label incluso (marca no relatório)',
      'Governança de times e permissões (sob desenho)',
      'Foco em equilíbrio organizacional e contratações futuras',
      'Suporte prioritário e onboarding guiado',
    ],
    entitlements: Object.freeze({
      fairUseUnlimited: true,
      whiteLabelIncluded: true,
    }),
  }),
  [V21_PLAN_KEYS.DIAMOND_CONSULTING]: Object.freeze({
    id: V21_PLAN_KEYS.DIAMOND_CONSULTING,
    name: 'Diamond Consulting',
    price: 'Sob consulta',
    audience: 'Consultoria premium e implantação completa em escala',
    cta: 'Falar com Consultor',
    ctaKind: 'sales',
    badge: 'DIAMOND',
    features: [
      'Tudo do Business Corporation',
      'White-label avançado incluso',
      'Acompanhamento consultivo (RH / Liderança / Cultura)',
      'Estrutura editorial + playbooks de aplicação',
      'Prioridade máxima de suporte e evolução',
    ],
    entitlements: Object.freeze({
      fairUseUnlimited: true,
      whiteLabelIncluded: true,
    }),
  }),
});
