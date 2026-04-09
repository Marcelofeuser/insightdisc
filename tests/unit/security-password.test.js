import test from 'node:test';
import assert from 'node:assert/strict';

import { hashPassword, verifyPassword } from '../../server/src/lib/security.js';

test('verifyPassword retorna false quando o hash está ausente ou inválido', async () => {
  const validHash = await hashPassword('Insight123!');

  await assert.doesNotReject(() => verifyPassword('Insight123!', undefined));
  assert.equal(await verifyPassword('Insight123!', undefined), false);
  assert.equal(await verifyPassword('Insight123!', null), false);
  assert.equal(await verifyPassword('Insight123!', ''), false);
  assert.equal(await verifyPassword('Insight123!', 'hash-invalido'), false);
  assert.equal(await verifyPassword('Insight123!', validHash), true);
});
