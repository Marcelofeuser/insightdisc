import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requireSuperAdmin } from '../middleware/rbac.js';

const router = Router();

router.use(requireAuth, attachUser, requireSuperAdmin);

router.get('/', async (req, res) => {
  return res.status(200).json({
    ok: true,
    scope: 'super_admin',
    user: {
      id: req.user?.id || req.auth?.userId || '',
      email: req.user?.email || req.auth?.email || '',
      role: req.user?.role || req.auth?.role || '',
      name: req.user?.name || '',
    },
  });
});

router.get('/overview', async (_req, res) => {
  const [users, organizations, assessments, reports] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.assessment.count(),
    prisma.report.count(),
  ]);

  return res.status(200).json({
    ok: true,
    metrics: {
      users,
      organizations,
      assessments,
      reports,
    },
  });
});

export default router;
