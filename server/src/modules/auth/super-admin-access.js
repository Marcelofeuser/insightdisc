export function isSuperAdminUser(user = {}) {
  return (
    String(user?.role || '').toUpperCase() === 'SUPER_ADMIN' ||
    String(user?.globalRole || user?.global_role || '').toUpperCase() === 'SUPER_ADMIN'
  );
}
