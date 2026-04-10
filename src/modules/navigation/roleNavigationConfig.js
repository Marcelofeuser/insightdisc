/**
 * roleNavigationConfig.js — Construção da navegação lateral por role/plano
 *
 * V3.0: Quando V3_FLAGS.PLAN_DIFFERENTIATION está ativo, a navegação é construída
 * a partir de dashboardConfigByPlan (com estados enabled/locked) em vez de
 * deduzida a partir de capabilities.
 *
 * O sistema V2 permanece intacto como fallback.
 */

import {
  BarChart3,
  BookMarked,
  BookOpen,
  BrainCircuit,
  Briefcase,
  Building2,
  ClipboardList,
  Clock,
  FileBarChart2,
  FileDown,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Network,
  Palette,
  Radar,
  Sparkles,
  Stethoscope,
  TrendingUp,
  UserCog,
  Users,
  Users2,
} from 'lucide-react';
import {
  GLOBAL_ROLES,
  PERMISSIONS,
  canAccessDossier,
  canAccessPremiumSaas,
  hasAnyGlobalRole,
  hasPermission,
} from '@/modules/auth/access-control';
import {
  FEATURE_KEYS,
  PRODUCT_FEATURES,
  hasFeatureAccess,
  hasFeatureAccessByPlan,
} from '@/modules/billing/planGuard';
import { resolvePlanFromAccess } from '@/modules/billing/planConfig';
import { V3_FLAGS, v3ResolvePlanFromAccess } from '@/modules/billing/v3Config';
import { getTabsForPlan, TAB_STATE } from '@/modules/billing/dashboardConfigByPlan';
import { DOSSIER_BASE_PATH } from '@/modules/dossier/routes';
import { PANEL_MODE, normalizePanelMode, resolveAutoPanelMode } from '@/modules/navigation/panelMode';

// ---------------------------------------------------------------------------
// Mapa de ícones (iconKey → componente Lucide)
// ---------------------------------------------------------------------------
const ICON_MAP = {
  LayoutDashboard,
  FileBarChart2,
  FileDown,
  ClipboardList,
  Clock,
  BookOpen,
  Radar,
  BookMarked,
  Sparkles,
  MessageCircle,
  BrainCircuit,
  Network,
  Users2,
  UserCog,
  BarChart3,
  Palette,
  Stethoscope,
  TrendingUp,
  Briefcase,
  Building2,
  Users,
  Megaphone,
};

function resolveIcon(iconKey) {
  return ICON_MAP[iconKey] || LayoutDashboard;
}

// ---------------------------------------------------------------------------
// V2 helpers (mantidos intactos)
// ---------------------------------------------------------------------------

function makeItem(icon, label, page, to, section = 'Principal', options = {}) {
  return { icon, label, page, to, section, ...options };
}

function resolveCapabilities(access) {
  const canAccessPremium = canAccessPremiumSaas(access);
  const plan = resolvePlanFromAccess(access);
  const canManageAssessments =
    canAccessPremium && hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE);
  const canViewAssessments =
    canAccessPremium &&
    (hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_TENANT) ||
      hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_SELF));
  const canViewTenantData =
    canAccessPremium && hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_TENANT);
  const canViewOwnData =
    canAccessPremium &&
    (hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_SELF) || canViewAssessments);
  const canAccessSuperAdminConsole = hasAnyGlobalRole(access, [GLOBAL_ROLES.SUPER_ADMIN]);
  const canUseAdvancedComparison =
    canAccessPremium && hasFeatureAccess(access, FEATURE_KEYS.ADVANCED_COMPARISON, { plan });
  const canUseDossier = canViewTenantData && canAccessDossier(access);
  const canUseAiLab = hasFeatureAccessByPlan(plan, PRODUCT_FEATURES.AI_LAB);
  const canUseCoach = hasFeatureAccessByPlan(plan, PRODUCT_FEATURES.COACH);
  const canUseTeamMapByPlan = hasFeatureAccessByPlan(plan, PRODUCT_FEATURES.TEAM_MAP);
  const canUseJobsByPlan = hasFeatureAccessByPlan(plan, PRODUCT_FEATURES.JOBS);

  return {
    plan,
    canAccessPremium,
    canManageAssessments,
    canViewAssessments,
    canViewTenantData,
    canViewOwnData,
    canAccessSuperAdminConsole,
    canUseAdvancedComparison,
    canUseDossier,
    canUseAiLab,
    canUseCoach,
    canUseTeamMapByPlan,
    canUseJobsByPlan,
  };
}

