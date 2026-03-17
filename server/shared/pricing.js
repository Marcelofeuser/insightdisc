const DEFAULT_CURRENCY = 'BRL';

export const PRODUCTS = Object.freeze({
  SINGLE_PRO: Object.freeze({
    id: 'single',
    name: 'Avaliação DISC Profissional',
    description: 'Avaliação completa com 40 questões e relatório profissional.',
    price: 79.9,
    currency: DEFAULT_CURRENCY,
  }),
  REPORT_UNLOCK: Object.freeze({
    id: 'report-unlock',
    name: 'Desbloquear Relatório Completo',
    description: 'Libera relatório completo da avaliação.',
    price: 79.9,
    currency: DEFAULT_CURRENCY,
  }),
  GIFT: Object.freeze({
    id: 'gift',
    name: 'Presente DISC',
    description: 'Compre agora e personalize o presente após a confirmação do pagamento.',
    price: 79.9,
    currency: DEFAULT_CURRENCY,
  }),
  PACK_10: Object.freeze({
    id: 'pack-10',
    name: 'Pacote 10 Avaliações',
    description: 'Ideal para squads pequenos e consultorias.',
    credits: 10,
    price: 290,
    currency: DEFAULT_CURRENCY,
  }),
  PACK_50: Object.freeze({
    id: 'pack-50',
    name: 'Pacote 50 Avaliações',
    description: 'Escala com melhor custo por avaliação.',
    credits: 50,
    price: 1190,
    currency: DEFAULT_CURRENCY,
  }),
  PACK_100: Object.freeze({
    id: 'pack-100',
    name: 'Pacote 100 Avaliações',
    description: 'Volume alto para operação recorrente e RH em escala.',
    credits: 100,
    price: 1990,
    currency: DEFAULT_CURRENCY,
  }),
  BUSINESS_MONTHLY: Object.freeze({
    id: 'business-monthly',
    name: 'Assinatura Business Mensal',
    description: 'Plano contínuo para operação profissional com painel SaaS.',
    price: 199,
    currency: DEFAULT_CURRENCY,
    billingPeriod: 'mês',
  }),
});

const productEntries = Object.values(PRODUCTS);

export const PRODUCTS_BY_ID = Object.freeze(
  productEntries.reduce((accumulator, product) => {
    accumulator[product.id] = product;
    return accumulator;
  }, {})
);

export const PRODUCT_ALIASES = Object.freeze({
  business: PRODUCTS.BUSINESS_MONTHLY.id,
  report: PRODUCTS.REPORT_UNLOCK.id,
  'single-pro': PRODUCTS.SINGLE_PRO.id,
  report_unlock: PRODUCTS.REPORT_UNLOCK.id,
});

export function resolveProductId(rawProduct = '') {
  const normalized = String(rawProduct || '').trim().toLowerCase();
  if (!normalized) return '';
  if (PRODUCTS_BY_ID[normalized]) return normalized;
  return PRODUCT_ALIASES[normalized] || '';
}

export function getProductById(rawProduct = '') {
  const resolvedId = resolveProductId(rawProduct) || String(rawProduct || '').trim().toLowerCase();
  return PRODUCTS_BY_ID[resolvedId] || null;
}

export function formatPriceBRL(value, options = {}) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '-';
  const minimumFractionDigits = Number.isInteger(amount) ? 2 : 2;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: DEFAULT_CURRENCY,
    minimumFractionDigits,
    maximumFractionDigits: 2,
    ...options,
  }).format(amount);
}
