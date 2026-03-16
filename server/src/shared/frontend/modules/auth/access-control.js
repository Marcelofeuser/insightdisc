import { ENTITLEMENT_TO_PERMISSIONS, PERMISSIONS, ROLE_PERMISSIONS } from '@/modules/auth/permissions';
import { GLOBAL_ROLES, LEGACY_ROLE_MAP, TENANT_ROLES } from '@/modules/auth/roles';

export const USER_LIFECYCLE = Object.freeze({
  ANONYMOUS: 'anonymous',
  LEAD: 'lead',
  REGISTERED_NO_PURCHASE: 'registered_no_purchase',
  CUSTOMER_ACTIVE: 'customer_active',
  SUPER_ADMIN: 'super_admin',
});

function normalizeString(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
}

function normalizeLifecycle(rawValue) {
  const raw = String(rawValue || '').trim().toLowerCase();
  if (Object.values(USER_LIFECYCLE).includes(raw)) return raw;
  return null;
}

function normalizePlan(rawValue) {
  const raw = String(rawValue || '').trim().toLowerCase();
  return raw || 'free';
}

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function normalizeRoles(user = {}) {
  const explicitGlobalRole = normalizeString(user.global_role) || normalizeString(user.globalRole);
  const explicitTenantRole =
    normalizeString(user.tenant_role) || normalizeString(user.tenantRole) || normalizeString(user.workspace_role);

  if (explicitGlobalRole || explicitTenantRole) {
    return {
      globalRole: explicitGlobalRole,
      tenantRole: explicitTenantRole,
    };
  }

  const legacyRole = normalizeString(user.role)?.toLowerCase();
  const mapped = legacyRole ? LEGACY_ROLE_MAP[legacyRole] : null;

  return {
    globalRole: mapped?.globalRole ?? null,
    tenantRole: mapped?.tenantRole ?? null,
  };
}

export function getTenantId(user = {}) {
  return (
    normalizeString(user.tenant_id) ||
    normalizeString(user.tenantId) ||
    normalizeString(user.workspace_id) ||
    normalizeString(user.active_workspace_id) ||
    null
  );
}

export function deriveUserLifecycle(user = {}) {
  if (!user || (!user.id && !user.email)) {
    return USER_LIFECYCLE.ANONYMOUS;
  }

  const explicitLifecycle =
    normalizeLifecycle(user.lifecycle_status) || normalizeLifecycle(user.lifecycleStatus);
  if (explicitLifecycle) {
    return explicitLifecycle;
  }

  const role = String(user.role || '').toUpperCase();
  const globalRole = String(user.global_role || user.globalRole || '').toUpperCase();
  if (role === 'SUPER_ADMIN' || globalRole === GLOBAL_ROLES.SUPER_ADMIN) {
    return USER_LIFECYCLE.SUPER_ADMIN;
  }
  if (role === 'CANDIDATE') {
    return USER_LIFECYCLE.LEAD;
  }

  const hasPaidPurchase =
    Boolean(user.has_paid_purchase) ||
    Boolean(user.hasPaidPurchase) ||
    toNumber(user.payments_count) > 0 ||
    toNumber(user.paymentsCount) > 0;
  const creditsBalance =
    toNumber(user.credits) ||
    toNumber(user.credits_balance) ||
    toNumber(user.creditsBalance);
  const hasPremiumPlan = ['premium', 'pro', 'enterprise'].includes(
    String(user.plan || user.workspace_plan || user.subscription_plan || '')
      .trim()
      .toLowerCase()
  );
  const entitlementList = toEntitlementList(user.entitlements);
  const hasProEntitlement = entitlementList.includes('report.pro');

  if (hasPaidPurchase || creditsBalance > 0 || hasPremiumPlan || hasProEntitlement) {
    return USER_LIFECYCLE.CUSTOMER_ACTIVE;
  }

  return USER_LIFECYCLE.REGISTERED_NO_PURCHASE;
}

