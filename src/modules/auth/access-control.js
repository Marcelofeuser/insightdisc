import { ENTITLEMENT_TO_PERMISSIONS, PERMISSIONS, ROLE_PERMISSIONS } from '@/modules/auth/permissions';
import { GLOBAL_ROLES, LEGACY_ROLE_MAP, TENANT_ROLES } from '@/modules/auth/roles';

function normalizeString(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized ? normalized : null;
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

  return {
    user: safeUser,
    userId: safeUser?.id ?? null,
    email: safeUser?.email ?? null,
    tenantId: getTenantId(safeUser || {}),
    globalRole,
    tenantRole,
    entitlements,
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
