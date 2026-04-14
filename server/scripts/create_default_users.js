import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_PASSWORD = 'Insight@2024';

const USERS = [
  { email: 'personal@insightdisc.com', name: 'Personal Demo', plan: 'PERSONAL' },
  { email: 'insider@insightdisc.com', name: 'Insider Demo', plan: 'PERSONAL' },
  { email: 'professional@insightdisc.com', name: 'Professional Demo', plan: 'PROFESSIONAL' },
  { email: 'business@insightdisc.com', name: 'Business Demo', plan: 'BUSINESS' },
  { email: 'corp@insightdisc.com', name: 'Corp Demo', plan: 'CORPORATION' },
  { email: 'diamond@insightdisc.com', name: 'Diamond Demo', plan: 'DIAMOND' },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  for (const { email, name, plan } of USERS) {
    const exists = await prisma.user.findUnique({ where: { email } });

    if (exists) {
      console.log(`⏭️  Já existe: ${email}`);
      continue;
    }

    await prisma.user.create({
      data: {
        email, name, passwordHash, role: 'PRO', plan,
        credits: { create: { balance: 100 } },
      },
    });

    console.log(`✅ Criado: ${email} | ${plan} | 100 créditos`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
