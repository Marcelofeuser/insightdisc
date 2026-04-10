/**
 * experience-role.js — Resolução do experience role para seleção de painel
 *
 * V3.0: Quando V3_FLAGS.PLAN_DIFFERENTIATION está ativo, o plano do usuário
 * tem prioridade sobre a inferência por role. Usuários corporation/diamond
 * nunca mais caem no painel professional por terem roles de gestor/RH.
 */

import {
  PERMISSIONS,
  hasAnyGlobalRole,
  hasPermission,
  isSuperAdminAccess,
} from '@/modules/auth/access-control';
import { V3_FLAGS, V3_PLAN_KEYS, v3ResolvePlanFromAccess } from '@/modules/billing/v3Config';

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
  const globalRole = toUpper(
    access?.globalRole ||
      access?.global_role ||
      access?.user?.globalRole ||
      access?.user?.global_role
  );
  const tenantRole = toUpper(
    access?.tenantRole ||
      access?.tenant_role ||
      access?.user?.tenantRole ||
      access?.user?.tenant_role
  );

  // 1. Super Admin / Platform Admin sempre acima de tudo
  const isPlatformAdmin =
    isSuperAdminAccess(access) ||
    hasAnyGlobalRole(access, ['SUPER_ADMIN', 'PLATFORM_ADMIN']) ||
    globalRole === 'SUPER_ADMIN' ||
    globalRole === 'PLATFORM_ADMIN' ||
    role === 'SUPER_ADMIN';

  if (isPlatformAdmin) {
    return EXPERIENCE_ROLE.PLATFORM_ADMIN;
  }

  // 2. V3.0 FIX — prioridade do plano sobre inferência de role
  //    Usuários corporation/diamond não devem cair no painel professional
  //    só por terem roles como TENANT_ADMIN, RH, MANAGER etc.
  if (V3_FLAGS.PLAN_DIFFERENTIATION) {
    const plan = v3ResolvePlanFromAccess(access);
    if (
      plan === V3_PLAN_KEYS.CORPORATION ||
      plan === V3_PLAN_KEYS.DIAMOND_CONSULTING
    ) {
      // Retorna PROFESSIONAL como valor legacy para compatibilidade com V2 mode switcher,
      // mas o RoleDashboardHome V3 vai ignorar isso e usar o plano diretamente.
      return EXPERIENCE_ROLE.PROFESSIONAL;
    }
  }

  // 3. Inferência por role/permissions (V2 lógica legada)
  const hasProfessionalPermissions =
    hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE) ||
    hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_TENANT) ||
    hasPermission(access, PERMISSIONS.REPORT_VIEW_TENANT) ||
    hasPermission(access, PERMISSIONS.CREDIT_MANAGE);

  if (
    hasProfessionalPermissions ||
    PROFESSIONAL_ROLE_HINTS.has(tenantRole) ||
    PROFESSIONAL_ROLE_HINTS.has(role)
  ) {
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
