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

  console.log(`[seed-super-admin] ${result} user: ${email}`);
  console.log('[seed-super-admin] summary');
  console.log(`  status: ${result}`);
  console.log(`  email: ${email}`);
  console.log(`  role: ${role}`);
  console.log(
    `  source env: SUPER_ADMIN_SEED_EMAIL=${process.env.SUPER_ADMIN_SEED_EMAIL ? 'set' : 'unset'} / SUPER_ADMIN_SEED_PASSWORD=${process.env.SUPER_ADMIN_SEED_PASSWORD ? 'set' : 'unset'}`,
  );
  console.log('  login url: http://localhost:5173/super-admin-login');
  console.log(
    `  senha de login: ${
      hasSeedPassword || hasLegacyPassword ? '(definida em variável de ambiente)' : 'change_me_in_production (fallback padrão)'
    }`,
  );
  console.log('  master key env: SUPER_ADMIN_MASTER_KEY');
  console.log('----------------------------------------');
  console.log('SUPER ADMIN READY');
  console.log('URL: http://localhost:5173/super-admin-login');
  console.log(`EMAIL: ${email}`);
  console.log(`PASSWORD: ${password}`);
  console.log('MASTER KEY: use value from server/.env');
  console.log('----------------------------------------');
}

main()
  .catch((error) => {
    console.error('[seed-super-admin] failed:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
