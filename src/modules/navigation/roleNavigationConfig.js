import {
  BookOpen,
  Brain,
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
  canAccessPremiumSaas,
  hasAnyGlobalRole,
  hasPermission,
} from '@/modules/auth/access-control';
import { FEATURE_KEYS, hasFeatureAccess } from '@/modules/billing/planGuard';
import { resolvePlanFromAccess } from '@/modules/billing/planConfig';
import { PANEL_MODE, normalizePanelMode, resolveAutoPanelMode } from '@/modules/navigation/panelMode';

function makeItem(icon, label, page, to, section = 'Principal') {
  return { icon, label, page, to, section };
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
  const canManageOrganization =
    canAccessPremium &&
    (hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE) ||
      hasPermission(access, PERMISSIONS.CREDIT_MANAGE) ||
      hasPermission(access, PERMISSIONS.CREDIT_VIEW));
  const canAccessPlatformAdmin = hasAnyGlobalRole(access, [
    GLOBAL_ROLES.SUPER_ADMIN,
    GLOBAL_ROLES.PLATFORM_ADMIN,
  ]);
  const canAccessSuperAdminConsole = hasAnyGlobalRole(access, [GLOBAL_ROLES.SUPER_ADMIN]);
  const canUseAdvancedComparison =
    canAccessPremium && hasFeatureAccess(access, FEATURE_KEYS.ADVANCED_COMPARISON, { plan });
  const canUseJobMatching =
    canAccessPremium && hasFeatureAccess(access, FEATURE_KEYS.JOB_MATCHING, { plan });
  const canUseTeamMap =
    canAccessPremium && hasFeatureAccess(access, FEATURE_KEYS.TEAM_MAP, { plan });
  const canUseOrganizationalReport =
    canAccessPremium && hasFeatureAccess(access, FEATURE_KEYS.ORGANIZATIONAL_REPORT, { plan });

  return {
    plan,
    canAccessPremium,
    canManageAssessments,
    canViewAssessments,
    canViewTenantData,
    canViewOwnData,
    canManageOrganization,
    canAccessPlatformAdmin,
    canAccessSuperAdminConsole,
    canUseAdvancedComparison,
    canUseJobMatching,
    canUseTeamMap,
    canUseOrganizationalReport,
  };
}

function buildBusinessNavigation(capabilities) {
  const items = [
    makeItem(LayoutDashboard, 'Dashboard', 'Dashboard', '/painel', 'Visão Geral'),
    capabilities.canViewAssessments
      ? makeItem(Users, 'Avaliações', 'MyAssessments', '/MyAssessments', 'Operação')
      : null,
    capabilities.canViewTenantData && capabilities.canUseTeamMap
      ? makeItem(Building2, 'Equipe', 'TeamMap', '/team-map', 'Operação')
      : null,
    capabilities.canViewTenantData && capabilities.canUseAdvancedComparison
      ? makeItem(Radar, 'Comparador', 'CompareProfiles', '/compare-profiles', 'Análises')
      : null,
    capabilities.canViewTenantData && capabilities.canUseJobMatching
      ? makeItem(Sparkles, 'Insights', 'JobMatching', '/JobMatching', 'Análises')
      : null,
    capabilities.canViewAssessments
      ? makeItem(Briefcase, 'Relatórios', 'MyAssessments', '/MyAssessments', 'Análises')
      : null,
    capabilities.canViewTenantData && capabilities.canUseOrganizationalReport
      ? makeItem(Brain, 'Relatório Org', 'OrganizationalReport', '/organization-report', 'Análises')
      : null,
    capabilities.canManageOrganization
      ? makeItem(Building2, 'Organização', 'BrandingSettings', '/app/branding', 'Configurações')
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
    makeItem(LayoutDashboard, 'Dashboard', 'Dashboard', '/painel', 'Visão Geral'),
    capabilities.canViewAssessments
      ? makeItem(Users, 'Avaliações', 'MyAssessments', '/MyAssessments', 'Operação')
      : null,
    capabilities.canManageAssessments
      ? makeItem(Building2, 'Clientes', 'SendAssessment', '/SendAssessment', 'Operação')
      : null,
    capabilities.canViewAssessments
      ? makeItem(Briefcase, 'Relatórios', 'MyAssessments', '/MyAssessments', 'Operação')
      : null,
    capabilities.canViewTenantData && capabilities.canUseAdvancedComparison
      ? makeItem(Radar, 'Comparador', 'CompareProfiles', '/compare-profiles', 'Análises')
      : null,
    capabilities.canViewAssessments
      ? makeItem(Brain, 'Coach DISC', 'Coach', '/coach', 'Análises')
      : null,
    makeItem(Sparkles, 'Arquétipos', 'PanelArquetipos', '/painel/arquetipos', 'Análises'),
    makeItem(BookOpen, 'Biblioteca DISC', 'PanelBibliotecaDisc', '/painel/biblioteca-disc', 'Conhecimento'),
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
      ? makeItem(Briefcase, 'Meu Relatório', 'MyAssessments', '/MyAssessments', 'Minha Jornada')
      : null,
    makeItem(
      Sparkles,
      'Meu Desenvolvimento',
      'PanelMeuDesenvolvimento',
      '/painel/meu-desenvolvimento',
      'Minha Jornada',
    ),
    makeItem(Brain, 'Coach DISC', 'Coach', '/coach', 'Minha Jornada'),
    makeItem(Users, 'Histórico', 'PanelHistorico', '/painel/historico', 'Minha Jornada'),
  ].filter(Boolean);
}

export function buildRoleNavigation(access, options = {}) {
  const capabilities = resolveCapabilities(access);
  const requestedMode = normalizePanelMode(options?.panelMode);
  const mode = requestedMode || resolveAutoPanelMode(access);

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
      title: 'Painel Business',
      subtitle: 'Empresas, equipes e decisões de liderança com base em dados DISC',
    };
  }

  if (mode === PANEL_MODE.PROFESSIONAL) {
    return {
      title: 'Painel Professional',
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
  const mode = requestedMode || resolveAutoPanelMode(access);
  return getDashboardHeaderByPanelMode(mode);
}