function toEntitlementList(raw) {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw
      .map((item) => (typeof item === 'string' ? item : item?.key || item?.name))
      .filter(Boolean);
  }

  if (typeof raw === 'object') {
    return Object.entries(raw)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key);
  }

  return [];
}

export function createAccessContext(user = null) {
  const safeUser = user || null;
  const { globalRole, tenantRole } = normalizeRoles(safeUser || {});
  const entitlements = toEntitlementList(safeUser?.entitlements);
  const lifecycleStatus = deriveUserLifecycle(safeUser || {});
  const creditsBalance =
    toNumber(safeUser?.credits) ||
    toNumber(safeUser?.credits_balance) ||
    toNumber(safeUser?.creditsBalance);
  const hasPaidPurchase =
    Boolean(safeUser?.has_paid_purchase) ||
    Boolean(safeUser?.hasPaidPurchase) ||
    toNumber(safeUser?.payments_count) > 0 ||
    toNumber(safeUser?.paymentsCount) > 0;
  const plan = normalizePlan(
    safeUser?.plan || safeUser?.workspace_plan || safeUser?.subscription_plan
  );

  return {
    user: safeUser,
    role: safeUser?.role ?? null,
    userId: safeUser?.id ?? null,
    email: safeUser?.email ?? null,
    tenantId: getTenantId(safeUser || {}),
    globalRole,
    tenantRole,
    entitlements,
    lifecycleStatus,
    creditsBalance,
    hasPaidPurchase,
    plan,
  };
}

function getRolePermissions(access, role) {
  if (!role) return [];
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasEntitlement(access, entitlement) {
  if (!entitlement) return false;
  return Array.isArray(access?.entitlements) && access.entitlements.includes(entitlement);
}

function getEntitlementPermissions(access) {
  if (!Array.isArray(access?.entitlements)) return [];

  const mapped = access.entitlements.flatMap((entitlement) => ENTITLEMENT_TO_PERMISSIONS[entitlement] || []);
  return [...new Set(mapped)];
}

export function hasPermission(access, permission) {
  if (!permission) return true;

  const globalPermissions = getRolePermissions(access, access?.globalRole);
  if (globalPermissions.includes('*') || globalPermissions.includes(permission)) {
    return true;
  }

  const tenantPermissions = getRolePermissions(access, access?.tenantRole);
  if (tenantPermissions.includes(permission)) {
    return true;
  }

  return getEntitlementPermissions(access).includes(permission);
}

export function hasAnyGlobalRole(access, roles = []) {
  if (!Array.isArray(roles) || roles.length === 0) return false;
  return roles.includes(access?.globalRole);
}

export function hasAnyTenantRole(access, roles = []) {
  if (!Array.isArray(roles) || roles.length === 0) return false;
  return roles.includes(access?.tenantRole);
}

export function isAuthenticatedAccess(access) {
  return Boolean(access?.userId);
}

export function canAccessTenant(access, tenantId) {
  const normalizedTenantId = normalizeString(tenantId);
  if (!normalizedTenantId) return false;

  if (
    hasAnyGlobalRole(access, [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN]) &&
    hasPermission(access, PERMISSIONS.TENANT_VIEW)
  ) {
    return true;
  }

  return access?.tenantId === normalizedTenantId;
}

export function canAccessPremiumSaas(access) {
  const lifecycle = normalizeLifecycle(access?.lifecycleStatus);
  return (
    lifecycle === USER_LIFECYCLE.CUSTOMER_ACTIVE ||
    lifecycle === USER_LIFECYCLE.SUPER_ADMIN
  );
}

export function showUpgradeModal(message = 'Recurso premium') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('insightdisc:upgrade-required', {
      detail: {
        message,
      },
    })
  );
}

const DOSSIER_PREMIUM_PLANS = new Set(['professional', 'business', 'enterprise']);

