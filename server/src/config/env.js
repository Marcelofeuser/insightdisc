import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.SERVER_PORT || 4000),
  appUrl: process.env.APP_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripePriceCredits: process.env.STRIPE_PRICE_ID_CREDITS || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
};
