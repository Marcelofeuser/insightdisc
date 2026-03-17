import test from 'node:test';
import assert from 'node:assert/strict';
import { createIpRateLimiter } from '../../server/src/middleware/request-security.js';

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    payload: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    },
  };
}

test('createIpRateLimiter bloqueia após exceder o limite', () => {
  const limiter = createIpRateLimiter({
    windowMs: 60_000,
    maxRequests: 2,
    keyPrefix: 'test-auth',
    message: 'rate limited',
  });
  const req = {
    headers: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  };

  let nextCalls = 0;
  limiter(req, createResponse(), () => {
    nextCalls += 1;
  });
  limiter(req, createResponse(), () => {
    nextCalls += 1;
  });

  const blockedRes = createResponse();
  limiter(req, blockedRes, () => {
    nextCalls += 1;
  });

  assert.equal(nextCalls, 2);
  assert.equal(blockedRes.statusCode, 429);
  assert.equal(blockedRes.payload?.ok, false);
  assert.equal(blockedRes.payload?.error, 'TOO_MANY_REQUESTS');
  assert.equal(blockedRes.headers['Retry-After'] !== undefined, true);
});
