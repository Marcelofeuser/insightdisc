import crypto from 'node:crypto';

const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 14;

function base64urlEncode(value) {
  return Buffer.from(value).toString('base64url');
}

function base64urlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getSecret() {
  return process.env.REPORT_TOKEN_SECRET || process.env.STRIPE_WEBHOOK_SECRET || 'disc-pro-dev-secret';
}

export function signPublicReportToken(payload = {}, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const body = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedBody = base64urlEncode(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedBody}`;

  const signature = crypto
    .createHmac('sha256', getSecret())
    .update(data)
    .digest('base64url');

  return `${data}.${signature}`;
}

export function verifyPublicReportToken(token) {
  if (!token || typeof token !== 'string') {
    throw new Error('Token inválido.');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Token malformado.');
  }

  const [header, body, signature] = parts;
  const data = `${header}.${body}`;
  const expectedSignature = crypto
    .createHmac('sha256', getSecret())
    .update(data)
    .digest('base64url');

  if (signature !== expectedSignature) {
    throw new Error('Assinatura inválida.');
  }

  const payload = JSON.parse(base64urlDecode(body));
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!payload?.exp || payload.exp < nowSeconds) {
    throw new Error('Token expirado.');
  }

  return payload;
}

export default verifyPublicReportToken;
