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
const aiApiUrl = String(process.env.AI_API_URL || '').trim();
const aiProvider = String(process.env.AI_PROVIDER || 'groq')
  .trim()
  .toLowerCase();
const groqApiKey = String(process.env.GROQ_API_KEY || '').trim();
const groqModel = String(process.env.GROQ_MODEL || 'llama3-70b-8192').trim();
const aiFallback1 = String(process.env.AI_FALLBACK_1 || '')
  .trim()
  .toLowerCase();
const aiFallback2 = String(process.env.AI_FALLBACK_2 || '')
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
  console.warn('[SUPER_ADMIN] SUPER_ADMIN_MASTER_KEY não configurada');
}

if (!aiApiUrl) {
  console.warn('[AI] AI_API_URL não configurada — usando providers locais (se disponíveis).');
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
  stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  stripePriceCredits: process.env.STRIPE_PRICE_ID_CREDITS || '',
  stripePriceDiscIndividual: process.env.STRIPE_PRICE_DISC_INDIVIDUAL || '',
  stripePricePersonal: process.env.STRIPE_PRICE_PERSONAL || '',
  stripePriceInsider: process.env.STRIPE_PRICE_INSIDER || '',
  stripePriceProfessional: process.env.STRIPE_PRICE_PROFESSIONAL || '',
  stripePriceBusiness: process.env.STRIPE_PRICE_BUSINESS || '',
  stripePriceBusinessCorporation: process.env.STRIPE_PRICE_BUSINESS_CORPORATION || '',
  stripePriceDiamondConsulting: process.env.STRIPE_PRICE_DIAMOND_CONSULTING || '',
  stripePriceWhiteLabelOneTime: process.env.STRIPE_PRICE_WHITE_LABEL_ONE_TIME || '',
  stripePriceReportUnlock: process.env.STRIPE_PRICE_REPORT_UNLOCK || '',
  stripePriceGift: process.env.STRIPE_PRICE_GIFT || '',
  stripePricePack10: process.env.STRIPE_PRICE_PACK_10 || '',
  stripePricePack50: process.env.STRIPE_PRICE_PACK_50 || '',
  stripePricePack100: process.env.STRIPE_PRICE_PACK_100 || '',
  stripePriceCredit1: process.env.STRIPE_PRICE_CREDIT_1 || '',
  stripePriceCredit5: process.env.STRIPE_PRICE_CREDIT_5 || '',
  stripePriceCredit10: process.env.STRIPE_PRICE_CREDIT_10 || '',
  stripePriceCredit50: process.env.STRIPE_PRICE_CREDIT_50 || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  serverUrl: process.env.SERVER_URL || '',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  superAdminMasterKey,
  hasSuperAdminKey,
  allowDevEmailAuth,
  aiApiUrl,
  aiProvider,
  groqApiKey,
  groqModel,
  aiFallback1,
  aiFallback2,
  geminiApiKey,
  geminiModel,
  corsAllowedOrigins,
};
