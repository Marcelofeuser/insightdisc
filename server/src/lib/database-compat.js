import { prisma } from './prisma.js';

async function ensureBillingPlanType() {
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'BillingPlan'
      ) THEN
        CREATE TYPE "BillingPlan" AS ENUM ('PERSONAL', 'PROFESSIONAL', 'BUSINESS', 'DIAMOND');
      END IF;
    END
    $$;
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      BEGIN
        ALTER TYPE "BillingPlan" ADD VALUE IF NOT EXISTS 'PERSONAL';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END;

      BEGIN
        ALTER TYPE "BillingPlan" ADD VALUE IF NOT EXISTS 'PROFESSIONAL';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END;

      BEGIN
        ALTER TYPE "BillingPlan" ADD VALUE IF NOT EXISTS 'BUSINESS';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END;

      BEGIN
        ALTER TYPE "BillingPlan" ADD VALUE IF NOT EXISTS 'DIAMOND';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END;
    END
    $$;
  `);
}

async function ensureUsersPlanColumn() {
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "plan" "BillingPlan" NOT NULL DEFAULT 'PERSONAL';
  `);
}

export async function ensureDatabaseCompatibility() {
  try {
    await ensureBillingPlanType();
    await ensureUsersPlanColumn();
    console.info('[db/compat] schema compatibility check completed');
  } catch (error) {
    console.error('[db/compat] failed to apply compatibility patches:', error?.message || error);
    throw error;
  }
}
