import './load-env.js';
import { buildAllowedOrigins } from '../lib/http-security.js';

const vitePort = Number(process.env.VITE_PORT || 5173);
const defaultAppUrl = `http://localhost:${vitePort}`;
const superAdminMasterKey = String(process.env.SUPER_ADMIN_MASTER_KEY || '').trim();
export const hasSuperAdminKey = Boolean(superAdminMasterKey);
const allowDevEmailAuth =
  String(process.env.ALLOW_DEV_EMAIL_AUTH || '')
    .trim()
    .toLowerCase() === 'true';
const aiProvider = String(process.env.AI_PROVIDER || 'gemini')
  .trim()
  .toLowerCase();
const groqApiKey = String(process.env.GROQ_API_KEY || '').trim();
const groqModel = String(process.env.GROQ_MODEL || 'llama-3.3-70b-versatile').trim();
const aiFallback1 = String(process.env.AI_FALLBACK_1 || 'gemini')
  .trim()
  .toLowerCase();
const aiFallback2 = String(process.env.AI_FALLBACK_2 || 'deterministic_engine')
  .trim()
  .toLowerCase();
const geminiApiKey = String(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
const geminiModel = String(process.env.GEMINI_MODEL || 'gemini-1.5-pro').trim();
const corsAllowedOrigins = buildAllowedOrigins({
  appUrl:
    process.env.APP_URL ||
    process.env.VITE_APP_URL ||
    process.env.FRONTEND_URL ||
    defaultAppUrl,
  extraOrigins: process.env.CORS_ALLOWED_ORIGINS || '',
  nodeEnv: process.env.NODE_ENV || 'development',
});

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
  aiProvider,
  groqApiKey,
  groqModel,
  aiFallback1,
  aiFallback2,
  geminiApiKey,
  geminiModel,
  corsAllowedOrigins,
};
