import dotenv from 'dotenv';

dotenv.config();

const vitePort = Number(process.env.VITE_PORT || 5173);
const defaultAppUrl = `http://localhost:${vitePort}`;
const superAdminMasterKey = String(process.env.SUPER_ADMIN_MASTER_KEY || '').trim();
export const hasSuperAdminKey = Boolean(superAdminMasterKey);
const allowDevEmailAuth =
  String(process.env.ALLOW_DEV_EMAIL_AUTH || '')
    .trim()
    .toLowerCase() === 'true';

if (!hasSuperAdminKey && process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.warn('[SUPER_ADMIN] SUPER_ADMIN_MASTER_KEY não configurada');
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.SERVER_PORT || 4000),
  appUrl:
    process.env.APP_URL ||
    process.env.VITE_APP_URL ||
    process.env.FRONTEND_URL ||
    defaultAppUrl,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripePriceCredits: process.env.STRIPE_PRICE_ID_CREDITS || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  superAdminMasterKey,
  hasSuperAdminKey,
  allowDevEmailAuth,
};
