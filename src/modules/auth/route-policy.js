import { PERMISSIONS } from '@/modules/auth/permissions';
import { USER_LIFECYCLE } from '@/modules/auth/access-control';
import { GLOBAL_ROLES, TENANT_ROLES } from '@/modules/auth/roles';
import { PLANS } from '@/modules/billing/planConfig';
import { FEATURE_KEYS } from '@/modules/billing/planGuard';

const PREMIUM_LIFECYCLE = Object.freeze([
  USER_LIFECYCLE.CUSTOMER_ACTIVE,
  USER_LIFECYCLE.SUPER_ADMIN,
]);

export const PUBLIC_PAGES = new Set([
  'Home',
  'Avaliacoes',
  'FreeAssessment',
  'FreeResults',
  'CandidateOnboarding',
  'CheckoutSuccess',
  'Checkout',
  'ForgotPassword',
  'Login',
  'Pricing',
  'PublicReport',
  'GiftLanding',
  'Demo',
  'SalesLanding',
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
    allowedLifecycle: PREMIUM_LIFECYCLE,
    redirectTo: '/Pricing?unlock=1',
  },
  Dossier: {
    requiresAuth: true,
    allowedLifecycle: PREMIUM_LIFECYCLE,
    redirectTo: '/Pricing?unlock=1',
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN, TENANT_ROLES.TENANT_USER],
    permissions: [PERMISSIONS.ASSESSMENT_VIEW_TENANT],
    requiredFeature: FEATURE_KEYS.DOSSIER,
  },
  MyAssessments: {
    requiresAuth: true,
    allowedLifecycle: PREMIUM_LIFECYCLE,
    redirectTo: '/Pricing?unlock=1',
  },
  PanelAiLab: {
    requiresAuth: true,
  },
  SynapsysAI: {
    requiresAuth: true,
  },
  PanelCoach: {
    requiresAuth: true,
  },
  PanelArquetipos: {
    allowedLifecycle: PREMIUM_LIFECYCLE,
    redirectTo: '/Pricing?unlock=1',
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN, TENANT_ROLES.TENANT_USER],
    permissions: [PERMISSIONS.ASSESSMENT_VIEW_TENANT],
    requiredFeature: FEATURE_KEYS.ARCHETYPES,
  },
  JobMatching: {
    requiresAuth: true,
    requiredFeature: FEATURE_KEYS.JOB_MATCHING,
  },
  LeadsDashboard: {
    allowedLifecycle: PREMIUM_LIFECYCLE,
    redirectTo: '/Pricing?unlock=1',
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN, TENANT_ROLES.TENANT_USER],
    permissions: [PERMISSIONS.ASSESSMENT_VIEW_TENANT],
  },
  Credits: {
    allowedLifecycle: PREMIUM_LIFECYCLE,
    redirectTo: '/Pricing?unlock=1',
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN],
    permissions: [PERMISSIONS.CREDIT_VIEW],
    minimumPlan: PLANS.PROFESSIONAL,
  },
  BrandingSettings: {
    allowedLifecycle: PREMIUM_LIFECYCLE,
    redirectTo: '/Pricing?unlock=1',
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN, TENANT_ROLES.TENANT_USER],
    permissions: [PERMISSIONS.ASSESSMENT_CREATE],
  },
  PremiumAssessment: {
    requiresAuth: true,
    allowedLifecycle: PREMIUM_LIFECYCLE,
    redirectTo: '/Pricing?unlock=1',
  },
  Report: {
    requiresAuth: true,
    allowedLifecycle: PREMIUM_LIFECYCLE,
    redirectTo: '/Pricing?unlock=1',
  },
  AssessmentResult: {
    requiresAuth: true,
    allowedLifecycle: PREMIUM_LIFECYCLE,
    redirectTo: '/Pricing?unlock=1',
  },
  SendAssessment: {
    allowedLifecycle: PREMIUM_LIFECYCLE,
    redirectTo: '/Pricing?unlock=1',
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN, TENANT_ROLES.TENANT_USER],
    permissions: [PERMISSIONS.ASSESSMENT_CREATE],
    minimumPlan: PLANS.PROFESSIONAL,
  },
  TeamMapping: {
    requiresAuth: true,
  },
  CompareProfiles: {
    allowedLifecycle: PREMIUM_LIFECYCLE,
    redirectTo: '/Pricing?unlock=1',
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN, TENANT_ROLES.TENANT_USER],
    permissions: [PERMISSIONS.ASSESSMENT_VIEW_TENANT],
    requiredFeature: FEATURE_KEYS.ADVANCED_COMPARISON,
  },
  TeamMap: {
    requiresAuth: true,
    requiredFeature: FEATURE_KEYS.TEAM_MAP,
  },
  OrganizationalReport: {
    allowedLifecycle: PREMIUM_LIFECYCLE,
    redirectTo: '/Pricing?unlock=1',
    anyGlobalRoles: [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN],
    anyTenantRoles: [TENANT_ROLES.TENANT_ADMIN, TENANT_ROLES.TENANT_USER],
    permissions: [PERMISSIONS.ASSESSMENT_VIEW_TENANT],
    requiredFeature: FEATURE_KEYS.ORGANIZATIONAL_REPORT,
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
