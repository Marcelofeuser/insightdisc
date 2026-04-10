import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';

function printUsage() {
  console.error('Uso: node server/scripts/reset-password.js <email> <nova-senha>');
  console.error('Exemplo: node server/scripts/reset-password.js veronicafeuser.s@gmail.com NovaSenha123!');
}

function getCliInput() {
  const [, , rawEmail = '', rawPassword = ''] = process.argv;
  const email = String(rawEmail || '').trim().toLowerCase();
  const password = String(rawPassword || '');

  if (!email || !password) {
    return null;
  }

  return { email, password };
}

async function main() {
  const input = getCliInput();
  if (!input) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });

  if (!user) {
    console.error(`[reset-password] usuario nao encontrado: ${input.email}`);
    process.exitCode = 1;
    return;
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
    },
  });

  console.log('[reset-password] senha atualizada com sucesso');
  console.log(`userId: ${user.id}`);
  console.log(`email: ${user.email}`);
  console.log(`name: ${user.name || '-'}`);
}

main()
  .catch((error) => {
    console.error('[reset-password] falha ao resetar senha:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
