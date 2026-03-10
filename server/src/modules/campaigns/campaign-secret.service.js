import crypto from 'node:crypto';
import { env } from '../../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const KEY = crypto.createHash('sha256').update(String(env.jwtSecret || 'change-me')).digest();

export function encryptPromoPassword(password = '') {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(String(password || ''), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    cipherText: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

export function decryptPromoPassword(secret = {}) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY,
    Buffer.from(String(secret?.iv || ''), 'base64'),
  );
  decipher.setAuthTag(Buffer.from(String(secret?.authTag || ''), 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(String(secret?.cipherText || ''), 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
