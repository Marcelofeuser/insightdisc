import {
  PERMISSIONS,
  hasAnyGlobalRole,
  hasPermission,
  isSuperAdminAccess,
} from '@/modules/auth/access-control';

export const EXPERIENCE_ROLE = Object.freeze({
  PLATFORM_ADMIN: 'platform_admin',
  PROFESSIONAL: 'professional',
  END_USER: 'end_user',
});

const PROFESSIONAL_ROLE_HINTS = new Set([
  'TENANT_ADMIN',
  'ADMIN',
  'PROFESSIONAL',
  'CONSULTOR',
  'CONSULTANT',
  'RH',
  'HR',
  'MANAGER',
  'COORDINATOR',
]);

function toUpper(value) {
  return String(value || '').trim().toUpperCase();
}

export function resolveExperienceRole(access) {
  if (!access) {
    return EXPERIENCE_ROLE.END_USER;
  }

  const role = toUpper(access?.role || access?.user?.role);
  const globalRole = toUpper(access?.globalRole || access?.global_role || access?.user?.globalRole || access?.user?.global_role);
  const tenantRole = toUpper(access?.tenantRole || access?.tenant_role || access?.user?.tenantRole || access?.user?.tenant_role);

  const isPlatformAdmin =
    isSuperAdminAccess(access) ||
    hasAnyGlobalRole(access, ['SUPER_ADMIN', 'PLATFORM_ADMIN']) ||
    globalRole === 'SUPER_ADMIN' ||
    globalRole === 'PLATFORM_ADMIN' ||
    role === 'SUPER_ADMIN';

  if (isPlatformAdmin) {
    return EXPERIENCE_ROLE.PLATFORM_ADMIN;
  }

  const hasProfessionalPermissions =
    hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE) ||
    hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_TENANT) ||
    hasPermission(access, PERMISSIONS.REPORT_VIEW_TENANT) ||
    hasPermission(access, PERMISSIONS.CREDIT_MANAGE);

  if (hasProfessionalPermissions || PROFESSIONAL_ROLE_HINTS.has(tenantRole) || PROFESSIONAL_ROLE_HINTS.has(role)) {
    return EXPERIENCE_ROLE.PROFESSIONAL;
  }

  return EXPERIENCE_ROLE.END_USER;
}

export function getExperienceLabel(role) {
  switch (role) {
    case EXPERIENCE_ROLE.PLATFORM_ADMIN:
      return 'Admin da Plataforma';
    case EXPERIENCE_ROLE.PROFESSIONAL:
      return 'Profissional DISC';
    default:
      return 'Usuário Final';
  }
}
