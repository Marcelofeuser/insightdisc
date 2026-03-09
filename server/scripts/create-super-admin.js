import { prisma } from '../src/lib/prisma.js';
import { hashPassword, verifyPassword } from '../src/lib/security.js';

const TARGET_USER = {
  name: 'Verônica Feuser',
  email: 'veronicafeuser.s@gmail.com',
  password: 'Linda@123',
  role: 'SUPER_ADMIN',
  credits: 999999999,
};

const TEMPLATE_SUPER_ADMIN_EMAIL = 'admin@insightdisc.app';

function buildDefaultWorkspaceName(name) {
  const baseName = String(name || 'Super Admin').trim() || 'Super Admin';
  return `${baseName} Workspace`;
}

async function ensureWorkspaceLinkage(tx, userId, templateUser) {
  let linkedOrganizationId = '';

  const templateMemberships = Array.isArray(templateUser?.memberships)
    ? templateUser.memberships
    : [];

  if (templateMemberships.length) {
    for (const membership of templateMemberships) {
      await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: membership.organizationId,
            userId,
          },
        },
        create: {
          organizationId: membership.organizationId,
          userId,
          role: membership.role,
        },
        update: {
          role: membership.role,
        },
      });
    }
    linkedOrganizationId = templateMemberships[0].organizationId;
  } else {
    const templateOwnedOrganizations = Array.isArray(templateUser?.organizationsOwned)
      ? templateUser.organizationsOwned
      : [];

    if (templateOwnedOrganizations.length) {
      linkedOrganizationId = templateOwnedOrganizations[0].id;
      await tx.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: linkedOrganizationId,
            userId,
          },
        },
        create: {
          organizationId: linkedOrganizationId,
          userId,
          role: 'ADMIN',
        },
        update: {
          role: 'ADMIN',
        },
      });
    }
  }

  if (!linkedOrganizationId) {
    const organization = await tx.organization.create({
      data: {
        name: buildDefaultWorkspaceName(TARGET_USER.name),
        companyName: TARGET_USER.name,
        logoUrl: '/brand/insightdisc-report-logo.png',
        brandPrimaryColor: '#0b1f3b',
        brandSecondaryColor: '#f7b500',
        reportFooterText: 'InsightDISC - Plataforma de Análise Comportamental',
        ownerId: userId,
      },
    });

    linkedOrganizationId = organization.id;

    await tx.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId,
        },
      },
      create: {
        organizationId: organization.id,
        userId,
        role: 'OWNER',
      },
      update: {
        role: 'OWNER',
      },
    });
  }

  return linkedOrganizationId;
}

async function main() {
  const normalizedEmail = TARGET_USER.email.trim().toLowerCase();
  const passwordHash = await hashPassword(TARGET_USER.password);

  const templateUser = await prisma.user.findUnique({
    where: { email: TEMPLATE_SUPER_ADMIN_EMAIL },
    include: {
      organizationsOwned: {
        select: { id: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
      memberships: {
        select: { organizationId: true, role: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  const existingTarget = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true },
  });

  const status = existingTarget ? 'updated' : 'created';

  const upserted = await prisma.$transaction(async (tx) => {
    const user = existingTarget
      ? await tx.user.update({
          where: { id: existingTarget.id },
          data: {
            name: TARGET_USER.name,
            role: TARGET_USER.role,
            passwordHash,
          },
        })
      : await tx.user.create({
          data: {
            name: TARGET_USER.name,
            email: normalizedEmail,
            role: TARGET_USER.role,
            passwordHash,
          },
        });

    await tx.credit.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        balance: TARGET_USER.credits,
      },
      update: {
        balance: TARGET_USER.credits,
      },
    });

    const linkedOrganizationId = await ensureWorkspaceLinkage(tx, user.id, templateUser);

    const hydrated = await tx.user.findUnique({
      where: { id: user.id },
      include: {
        credits: { select: { balance: true } },
        memberships: {
          select: { organizationId: true, role: true },
          orderBy: { createdAt: 'asc' },
        },
        organizationsOwned: {
          select: { id: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return {
      user: hydrated,
      linkedOrganizationId,
    };
  });

  const loginReady = await verifyPassword(TARGET_USER.password, upserted.user?.passwordHash || '');

  // eslint-disable-next-line no-console
  console.log('[create-super-admin] summary');
  // eslint-disable-next-line no-console
  console.log(`status: ${status}`);
  // eslint-disable-next-line no-console
  console.log(`userId: ${upserted.user?.id || '-'}`);
  // eslint-disable-next-line no-console
  console.log(`email: ${normalizedEmail}`);
  // eslint-disable-next-line no-console
  console.log(`role: ${upserted.user?.role || '-'}`);
  // eslint-disable-next-line no-console
  console.log(`linkedOrganizationId: ${upserted.linkedOrganizationId || '-'}`);
  // eslint-disable-next-line no-console
  console.log(`loginReady: ${loginReady ? 'yes' : 'no'}`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[create-super-admin] failed:', error?.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
