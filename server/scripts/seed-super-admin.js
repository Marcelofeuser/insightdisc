import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/security.js';
import { resolveSuperAdminSeedConfig } from '../src/modules/auth/super-admin-bootstrap.js';

const role = 'SUPER_ADMIN';

async function main() {
  const { email, password, name } = resolveSuperAdminSeedConfig();
  const hasSeedPassword = Boolean(process.env.SUPER_ADMIN_SEED_PASSWORD);
  const hasLegacyPassword = Boolean(process.env.SUPER_ADMIN_PASSWORD);
  const passwordHash = await hashPassword(password);

  let result = 'created';
  let resolvedUser = null;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    result = 'updated';
    resolvedUser = await prisma.user.update({
      where: { id: existing.id },
      data: { name: name || existing.name, role, passwordHash },
    });
  } else {
    resolvedUser = await prisma.user.create({
      data: {
        email,
        name,
        role,
        passwordHash,
        credits: { create: { balance: 0 } },
      },
    });
  }

  if (resolvedUser?.id) {
    await prisma.credit.upsert({
      where: { userId: resolvedUser.id },
      create: { userId: resolvedUser.id, balance: 0 },
      update: {},
    });
  }

  // eslint-disable-next-line no-console
  console.log(`[seed-super-admin] ${result} user: ${email}`);
  // eslint-disable-next-line no-console
  console.log('[seed-super-admin] summary');
  // eslint-disable-next-line no-console
  console.log(`  status: ${result}`);
  // eslint-disable-next-line no-console
  console.log(`  email: ${email}`);
  // eslint-disable-next-line no-console
  console.log(`  role: ${role}`);
  // eslint-disable-next-line no-console
  console.log(
    `  source env: SUPER_ADMIN_SEED_EMAIL=${process.env.SUPER_ADMIN_SEED_EMAIL ? 'set' : 'unset'} / SUPER_ADMIN_SEED_PASSWORD=${process.env.SUPER_ADMIN_SEED_PASSWORD ? 'set' : 'unset'}`,
  );
  // eslint-disable-next-line no-console
  console.log('  login url: http://localhost:5173/super-admin-login');
  // eslint-disable-next-line no-console
  console.log(
    `  senha de login: ${
      hasSeedPassword || hasLegacyPassword ? '(definida em variável de ambiente)' : 'Trocar123! (fallback padrão)'
    }`,
  );
  // eslint-disable-next-line no-console
  console.log('  master key env: SUPER_ADMIN_MASTER_KEY');
  // eslint-disable-next-line no-console
  console.log('----------------------------------------');
  // eslint-disable-next-line no-console
  console.log('SUPER ADMIN READY');
  // eslint-disable-next-line no-console
  console.log('URL: http://localhost:5173/super-admin-login');
  // eslint-disable-next-line no-console
  console.log(`EMAIL: ${email}`);
  // eslint-disable-next-line no-console
  console.log(`PASSWORD: ${password}`);
  // eslint-disable-next-line no-console
  console.log('MASTER KEY: use value from server/.env');
  // eslint-disable-next-line no-console
  console.log('----------------------------------------');
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[seed-super-admin] failed:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
