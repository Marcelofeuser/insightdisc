import crypto from 'node:crypto';

function base64urlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function getSecret() {
  return process.env.REPORT_TOKEN_SECRET || process.env.STRIPE_WEBHOOK_SECRET || 'disc-pro-dev-secret';
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
