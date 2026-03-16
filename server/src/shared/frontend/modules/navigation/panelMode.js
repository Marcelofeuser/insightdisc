import { EXPERIENCE_ROLE, resolveExperienceRole } from '@/modules/dashboard/experience-role';

export const PANEL_MODE = Object.freeze({
  BUSINESS: 'business',
  PROFESSIONAL: 'professional',
  PERSONAL: 'personal',
});

export const PANEL_MODE_ORDER = Object.freeze([
  PANEL_MODE.BUSINESS,
  PANEL_MODE.PROFESSIONAL,
  PANEL_MODE.PERSONAL,
]);

const STORAGE_KEY_PREFIX = 'insightdisc.panel-mode.v2';

export const PANEL_MODE_META = Object.freeze({
  [PANEL_MODE.BUSINESS]: {
    label: 'Business',
    title: 'Business Mode',
    description:
      'Para RH, gestores e operações de equipe com foco em avaliação, decisão e resultados.',
  },
  [PANEL_MODE.PROFESSIONAL]: {
    label: 'Professional',
    title: 'Professional Mode',
    description:
      'Para analistas, consultores e coaches com foco em interpretação DISC e profundidade técnica.',
  },
  [PANEL_MODE.PERSONAL]: {
    label: 'Personal',
    title: 'Personal Mode',
    description:
      'Para autoconhecimento, leitura do próprio perfil e desenvolvimento pessoal contínuo.',
  },
});

function resolveStorageKey(scopeKey = 'default') {
  return `${STORAGE_KEY_PREFIX}:${String(scopeKey || 'default')}`;
}

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function normalizePanelMode(value, fallback = null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (PANEL_MODE_ORDER.includes(normalized)) {
    return normalized;
  }
  return fallback;
}

export function getStoredPanelMode(scopeKey = 'default') {
  if (!canUseStorage()) return null;
  return normalizePanelMode(window.localStorage.getItem(resolveStorageKey(scopeKey)));
}

export function persistPanelMode(mode, scopeKey = 'default') {
  if (!canUseStorage()) return;
  const normalized = normalizePanelMode(mode);
  if (!normalized) return;
  window.localStorage.setItem(resolveStorageKey(scopeKey), normalized);
}

export function resolveAutoPanelMode(access) {
  const role = resolveExperienceRole(access);
  if (role === EXPERIENCE_ROLE.PLATFORM_ADMIN) {
    return PANEL_MODE.BUSINESS;
  }
  if (role === EXPERIENCE_ROLE.PROFESSIONAL) {
    return PANEL_MODE.PROFESSIONAL;
  }
  return PANEL_MODE.PERSONAL;
}

export function resolvePanelMode(access, options = {}) {
  const scopeKey = options?.scopeKey || 'default';
  const preferred = normalizePanelMode(options?.preferredMode);
  if (preferred) return preferred;

  const stored = getStoredPanelMode(scopeKey);
  if (stored) return stored;

  return resolveAutoPanelMode(access);
}
