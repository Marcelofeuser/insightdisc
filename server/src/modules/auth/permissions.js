export const PERMISSIONS = Object.freeze({
  REPORT_EXPORT: 'report.export',
});

const ROLE_PERMISSIONS = Object.freeze({
  SUPER_ADMIN: [PERMISSIONS.REPORT_EXPORT],
  ADMIN: [PERMISSIONS.REPORT_EXPORT],
  PRO: [PERMISSIONS.REPORT_EXPORT],
  CANDIDATE: [],
});

export function createAccessContext(user = null) {
  return {
    role: user?.role || null,
  };
}

export function hasPermission(access, permission) {
  if (!permission) return true;
  const role = access?.role;
  if (!role) return false;
  const granted = ROLE_PERMISSIONS[role] || [];
  return granted.includes(permission);
}
