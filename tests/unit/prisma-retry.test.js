import test from 'node:test';
import assert from 'node:assert/strict';

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/test';

const { prisma, withPrismaRetry } = await import('../../server/src/lib/prisma.js');

test('withPrismaRetry reconecta e repete operação após Closed do Postgres', async () => {
  const originalDisconnect = prisma.$disconnect;
  const originalConnect = prisma.$connect;
  const originalQueryRawUnsafe = prisma.$queryRawUnsafe;

  let disconnectCalls = 0;
  let connectCalls = 0;
  let pingCalls = 0;
  let attempts = 0;
  const retries = [];

  prisma.$disconnect = async () => {
    disconnectCalls += 1;
  };
  prisma.$connect = async () => {
    connectCalls += 1;
  };
  prisma.$queryRawUnsafe = async () => {
    pingCalls += 1;
    return 1;
  };

  try {
    const result = await withPrismaRetry(
      async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error('Error in PostgreSQL connection: Error { kind: Closed, cause: None }');
        }

        return 'ok';
      },
      {
        retries: 1,
        onRetry: async ({ attempt, maxAttempts, reconnectError }) => {
          retries.push({ attempt, maxAttempts, reconnectError });
        },
      },
    );

    assert.equal(result, 'ok');
    assert.equal(attempts, 2);
    assert.equal(disconnectCalls, 1);
    assert.equal(connectCalls, 1);
    assert.equal(pingCalls, 1);
    assert.deepEqual(retries, [
      {
        attempt: 1,
        maxAttempts: 2,
        reconnectError: null,
      },
    ]);
  } finally {
    prisma.$disconnect = originalDisconnect;
    prisma.$connect = originalConnect;
    prisma.$queryRawUnsafe = originalQueryRawUnsafe;
  }
});
