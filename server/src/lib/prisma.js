import { PrismaClient } from '@prisma/client';
import '../config/load-env.js';

const globalForPrisma = globalThis;
const PRISMA_GLOBAL_KEY = '__insightdiscPrisma';

export const prisma =
  globalForPrisma[PRISMA_GLOBAL_KEY] ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

if (!globalForPrisma[PRISMA_GLOBAL_KEY]) {
  globalForPrisma[PRISMA_GLOBAL_KEY] = prisma;
}

const TRANSIENT_CONNECTION_PATTERNS = [
  'server has closed the connection',
  'connection terminated unexpectedly',
  "can't reach database server",
  'connection reset by peer',
  'timed out fetching a new connection',
];

const TRANSIENT_PRISMA_ERROR_CODES = new Set(['P1001', 'P1017', 'P2024', '57P01']);

export function isTransientPrismaConnectionError(error) {
  const code = String(error?.code || '').toUpperCase();
  if (code && TRANSIENT_PRISMA_ERROR_CODES.has(code)) {
    return true;
  }

  const message = String(error?.message || '').toLowerCase();
  return TRANSIENT_CONNECTION_PATTERNS.some((pattern) => message.includes(pattern));
}

export async function withPrismaRetry(operation, { retries = 1 } = {}) {
  let attempts = 0;
  let lastError = null;
  const maxAttempts = Math.max(0, Number(retries || 0)) + 1;

  while (attempts < maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      attempts += 1;
      if (!isTransientPrismaConnectionError(error) || attempts >= maxAttempts) {
        throw error;
      }
    }
  }

  throw lastError || new Error('PRISMA_OPERATION_FAILED');
}
