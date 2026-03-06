import dotenv from 'dotenv';

dotenv.config();

const vitePort = Number(process.env.VITE_PORT || 5173);
const defaultAppUrl = `http://localhost:${vitePort}`;

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
  superAdminMasterKey: process.env.SUPER_ADMIN_MASTER_KEY || '',
};
