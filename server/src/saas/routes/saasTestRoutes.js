// Rotas de teste SaaS isoladas
import express from 'express';
import { db } from '../services/saasDb.js';
import { createAccount, assignUserToAccount, setPlan } from '../modules/accounts/accountService.js';
import { getAccountPlan } from '../modules/plans/planService.js';
import { checkUsage, simulateAssessmentCreation } from '../modules/usage/usageService.js';
import { canUseFeature } from '../modules/plans/featureGate.js';
import { getFeaturesForPlan } from '../modules/plans/featureCatalog.js';

const router = express.Router();

// POST /saas/test/create-account
router.post('/test/create-account', (req, res) => {
  const { name, ownerUserId } = req.body || {};
  if (!name || !ownerUserId) return res.status(400).json({ ok: false, error: 'NAME_AND_OWNER_REQUIRED' });
  const account = createAccount({ name, ownerUserId });
  assignUserToAccount({ userId: ownerUserId, accountId: account.id, role: 'OWNER' });
  return res.json({ ok: true, account });
});

// POST /saas/test/use-assessment
router.post('/test/use-assessment', (req, res) => {
  const { accountId } = req.body || {};
  if (!accountId) return res.status(400).json({ ok: false, error: 'ACCOUNT_ID_REQUIRED' });
  try {
    const result = simulateAssessmentCreation(accountId);
    return res.json({ ok: true, result });
  } catch (e) {
    return res.status(400).json({ ok: false, error: e.message });
  }
});

// GET /saas/test/get-usage
router.get('/test/get-usage', (req, res) => {
  const { accountId } = req.query;
  if (!accountId) return res.status(400).json({ ok: false, error: 'ACCOUNT_ID_REQUIRED' });
  const used = checkUsage(accountId);
  return res.json({ ok: true, used });
});

// GET /saas/test/get-plan
router.get('/test/get-plan', (req, res) => {
  const { accountId } = req.query;
  if (!accountId) return res.status(400).json({ ok: false, error: 'ACCOUNT_ID_REQUIRED' });
  const account = db.accounts.find((a) => a.id === accountId);
  if (!account) return res.status(404).json({ ok: false, error: 'ACCOUNT_NOT_FOUND' });
  const plan = getAccountPlan(account);
  return res.json({ ok: true, plan });
});

// POST /saas/test/set-plan
router.post('/test/set-plan', (req, res) => {
  const { accountId, planId } = req.body || {};
  if (!accountId || !planId) return res.status(400).json({ ok: false, error: 'ACCOUNT_ID_AND_PLAN_REQUIRED' });
  try {
    const account = setPlan(accountId, planId);
    const plan = getAccountPlan(account);
    return res.json({ ok: true, account, plan });
  } catch (e) {
    return res.status(404).json({ ok: false, error: e.message });
  }
});

// GET /saas/test/can-use-feature
router.get('/test/can-use-feature', (req, res) => {
  const { accountId, feature } = req.query;
  if (!accountId || !feature) return res.status(400).json({ ok: false, error: 'ACCOUNT_ID_AND_FEATURE_REQUIRED' });
  const result = canUseFeature(accountId, feature);
  return res.status(result.ok ? 200 : 403).json(result);
});

// GET /saas/test/features
router.get('/test/features', (req, res) => {
  const { accountId } = req.query;
  if (!accountId) return res.status(400).json({ ok: false, error: 'ACCOUNT_ID_REQUIRED' });
  const account = db.accounts.find((a) => a.id === accountId);
  if (!account) return res.status(404).json({ ok: false, error: 'ACCOUNT_NOT_FOUND' });
  const plan = getAccountPlan(account);
  const features = getFeaturesForPlan(plan.id);
  return res.json({ ok: true, plan: plan.id, features });
});

export default router;
