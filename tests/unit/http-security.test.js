import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAllowedOrigins,
  isOriginAllowed,
  sanitizeLogText,
} from '../../server/src/lib/http-security.js';

test('sanitizeLogText redige e-mails, bearer tokens e API keys', () => {
  const sanitized = sanitizeLogText(
    'email=foo@bar.com bearer abc.def.ghi apiKey=AIzaSy123456789 password=secret123',
  );

  assert.equal(sanitized.includes('foo@bar.com'), false);
  assert.equal(sanitized.includes('abc.def.ghi'), false);
  assert.equal(sanitized.includes('AIzaSy123456789'), false);
  assert.equal(sanitized.includes('secret123'), false);
});

test('buildAllowedOrigins combina APP_URL, extras e localhost em desenvolvimento', () => {
  const allowed = buildAllowedOrigins({
    appUrl: 'https://app.insightdisc.test',
    extraOrigins: 'https://admin.insightdisc.test,invalid-origin',
    nodeEnv: 'development',
  });

  assert.equal(allowed.includes('https://app.insightdisc.test'), true);
  assert.equal(allowed.includes('https://admin.insightdisc.test'), true);
  assert.equal(isOriginAllowed('https://admin.insightdisc.test', allowed), true);
  assert.equal(isOriginAllowed('https://evil.example', allowed), false);
  assert.equal(isOriginAllowed('', allowed), true);
});