export function canAccessDossier(access, { notify = false } = {}) {
  if (isSuperAdminAccess(access)) {
    return true;
  }

  const plan = normalizePlan(
    access?.plan ||
      access?.user?.plan ||
      access?.user?.workspace_plan ||
      access?.user?.subscription_plan
  );

  const hasPlanAccess = DOSSIER_PREMIUM_PLANS.has(plan);
  if (hasPlanAccess) return true;

  if (plan === 'starter' || plan === 'free') {
    if (notify) {
      showUpgradeModal('Dossiê Comportamental é um recurso premium.');
    }
    return false;
  }

  const lifecycle = normalizeLifecycle(access?.lifecycleStatus || access?.user?.lifecycle_status);
  const hasLifecyclePremium =
    lifecycle === USER_LIFECYCLE.CUSTOMER_ACTIVE || lifecycle === USER_LIFECYCLE.SUPER_ADMIN;

  if (!hasLifecyclePremium && notify) {
    showUpgradeModal('Dossiê Comportamental é um recurso premium.');
  }

  return hasLifecyclePremium;
}

export function isSuperAdminAccess(access) {
  const role = String(access?.role || access?.user?.role || '').toUpperCase();
  const globalRole = String(
    access?.globalRole || access?.global_role || access?.user?.globalRole || access?.user?.global_role || ''
  ).toUpperCase();
  const lifecycle = normalizeLifecycle(access?.lifecycleStatus || access?.user?.lifecycle_status || access?.user?.lifecycleStatus);

  return (
    role === 'SUPER_ADMIN' ||
    globalRole === 'SUPER_ADMIN' ||
    lifecycle === USER_LIFECYCLE.SUPER_ADMIN
  );
}

export function canViewAssessment(access, assessment = {}) {
  const assessmentTenantId = assessment?.tenant_id || assessment?.workspace_id;
  if (assessmentTenantId && canAccessTenant(access, assessmentTenantId)) {
    return hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_TENANT);
  }

  if (hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_SELF)) {
    if (!assessment?.user_id) return false;
    return assessment.user_id === access?.userId || assessment.user_id === access?.email;
  }

  return false;
}

export function canViewReport(access, assessment = {}, { requiresPro = false } = {}) {
  const assessmentTenantId = assessment?.tenant_id || assessment?.workspace_id;
  const isSuperAdmin = hasAnyGlobalRole(access, [GLOBAL_ROLES.SUPER_ADMIN]);
  if (isSuperAdmin) {
    return true;
  }

  const isGlobalViewer =
    hasAnyGlobalRole(access, [GLOBAL_ROLES.SUPER_ADMIN, GLOBAL_ROLES.PLATFORM_ADMIN]) &&
    hasPermission(access, PERMISSIONS.REPORT_VIEW_TENANT);

  const tenantVisible =
    canAccessTenant(access, assessmentTenantId) &&
    hasPermission(access, PERMISSIONS.REPORT_VIEW_TENANT);
  const tenantAdminInTenant =
    access?.tenantRole === TENANT_ROLES.TENANT_ADMIN &&
    Boolean(access?.tenantId) &&
    Boolean(assessmentTenantId) &&
    access.tenantId === assessmentTenantId;
  const selfVisible =
    hasPermission(access, PERMISSIONS.REPORT_VIEW_SELF) &&
    (
      assessment?.user_id === access?.userId ||
      assessment?.user_id === access?.email ||
      assessment?.respondent_email === access?.email ||
      assessment?.lead_email === access?.email
    );

  if (!requiresPro && isGlobalViewer) {
    return true;
  }

  if (!tenantVisible && !selfVisible && !isGlobalViewer) {
    return false;
  }

  if (!requiresPro) {
    return true;
  }

  // Tenant admins can access full reports within their own tenant/workspace.
  if (tenantAdminInTenant) {
    return true;
  }

  // Single report unlock purchase: grants PRO for this report to the owner only.
  if (assessment?.report_unlocked && selfVisible) {
    return true;
  }

  return hasPermission(access, PERMISSIONS.REPORT_VIEW_PRO);
}

export { GLOBAL_ROLES, TENANT_ROLES, PERMISSIONS };
