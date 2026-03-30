import {
  BookOpen,
  Briefcase,
  Building2,
  LayoutDashboard,
  Megaphone,
  Radar,
  Sparkles,
  Users,
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
import { DOSSIER_BASE_PATH } from '@/modules/dossier/routes';
import { PANEL_MODE, normalizePanelMode, resolveAutoPanelMode } from '@/modules/navigation/panelMode';

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
          activeMatch: ({ currentPageName, currentPath }) => {
            // CRITICAL FIX: Only match if onMyAssessments AND NO #reports hash
            return (
              currentPageName === 'MyAssessments' &&
              !String(currentPath || '').includes('#reports')
            );
          },
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
          activeMatch: ({ currentPageName, currentPath }) => {
            // CRITICAL FIX: Only match if onMyAssessments AND #reports hash is present
            return (
              currentPageName === 'MyAssessments' &&
              String(currentPath || '').includes('#reports')
            );
          },
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
          activeMatch: ({ currentPageName, currentPath }) => {
            // CRITICAL FIX: Only match if on MyAssessments AND NO #reports hash
            return (
              currentPageName === 'MyAssessments' &&
              !String(currentPath || '').includes('#reports')
            );
          },
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
          activeMatch: ({ currentPageName, currentPath }) => {
            // CRITICAL FIX: Only match if on MyAssessments AND #reports hash is present
            return (
              currentPageName === 'MyAssessments' &&
              String(currentPath || '').includes('#reports')
            );
          },
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

export function buildRoleNavigation(access, options = {}) {
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
