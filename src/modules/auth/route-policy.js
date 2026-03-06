import { PERMISSIONS } from '@/modules/auth/permissions';
import { GLOBAL_ROLES, TENANT_ROLES } from '@/modules/auth/roles';

export const PUBLIC_PAGES = new Set([
  'Home',
  'Avaliacoes',
  'FreeAssessment',
  'FreeResults',
  'CandidateOnboarding',
  'CheckoutSuccess',
  'ForgotPassword',
  'Login',
  'Pricing',
  'PublicReport',
  'Signup',
  'StartFree',
  'SuperAdminLogin',
  'Privacy',
  'Terms',
  'Lgpd',
]);

const PAGE_POLICIES = Object.freeze({
  AdminDashboard: {
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
  },
  AnalyticsDashboard: {
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN, TENANT_ROLES.TENANT_USER],
    permissions: [PERMISSIONS.ASSESSMENT_VIEW_TENANT],
  },
  Dashboard: {
    requiresAuth: true,
  },
  MyAssessments: {
    requiresAuth: true,
  },
  JobMatching: {
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN, TENANT_ROLES.TENANT_USER],
    permissions: [PERMISSIONS.ASSESSMENT_VIEW_TENANT],
  },
  LeadsDashboard: {
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN, TENANT_ROLES.TENANT_USER],
    permissions: [PERMISSIONS.ASSESSMENT_VIEW_TENANT],
  },
  Credits: {
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN],
    permissions: [PERMISSIONS.CREDIT_VIEW],
  },
  BrandingSettings: {
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN, TENANT_ROLES.TENANT_USER],
    permissions: [PERMISSIONS.ASSESSMENT_CREATE],
  },
  PremiumAssessment: {
    requiresAuth: true,
  },
  Report: {
    requiresAuth: true,
  },
  SendAssessment: {
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN, TENANT_ROLES.TENANT_USER],
    permissions: [PERMISSIONS.ASSESSMENT_CREATE],
  },
  TeamMapping: {
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN, TENANT_ROLES.TENANT_USER],
    permissions: [PERMISSIONS.ASSESSMENT_VIEW_TENANT],
  },
  SuperAdminDashboard: {
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN],
  },
});

export function getPagePolicy(pageName) {
  if (PUBLIC_PAGES.has(pageName)) {
    return { isPublic: true };
  }

  return PAGE_POLICIES[pageName] || { requiresAuth: true };
}
