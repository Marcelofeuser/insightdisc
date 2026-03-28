// Serviço de uso SaaS isolado
import { db, genId } from '../../services/saasDb.js';
import { getAccountPlan } from '../plans/planService.js';

function resolveUsageLimit(accountId) {
  const account = db.accounts.find((item) => item.id === String(accountId));
  const plan = getAccountPlan(account || {});
  const rawLimit = Number(plan?.limits?.assessments);
  if (!Number.isFinite(rawLimit) || rawLimit <= 0) return Number.POSITIVE_INFINITY;
  return rawLimit;
}

function checkUsage(accountId, type = 'assessment') {
  const normalizedType = String(type || 'assessment').trim().toLowerCase() || 'assessment';
  const logs = db.usage_logs.filter(
    (item) => item.account_id === String(accountId) && item.type === normalizedType,
  );
  const used = logs.length;
  const limit = resolveUsageLimit(accountId);
  const ok = !Number.isFinite(limit) || used < limit;

  return { ok, used, limit };
}

function registerUsage(accountId, type = 'assessment') {
  const normalizedType = String(type || 'assessment').trim().toLowerCase() || 'assessment';
  const log = {
    id: genId(),
    account_id: String(accountId),
    type: normalizedType,
    created_at: new Date().toISOString(),
  };
  db.usage_logs.push(log);
  return log;
}

function simulateAssessmentCreation(accountId) {
  const account = db.accounts.find((a) => a.id === accountId);
  if (!account) throw new Error('ACCOUNT_NOT_FOUND');
  const plan = getAccountPlan(account);
  const usage = checkUsage(accountId, 'assessment');
  const used = Number(usage.used || 0);
  const limit = plan.limits.assessments;
  if (Number.isFinite(limit) && used >= limit) {
    return { ok: false, reason: 'LIMIT_REACHED', used, limit };
  }
  registerUsage(accountId, 'assessment');
  return { ok: true, used: used + 1, limit };
}

export { checkUsage, registerUsage, simulateAssessmentCreation };
