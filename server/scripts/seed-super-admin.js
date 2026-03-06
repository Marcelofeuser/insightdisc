import { prisma } from '../src/lib/prisma.js';
import { hashPassword } from '../src/lib/security.js';

const DEFAULT_EMAIL = 'admin@insightdisc.app';
const DEFAULT_PASSWORD = 'Trocar123!';
const role = 'SUPER_ADMIN';

async function main() {
  const email = String(process.env.SUPER_ADMIN_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
  const password = String(process.env.SUPER_ADMIN_PASSWORD || DEFAULT_PASSWORD);
  const name = String(process.env.SUPER_ADMIN_NAME || 'Super Admin InsightDISC').trim();

  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: name || existing.name,
        role,
        passwordHash,
      },
    });
    console.log(`[seed-super-admin] updated existing user: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      name,
      role,
      passwordHash,
      credits: { create: { balance: 0 } },
    },
  });

  console.log(`[seed-super-admin] created user: ${email}`);
}

main()
  .catch((error) => {
    console.error('[seed-super-admin] failed:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
