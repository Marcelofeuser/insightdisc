#!/usr/bin/env node
import { generateInviteToken, hashInviteToken } from '../src/modules/invites/invite-token.js';
import { validateInviteToken } from '../src/modules/invites/invite-validation.js';

function createMemoryEntity(initial = []) {
  const store = [...initial];
  return {
    store,
    async filter(criteria = {}) {
      return store.filter((row) =>
        Object.entries(criteria).every(([key, value]) => row?.[key] === value)
      );
    },
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const token = generateInviteToken();
  const tokenHash = await hashInviteToken(token);

  const entity = createMemoryEntity([
    {
      id: 'assessment-smoke-1',
      access_token_hash: tokenHash,
      access_token: token,
      invite_status: 'active',
      invite_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      status: 'pending',
      created_date: new Date().toISOString(),
    },
  ]);

  const valid = await validateInviteToken(token, entity);
  assert(valid.status === 'valid', `Esperado valid, recebido ${valid.status}`);

  entity.store[0].invite_status = 'used';
  const used = await validateInviteToken(token, entity);
  assert(used.status === 'used', `Esperado used, recebido ${used.status}`);

  entity.store[0].invite_status = 'active';
  entity.store[0].invite_expires_at = new Date(Date.now() - 60 * 1000).toISOString();
  const expired = await validateInviteToken(token, entity);
  assert(expired.status === 'expired', `Esperado expired, recebido ${expired.status}`);

  const invalid = await validateInviteToken('wrong_token', entity);
  assert(invalid.status === 'invalid', `Esperado invalid, recebido ${invalid.status}`);

  // eslint-disable-next-line no-console
  console.log('Smoke invite flow OK');
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error?.message || error);
  process.exit(1);
});
