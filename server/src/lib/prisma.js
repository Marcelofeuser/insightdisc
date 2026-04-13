import { PrismaClient } from '@prisma/client';
import '../config/load-env.js';
import {
  formatPrismaConnectionSummary,
  resolvePrismaConnectionConfig,
} from './prisma-connection.js';

const globalForPrisma = globalThis;
const PRISMA_GLOBAL_KEY = '__insightdiscPrisma';
const PRISMA_CONNECTION_META_KEY = '__insightdiscPrismaConnectionMeta';
const PRISMA_CONNECTION_LOGGED_KEY = '__insightdiscPrismaConnectionLogged';

function createPrismaClient() {
  const connectionConfig = resolvePrismaConnectionConfig();
  const client = new PrismaClient({
    datasourceUrl: connectionConfig.runtimeUrl,
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

  return {
    client,
    connectionConfig,
  };
}

const cachedPrisma =
  globalForPrisma[PRISMA_GLOBAL_KEY] ||
  createPrismaClient();

export const prisma = cachedPrisma.client;
export const prismaConnectionConfig = cachedPrisma.connectionConfig;

if (!globalForPrisma[PRISMA_GLOBAL_KEY]) {
  globalForPrisma[PRISMA_GLOBAL_KEY] = cachedPrisma;
}

if (!globalForPrisma[PRISMA_CONNECTION_META_KEY]) {
  globalForPrisma[PRISMA_CONNECTION_META_KEY] = prismaConnectionConfig;
}

const TRANSIENT_CONNECTION_PATTERNS = [
  'server has closed the connection',
  'connection terminated unexpectedly',
  'connection closed',
  'connection is closed',
  'kind: closed',
  'error in postgresql connection',
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resetPrismaConnection() {
  await prisma.$disconnect().catch(() => {});
  await prisma.$connect();
  await prisma.$queryRawUnsafe('SELECT 1');
}

export function logPrismaConnectionSummary() {
  if (globalForPrisma[PRISMA_CONNECTION_LOGGED_KEY]) return;

  const summary = formatPrismaConnectionSummary(prismaConnectionConfig);
  console.info(`[prisma] ${summary}`);
  prismaConnectionConfig.warnings.forEach((warning) => {
    console.warn(`[prisma] ${warning}`);
  });
  globalForPrisma[PRISMA_CONNECTION_LOGGED_KEY] = true;
}

export async function connectPrismaWithRetry({ retries = 3, initialDelayMs = 250 } = {}) {
  let attempts = 0;
  const maxAttempts = Math.max(1, Number(retries || 0) + 1);

  while (attempts < maxAttempts) {
    try {
      await prisma.$connect();
      await prisma.$queryRawUnsafe('SELECT 1');
      return prisma;
    } catch (error) {
      attempts += 1;
      if (!isTransientPrismaConnectionError(error) || attempts >= maxAttempts) {
        throw error;
      }

      await prisma.$disconnect().catch(() => {});
      await sleep(initialDelayMs * attempts);
    }
  }

  return prisma;
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}

export async function withPrismaRetry(
  operation,
  {
    retries = 1,
    initialDelayMs = 150,
    onRetry = null,
  } = {},
) {
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

       let reconnectError = null;
       try {
         await resetPrismaConnection();
       } catch (connectionResetError) {
         reconnectError = connectionResetError;
       }

       if (typeof onRetry === 'function') {
         await onRetry({
           attempt: attempts,
           maxAttempts,
           error,
           reconnectError,
         });
       }

       await sleep(initialDelayMs * attempts);
    }
  }

  throw lastError || new Error('PRISMA_OPERATION_FAILED');
}

export async function withPrismaTransactionRetry(
  operation,
  {
    retries = 1,
    initialDelayMs = 150,
    onRetry = null,
  } = {},
) {
  return withPrismaRetry(
    () => prisma.$transaction((tx) => operation(tx)),
    {
      retries,
      initialDelayMs,
      onRetry,
    },
  );
}
