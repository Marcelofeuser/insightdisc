export const GLOBAL_ROLES = Object.freeze({
  SUPER_ADMIN: 'SUPER_ADMIN',
  PLATFORM_ADMIN: 'PLATFORM_ADMIN',
});

export const TENANT_ROLES = Object.freeze({
  TENANT_ADMIN: 'TENANT_ADMIN',
  TENANT_USER: 'TENANT_USER',
  END_CUSTOMER: 'END_CUSTOMER',
});

// Legacy compatibility: preserves behavior for existing users while we migrate.
export const LEGACY_ROLE_MAP = Object.freeze({
  admin: {
    globalRole: GLOBAL_ROLES.PLATFORM_ADMIN,
    tenantRole: TENANT_ROLES.TENANT_ADMIN,
  },
  professional: {
    globalRole: null,
    tenantRole: TENANT_ROLES.TENANT_ADMIN,
  },
  user: {
    globalRole: null,
    tenantRole: TENANT_ROLES.TENANT_USER,
  },
  customer: {
    globalRole: null,
    tenantRole: TENANT_ROLES.END_CUSTOMER,
  },
  end_customer: {
    globalRole: null,
    tenantRole: TENANT_ROLES.END_CUSTOMER,
  },
});