function buildBusinessNavigation(capabilities) {
  const items = [
    makeItem(LayoutDashboard, 'Dashboard Business', 'Dashboard', '/painel', 'Visão Geral'),
    capabilities.canViewAssessments
      ? makeItem(Users, 'Avaliações', 'MyAssessments', '/MyAssessments', 'Operação', {
          activeMatch: ({ currentPageName, currentPath }) =>
            currentPageName === 'MyAssessments' &&
            !String(currentPath || '').includes('#reports'),
        })
      : null,
    capabilities.canUseTeamMapByPlan
      ? makeItem(Building2, 'Equipe', 'TeamMap', '/team-map', 'Operação')
      : null,
    capabilities.canUseDossier
      ? makeItem(BookOpen, 'Dossiê', 'Dossier', DOSSIER_BASE_PATH, 'Operação')
      : null,
    capabilities.canViewAssessments
      ? makeItem(Briefcase, 'Relatórios', 'MyAssessments', '/MyAssessments#reports', 'Resultado', {
          activeMatch: ({ currentPageName, currentPath }) =>
            currentPageName === 'MyAssessments' &&
            String(currentPath || '').includes('#reports'),
        })
      : null,
    capabilities.canViewTenantData && capabilities.canUseAdvancedComparison
      ? makeItem(Radar, 'Comparador', 'CompareProfiles', '/compare-profiles', 'Análises')
      : null,
    capabilities.canUseJobsByPlan
      ? makeItem(Building2, 'Criador de Vagas', 'JobMatching', '/app/job-matching', 'Análises')
      : null,
    capabilities.canUseAiLab
      ? makeItem(Sparkles, 'AI Lab', 'PanelAiLab', '/painel/ai-lab', 'Análises')
      : null,
    capabilities.canUseCoach
      ? makeItem(BookOpen, 'Coach', 'PanelCoach', '/painel/coach', 'Análises')
      : null,
    capabilities.canViewAssessments
      ? makeItem(Sparkles, 'Arquétipos', 'PanelArquetipos', '/painel/arquetipos', 'Análises')
      : null,
    capabilities.canViewAssessments
      ? makeItem(BookOpen, 'Biblioteca DISC', 'DiscLibrary', '/disc-library', 'Análises')
      : null,
  ].filter(Boolean);

  if (capabilities.canAccessSuperAdminConsole) {
    items.push(
      makeItem(Megaphone, 'Campanhas', 'SuperAdminDashboard', '/super-admin#campaigns', 'Plataforma')
    );
    items.push(makeItem(Building2, 'Super Admin', 'SuperAdminDashboard', '/super-admin', 'Plataforma'));
  }

  return items;
}

function buildProfessionalNavigation(capabilities) {
  const items = [
    makeItem(LayoutDashboard, 'Dashboard Profissional', 'Dashboard', '/painel', 'Visão Geral'),
    capabilities.canViewAssessments
      ? makeItem(Users, 'Avaliações', 'MyAssessments', '/MyAssessments', 'Operação', {
          activeMatch: ({ currentPageName, currentPath }) =>
            currentPageName === 'MyAssessments' &&
            !String(currentPath || '').includes('#reports'),
        })
      : null,
    capabilities.canManageAssessments
      ? makeItem(Building2, 'Convites', 'SendAssessment', '/SendAssessment', 'Operação')
      : null,
    capabilities.canUseDossier
      ? makeItem(BookOpen, 'Dossiê', 'Dossier', DOSSIER_BASE_PATH, 'Operação')
      : null,
    capabilities.canViewAssessments
      ? makeItem(Briefcase, 'Relatórios', 'MyAssessments', '/MyAssessments#reports', 'Resultado', {
          activeMatch: ({ currentPageName, currentPath }) =>
            currentPageName === 'MyAssessments' &&
            String(currentPath || '').includes('#reports'),
        })
      : null,
    capabilities.canViewTenantData && capabilities.canUseAdvancedComparison
      ? makeItem(Radar, 'Comparador', 'CompareProfiles', '/compare-profiles', 'Análises')
      : null,
    capabilities.canUseAiLab
      ? makeItem(Sparkles, 'AI Lab', 'PanelAiLab', '/painel/ai-lab', 'Análises')
      : null,
    capabilities.canUseCoach
      ? makeItem(BookOpen, 'Coach', 'PanelCoach', '/painel/coach', 'Análises')
      : null,
    capabilities.canViewAssessments
      ? makeItem(Sparkles, 'Arquétipos', 'PanelArquetipos', '/painel/arquetipos', 'Análises')
      : null,
    capabilities.canViewAssessments
      ? makeItem(BookOpen, 'Biblioteca DISC', 'DiscLibrary', '/disc-library', 'Análises')
      : null,
  ].filter(Boolean);

  if (capabilities.canAccessSuperAdminConsole) {
    items.push(
      makeItem(Megaphone, 'Campanhas', 'SuperAdminDashboard', '/super-admin#campaigns', 'Plataforma')
    );
    items.push(makeItem(Building2, 'Super Admin', 'SuperAdminDashboard', '/super-admin', 'Plataforma'));
  }

  return items;
}

