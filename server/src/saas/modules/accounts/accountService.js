// Serviço de contas SaaS isolado
import { db, genId } from '../../services/saasDb.js';

function createAccount({ name, ownerUserId }) {
  const account = {
    id: genId(),
    name,
    owner_user_id: ownerUserId,
    created_at: new Date().toISOString(),
  };
  db.accounts.push(account);
  return account;
}

function assignUserToAccount({ userId, accountId, role = 'MEMBER' }) {
  const membership = {
    id: genId(),
    user_id: userId,
    account_id: accountId,
    role,
  };
  db.memberships.push(membership);
  return membership;
}

function setPlan(accountId, planId) {
  const account = db.accounts.find((a) => a.id === String(accountId));
  if (!account) throw new Error('ACCOUNT_NOT_FOUND');
  account.planId = planId;
  return account;
}

export { createAccount, assignUserToAccount, setPlan };
