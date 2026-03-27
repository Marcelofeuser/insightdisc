// Serviço de uso SaaS isolado
import { db, genId } from '../../services/saasDb.js';
import { getAccountPlan } from '../plans/planService.js';

function checkUsage(accountId) {
  const logs = db.usage_logs.filter((u) => u.account_id === accountId && u.type === 'assessment');
  return logs.length;
}

function registerUsage(accountId) {
  const log = {
    id: genId(),
    account_id: accountId,
    type: 'assessment',
    created_at: new Date().toISOString(),
  };
  db.usage_logs.push(log);
  return log;
}

function simulateAssessmentCreation(accountId) {
  const account = db.accounts.find((a) => a.id === accountId);
  if (!account) throw new Error('ACCOUNT_NOT_FOUND');
  const plan = getAccountPlan(account);
  const used = checkUsage(accountId);
  const limit = plan.limits.assessments;
  if (used >= limit) {
    return { ok: false, reason: 'LIMIT_REACHED', used, limit };
  }
  registerUsage(accountId);
  return { ok: true, used: used + 1, limit };
}

export { checkUsage, registerUsage, simulateAssessmentCreation };