function buildPersonalNavigation(capabilities) {
  return [
    makeItem(LayoutDashboard, 'Meu Perfil', 'Dashboard', '/painel', 'Minha Jornada'),
    capabilities.canViewOwnData
      ? makeItem(Briefcase, 'Minhas Avaliações', 'MyAssessments', '/MyAssessments', 'Minha Jornada')
      : null,
    makeItem(
      Sparkles,
      'Meu Desenvolvimento',
      'PanelMeuDesenvolvimento',
      '/painel/meu-desenvolvimento',
      'Minha Jornada',
    ),
    makeItem(Users, 'Histórico', 'PanelHistorico', '/painel/historico', 'Minha Jornada'),
  ].filter(Boolean);
}

// ---------------------------------------------------------------------------
// V3.0 — Navegação por plano com itens locked
// ---------------------------------------------------------------------------

/**
 * Constrói navegação V3.0 com base no plano real do usuário.
 * Itens com state === 'locked' aparecem no menu com visual bloqueado.
 */
function buildV3Navigation(access) {
  const plan = v3ResolvePlanFromAccess(access);
  const tabs = getTabsForPlan(plan);
  const canAccessSuperAdminConsole = hasAnyGlobalRole(access, [GLOBAL_ROLES.SUPER_ADMIN]);

  const items = tabs.map(({ tab, state }) => {
    const icon = resolveIcon(tab.iconKey);
    const isLocked = state === TAB_STATE.LOCKED;

    return {
      icon,
      label: tab.label,
      page: tab.page,
      to: isLocked ? `/painel/upgrade?feature=${tab.key}` : tab.to,
      section: tab.section,
      locked: isLocked,
      upgradeLabel: tab.upgradeLabel,
      // activeMatch padrão para relatórios e avaliações
      ...(tab.key === 'reports'
        ? {
            activeMatch: ({ currentPageName, currentPath }) =>
              currentPageName === 'MyAssessments' &&
              String(currentPath || '').includes('#reports'),
          }
        : {}),
      ...(tab.key === 'assessments'
        ? {
            activeMatch: ({ currentPageName, currentPath }) =>
              currentPageName === 'MyAssessments' &&
              !String(currentPath || '').includes('#reports'),
          }
        : {}),
    };
  });

  if (canAccessSuperAdminConsole) {
    items.push(
      makeItem(Megaphone, 'Campanhas', 'SuperAdminDashboard', '/super-admin#campaigns', 'Plataforma')
    );
    items.push(makeItem(Building2, 'Super Admin', 'SuperAdminDashboard', '/super-admin', 'Plataforma'));
  }

  return items;
}

// ---------------------------------------------------------------------------
// Exports públicos
// ---------------------------------------------------------------------------

export function buildRoleNavigation(access, options = {}) {
  // V3.0: usa navegação por plano quando flag ativo
  if (V3_FLAGS.PLAN_DIFFERENTIATION) {
    return buildV3Navigation(access);
  }

  // V2 legado — mantido intacto
  const capabilities = resolveCapabilities(access);
  const requestedMode = normalizePanelMode(options?.panelMode);
  const autoMode = resolveAutoPanelMode(access);
  const mode = requestedMode || autoMode;

  if (mode === PANEL_MODE.BUSINESS) {
    return buildBusinessNavigation(capabilities);
  }

  if (mode === PANEL_MODE.PROFESSIONAL) {
    return buildProfessionalNavigation(capabilities);
  }

  return buildPersonalNavigation(capabilities);
}

export function getDashboardHeaderByPanelMode(panelMode) {
  const mode = normalizePanelMode(panelMode, PANEL_MODE.BUSINESS);

  if (mode === PANEL_MODE.BUSINESS) {
    return {
      title: 'Dashboard Business',
      subtitle: 'Empresas, equipes e decisões de liderança com base em dados DISC',
    };
  }

  if (mode === PANEL_MODE.PROFESSIONAL) {
    return {
      title: 'Dashboard Profissional',
      subtitle: 'Interpretação técnica, relatórios e operação avançada de avaliações DISC',
    };
  }

  return {
    title: 'Painel Personal',
    subtitle: 'Seu perfil, evolução comportamental e próximos passos de desenvolvimento',
  };
}

export function getDashboardHeaderByRole(access, options = {}) {
  const requestedMode = normalizePanelMode(options?.panelMode);
  const autoMode = resolveAutoPanelMode(access);
  const mode = requestedMode || autoMode;
  return getDashboardHeaderByPanelMode(mode);
}
