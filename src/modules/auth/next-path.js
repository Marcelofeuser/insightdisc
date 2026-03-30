import { createPageUrl } from '@/utils';

export const DEFAULT_NEXT_PATH = '/';

const KNOWN_TOP_LEVEL_SEGMENTS = new Set([
  'admin',
  'admindashboard',
  'analyticsdashboard',
  'app',
  'archetypes',
  'auth',
  'assessment',
  'assessments',
  'autoconhecimento',
  'avaliacoes',
  'brandingsettings',
  'c',
  'candidateonboarding',
  'checkout',
  'checkoutsuccess',
  'compare-profiles',
  'comparacao-de-perfis-disc',
  'consultores',
  'credits',
  'dashboard',
  'dashboardlegacy',
  'demo',
  'disc-para-empresas',
  'disc-para-recrutamento',
  'dossie',
  'dossie-comportamental',
  'dossier',
  'empresa',
  'forgotpassword',
  'freeassessment',
  'freeresults',
  'gift',
  'home',
  'jobmatching',
  'leadsdashboard',
  'lideres',
  'lgpd',
  'login',
  'mapa-comportamental-de-equipe',
  'myassessments',
  'organization-report',
  'painel',
  'palette-test',
  'panel',
  'premiumassessment',
  'pricing',
  'privacy',
  'publicreport',
  'r',
  'recrutamento',
  'report',
  'reports',
  'rh',
  'sendassessment',
  'signup',
  'startfree',
  'super-admin',
  'super-admin-login',
  'teammapping',
  'team-map',
  'terms',
  'teste-disc-com-relatorio',
  'vendas',
]);

function normalizePathname(pathname = '') {
  const raw = String(pathname || '').trim();
  if (!raw) return '/';
  const withLeadingSlash = raw.startsWith('/') ? raw : `/${raw}`;
  return withLeadingSlash === '/' ? '/' : withLeadingSlash.replace(/\/+$/, '');
}

function getTopLevelSegment(pathname = '') {
  const normalized = normalizePathname(pathname).toLowerCase();
  if (normalized === '/') return '';
  return normalized.slice(1).split('/')[0] || '';
}

export function isAuthEntryPath(pathname = '') {
  const normalized = normalizePathname(pathname).toLowerCase();
  return (
    normalized === '/login' ||
    normalized.startsWith('/login/') ||
    normalized === '/auth/callback' ||
    normalized.startsWith('/auth/callback/') ||
    normalized === '/signup' ||
    normalized.startsWith('/signup/')
  );
}

function hasKnownTopLevelSegment(pathname = '') {
  const topLevelSegment = getTopLevelSegment(pathname);
  if (!topLevelSegment) return true;
  return KNOWN_TOP_LEVEL_SEGMENTS.has(topLevelSegment);
}

export function sanitizeNextPath(nextPath, fallback = DEFAULT_NEXT_PATH) {
  const safeFallback =
    fallback === '' ? '' : normalizePathname(fallback || DEFAULT_NEXT_PATH);
  const raw = String(nextPath || '').trim();

  if (!raw) return safeFallback;
  if (!raw.startsWith('/') || raw.startsWith('//')) return safeFallback;

  let parsed;
  try {
    parsed = new URL(raw, 'https://insightdisc.local');
  } catch {
    return safeFallback;
  }

  const pathname = normalizePathname(parsed.pathname);
  if (isAuthEntryPath(pathname)) return safeFallback;
  if (!hasKnownTopLevelSegment(pathname)) return safeFallback;

  const search = parsed.search || '';
  const hash = parsed.hash || '';
  return `${pathname}${search}${hash}`;
}

export function buildLoginRedirectUrl({ pathname = '', search = '' } = {}) {
  const nextCandidate = `${String(pathname || '')}${String(search || '')}`;
  const next = sanitizeNextPath(nextCandidate, DEFAULT_NEXT_PATH);
  return `${createPageUrl('Login')}?next=${encodeURIComponent(next)}`;
}
