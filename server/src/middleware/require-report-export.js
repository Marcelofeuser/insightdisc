import { PERMISSIONS, createAccessContext, hasPermission } from '../modules/auth/permissions.js';

export function requireReportExport(req, res, next) {
  const access = createAccessContext(req.user || null);
  const ok = hasPermission(access, PERMISSIONS.REPORT_EXPORT);

  if (!ok) {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }

  return next();
}

export default requireReportExport;

