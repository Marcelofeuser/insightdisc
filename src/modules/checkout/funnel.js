import { isSuperAdminAccess } from '@/modules/auth/access-control';

const CHECKOUT_PREVIEW_STORAGE_KEY = 'insightdisc.checkout.preview.v1';
const CHECKOUT_UPSELL_STORAGE_KEY = 'insightdisc.checkout.upsell.v1';

function safeReadStorage(key) {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function safeWriteStorage(key, payload) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // noop
  }
}

function toIsoNow() {
  return new Date().toISOString();
}

function toTimestamp(value) {
  const date = new Date(value);
  const timestamp = date.getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export function markCheckoutPreviewSeen({ source = '', assessmentId = '', reportType = '' } = {}) {
  const payload = {
    seen: true,
    source: String(source || '').trim(),
    assessmentId: String(assessmentId || '').trim(),
    reportType: String(reportType || '').trim().toLowerCase(),
    seenAt: toIsoNow(),
  };

  safeWriteStorage(CHECKOUT_PREVIEW_STORAGE_KEY, payload);
  return payload;
}

export function getCheckoutPreviewState({ maxAgeHours = 24 * 15 } = {}) {
  const stored = safeReadStorage(CHECKOUT_PREVIEW_STORAGE_KEY);
  if (!stored?.seen) {
    return {
      hasPreview: false,
      expired: false,
      source: '',
      seenAt: '',
      ageHours: null,
    };
  }

  const seenAt = String(stored.seenAt || '').trim();
  const seenAtTs = toTimestamp(seenAt);
  if (!seenAtTs) {
    return {
      hasPreview: false,
      expired: true,
      source: '',
      seenAt: '',
      ageHours: null,
    };
  }

  const ageMs = Math.max(0, Date.now() - seenAtTs);
  const ageHours = ageMs / (1000 * 60 * 60);
  const expired = Number(maxAgeHours) > 0 && ageHours > Number(maxAgeHours);

  return {
    hasPreview: !expired,
    expired,
    source: String(stored.source || '').trim(),
    assessmentId: String(stored.assessmentId || '').trim(),
    reportType: String(stored.reportType || '').trim(),
    seenAt,
    ageHours,
  };
}

export function requiresCheckoutPreview(access) {
  if (isSuperAdminAccess(access)) return false;
  if (access?.hasPaidPurchase) return false;
  return true;
}

export function resolveCheckoutUpsellOffer(checkoutItemKey = '') {
  const item = String(checkoutItemKey || '').trim().toLowerCase();
  if (!item) return null;

  if (item === 'professional' || item === 'profissional') {
    return {
      key: 'upsell_business',
      title: 'Upgrade imediato para Business',
      copy:
        'Ative Team Map, Coach e AI Lab avançado com condição exclusiva pós-compra.',
      ctaLabel: 'Quero Business com desconto',
      ctaPath: '/checkout/business?offer=upsell_business',
      downsell: {
        key: 'downsell_business',
        title: 'Oferta de recuperação',
        copy:
          'Última chance: Business com desconto maior apenas nesta etapa.',
        ctaLabel: 'Ativar Business (downsell)',
        ctaPath: '/checkout/business?offer=downsell_business',
      },
    };
  }

  if (item === 'business') {
    return {
      key: 'upsell_diamond',
      title: 'Upgrade para Diamond',
      copy:
        'Escala ilimitada para operação enterprise com prioridade máxima.',
      ctaLabel: 'Quero Diamond com desconto',
      ctaPath: '/checkout/diamond?offer=upsell_diamond',
      downsell: {
        key: 'downsell_diamond',
        title: 'Oferta final Diamond',
        copy:
          'Condição especial de recuperação para subir ao Diamond agora.',
        ctaLabel: 'Ativar Diamond (downsell)',
        ctaPath: '/checkout/diamond?offer=downsell_diamond',
      },
    };
  }

  return null;
}

export function getCheckoutUpsellState() {
  const state = safeReadStorage(CHECKOUT_UPSELL_STORAGE_KEY);
  if (!state || typeof state !== 'object') {
    return {
      seen: {},
      converted: {},
      dismissed: {},
    };
  }

  return {
    seen: state.seen && typeof state.seen === 'object' ? state.seen : {},
    converted: state.converted && typeof state.converted === 'object' ? state.converted : {},
    dismissed: state.dismissed && typeof state.dismissed === 'object' ? state.dismissed : {},
  };
}

function updateCheckoutUpsellState(mutator) {
  const current = getCheckoutUpsellState();
  const next = mutator(current);
  safeWriteStorage(CHECKOUT_UPSELL_STORAGE_KEY, next);
  return next;
}

export function markCheckoutUpsellSeen(offerKey = '') {
  const key = String(offerKey || '').trim();
  if (!key) return;
  updateCheckoutUpsellState((state) => ({
    ...state,
    seen: {
      ...state.seen,
      [key]: toIsoNow(),
    },
  }));
}

export function markCheckoutUpsellDismissed(offerKey = '') {
  const key = String(offerKey || '').trim();
  if (!key) return;
  updateCheckoutUpsellState((state) => ({
    ...state,
    dismissed: {
      ...state.dismissed,
      [key]: toIsoNow(),
    },
  }));
}

export function markCheckoutUpsellConverted(offerKey = '') {
  const key = String(offerKey || '').trim();
  if (!key) return;
  updateCheckoutUpsellState((state) => ({
    ...state,
    converted: {
      ...state.converted,
      [key]: toIsoNow(),
    },
  }));
}

export function hasCheckoutUpsellBeenSeen(offerKey = '') {
  const key = String(offerKey || '').trim();
  if (!key) return false;
  const state = getCheckoutUpsellState();
  return Boolean(state.seen[key]);
}

export function hasCheckoutUpsellBeenDismissed(offerKey = '') {
  const key = String(offerKey || '').trim();
  if (!key) return false;
  const state = getCheckoutUpsellState();
  return Boolean(state.dismissed[key]);
}
