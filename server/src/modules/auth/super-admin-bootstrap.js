import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';

const DEFAULT_SUPER_ADMIN_EMAIL = 'admin@insightdisc.app';
const DEFAULT_SUPER_ADMIN_PASSWORD = 'Trocar123!';
const DEFAULT_SUPER_ADMIN_NAME = 'Super Admin InsightDISC';

function normalizeEmail(value, fallback = DEFAULT_SUPER_ADMIN_EMAIL) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || fallback;
}

export function resolveSuperAdminSeedConfig() {
  const email = normalizeEmail(
    process.env.SUPER_ADMIN_SEED_EMAIL || process.env.SUPER_ADMIN_EMAIL,
    DEFAULT_SUPER_ADMIN_EMAIL,
  );
  const password = String(
    process.env.SUPER_ADMIN_SEED_PASSWORD ||
      process.env.SUPER_ADMIN_PASSWORD ||
      DEFAULT_SUPER_ADMIN_PASSWORD,
  );
  const name = String(process.env.SUPER_ADMIN_NAME || DEFAULT_SUPER_ADMIN_NAME).trim();

  return {
    email,
    password: password || DEFAULT_SUPER_ADMIN_PASSWORD,
    name: name || DEFAULT_SUPER_ADMIN_NAME,
  };
}

export async function findSeedSuperAdminUser(prismaClient = prisma) {
  const { email } = resolveSuperAdminSeedConfig();

  const byPreferredEmail = await prismaClient.user.findUnique({ where: { email } });
  if (byPreferredEmail) {
    return byPreferredEmail;
  }

  if (email !== DEFAULT_SUPER_ADMIN_EMAIL) {
    const byFallbackEmail = await prismaClient.user.findUnique({
      where: { email: DEFAULT_SUPER_ADMIN_EMAIL },
    });
    if (byFallbackEmail) {
      return byFallbackEmail;
    }
  }

  return prismaClient.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    orderBy: { createdAt: 'asc' },
  });
}

export async function getSuperAdminBootstrapStatus(prismaClient = prisma) {
  const seedConfig = resolveSuperAdminSeedConfig();
  const user = await findSeedSuperAdminUser(prismaClient);

  return {
    hasMasterKey: env.hasSuperAdminKey,
    seedEmail: seedConfig.email,
    hasSuperAdminUser: Boolean(user && String(user.role || '').toUpperCase() === 'SUPER_ADMIN'),
    user,
  };
}

export async function printSuperAdminBootstrapStatus(prismaClient = prisma) {
  try {
    const status = await getSuperAdminBootstrapStatus(prismaClient);

    const keyStatus = status.hasMasterKey ? 'configurada' : 'não configurada';
    // eslint-disable-next-line no-console
    console.log(`[SUPER_ADMIN] Master key ${keyStatus}.`);

    if (status.hasSuperAdminUser) {
      // eslint-disable-next-line no-console
      console.log(`[SUPER_ADMIN] Usuário SUPER_ADMIN detectado: ${status.user.email}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(
        `[SUPER_ADMIN] Usuário SUPER_ADMIN não encontrado (email alvo: ${status.seedEmail}). Execute: npm run seed:super-admin`,
      );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      `[SUPER_ADMIN] Não foi possível validar bootstrap automático: ${error?.message || error}`,
    );
  }
}

