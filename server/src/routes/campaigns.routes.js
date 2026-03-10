import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requireSuperAdmin } from '../middleware/rbac.js';
import {
  createCampaign,
  disableCampaignCoupon,
  exportCampaignCouponsCsv,
  exportCampaignsCsv,
  exportPromoAccountsCsv,
  generateCampaignCoupons,
  generatePromoAccounts,
  getCampaignAuditLogs,
  getCampaignOverview,
  listCampaignCoupons,
  listCampaigns,
  listPromoAccounts,
  redeemCampaignCoupon,
  setCampaignActiveState,
  updateCampaign,
} from '../modules/campaigns/campaign.service.js';

const router = Router();

const campaignSchema = z.object({
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().max(64).optional().or(z.literal('')),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  mode: z.enum(['COUPON', 'PROMO_ACCOUNT', 'BOTH']),
  creditsAmount: z.coerce.number().int().min(1).max(100000),
  quantityPlanned: z.coerce.number().int().min(0).max(100000).optional(),
  startsAt: z.string().trim().optional().or(z.literal('')),
  expiresAt: z.string().trim().optional().or(z.literal('')),
  isActive: z.boolean().optional(),
  allowMultipleRedemptionsPerUser: z.boolean().optional(),
  maxRedemptionsPerUser: z.coerce.number().int().min(1).max(500).optional(),
});

const campaignUpdateSchema = campaignSchema.partial().extend({
  name: z.string().trim().min(2).max(180).optional(),
  mode: z.enum(['COUPON', 'PROMO_ACCOUNT', 'BOTH']).optional(),
  creditsAmount: z.coerce.number().int().min(1).max(100000).optional(),
});

const couponGenerateSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(500),
  prefix: z.string().trim().max(16).optional().or(z.literal('')),
  allowOverflow: z.boolean().optional(),
});

const promoAccountGenerateSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(500),
  emailPrefix: z.string().trim().max(64).optional().or(z.literal('')),
  emailDomain: z.string().trim().max(180).optional().or(z.literal('')),
  allowOverflow: z.boolean().optional(),
  userRole: z.enum(['ADMIN', 'PRO', 'CANDIDATE']).optional(),
});

const redeemSchema = z.object({
  code: z.string().trim().min(3).max(64),
});

const ERROR_STATUS = {
  ACTOR_USER_REQUIRED: 400,
  AUTH_REQUIRED: 401,
  CAMPAIGN_ID_REQUIRED: 400,
  CAMPAIGN_NAME_REQUIRED: 400,
  CAMPAIGN_NOT_FOUND: 404,
  CAMPAIGN_LIMIT_REACHED: 409,
  CAMPAIGN_MODE_MISMATCH: 409,
  CAMPAIGN_REDEMPTION_CLOSED: 409,
  CAMPAIGN_SLUG_CONFLICT: 409,
  COUPON_ALREADY_REDEEMED: 409,
  COUPON_CODE_REQUIRED: 400,
  COUPON_DISABLED: 409,
  COUPON_GENERATION_FAILED: 500,
  COUPON_ID_REQUIRED: 400,
  COUPON_NOT_FOUND: 404,
  CREDIT_AMOUNT_REQUIRED: 400,
  CREDIT_TARGET_REQUIRED: 400,
  INVALID_CAMPAIGN_DATE: 400,
  INVALID_CAMPAIGN_MODE: 400,
  INVALID_CAMPAIGN_QUANTITY: 400,
  INVALID_CREDITS_AMOUNT: 400,
  INVALID_PROMO_ACCOUNT_ROLE: 400,
  PROMO_EMAIL_GENERATION_FAILED: 409,
  CAMPAIGN_USER_LIMIT_REACHED: 409,
};

function resolveErrorCode(error, fallback = 'CAMPAIGN_REQUEST_FAILED') {
  if (error instanceof z.ZodError) return 'INVALID_PAYLOAD';
  const code = String(error?.code || error?.message || '').trim().toUpperCase();
  if (code) return code;
  return fallback;
}

function sendError(res, error, fallback = 'CAMPAIGN_REQUEST_FAILED') {
  const code = resolveErrorCode(error, fallback);
  const status = ERROR_STATUS[code] || (code === 'INVALID_PAYLOAD' ? 400 : 500);
  return res.status(status).json({
    ok: false,
    error: code,
    message: error?.message || code,
  });
}

function readQueryFilters(req) {
  return {
    search: String(req.query.search || '').trim(),
    status: String(req.query.status || '').trim(),
    mode: String(req.query.mode || '').trim(),
    campaignId: String(req.query.campaignId || '').trim(),
    batchId: String(req.query.batchId || '').trim(),
    limit: Number(req.query.limit || 100),
  };
}

function buildCsvFileName(prefix = 'insightdisc-campaigns') {
  return `${prefix}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
}

router.post('/redeem', requireAuth, attachUser, async (req, res) => {
  try {
    const input = redeemSchema.parse(req.body || {});
    const payload = await redeemCampaignCoupon({
      code: input.code,
      userId: req.auth.userId,
      actorUserId: req.auth.userId,
    });
    return res.status(200).json({
      ok: true,
      ...payload,
      message: payload.alreadyRedeemed
        ? 'Este cupom já havia sido resgatado por esta conta.'
        : 'Cupom resgatado com sucesso.',
    });
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_REDEEM_FAILED');
  }
});

router.use(requireAuth, attachUser, requireSuperAdmin);

router.get('/overview', async (_req, res) => {
  try {
    const summary = await getCampaignOverview();
    return res.status(200).json({ ok: true, summary });
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_OVERVIEW_FAILED');
  }
});

router.get('/export/campaigns.csv', async (req, res) => {
  try {
    const csv = await exportCampaignsCsv(readQueryFilters(req));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${buildCsvFileName('campaigns')}"`);
    return res.status(200).send(csv);
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_EXPORT_FAILED');
  }
});

router.get('/export/coupons.csv', async (req, res) => {
  try {
    const csv = await exportCampaignCouponsCsv(readQueryFilters(req));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${buildCsvFileName('campaign-coupons')}"`);
    return res.status(200).send(csv);
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_COUPON_EXPORT_FAILED');
  }
});

router.get('/export/promo-accounts.csv', async (req, res) => {
  try {
    const csv = await exportPromoAccountsCsv({
      filters: readQueryFilters(req),
      includeSecrets: String(req.query.includeSecrets || '').trim() === '1',
      actorUserId: req.auth.userId,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${buildCsvFileName('campaign-promo-accounts')}"`,
    );
    return res.status(200).send(csv);
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_PROMO_ACCOUNT_EXPORT_FAILED');
  }
});

router.get('/coupons', async (req, res) => {
  try {
    const coupons = await listCampaignCoupons(readQueryFilters(req));
    return res.status(200).json({ ok: true, coupons });
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_COUPON_LIST_FAILED');
  }
});

router.get('/promo-accounts', async (req, res) => {
  try {
    const promoAccounts = await listPromoAccounts(readQueryFilters(req));
    return res.status(200).json({ ok: true, promoAccounts });
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_PROMO_ACCOUNT_LIST_FAILED');
  }
});

router.get('/', async (req, res) => {
  try {
    const campaigns = await listCampaigns(readQueryFilters(req));
    return res.status(200).json({ ok: true, campaigns });
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_LIST_FAILED');
  }
});

router.post('/', async (req, res) => {
  try {
    const input = campaignSchema.parse(req.body || {});
    const payload = await createCampaign({
      input,
      actorUserId: req.auth.userId,
    });
    return res.status(201).json(payload);
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_CREATE_FAILED');
  }
});

router.patch('/:campaignId', async (req, res) => {
  try {
    const input = campaignUpdateSchema.parse(req.body || {});
    const payload = await updateCampaign({
      campaignId: String(req.params.campaignId || '').trim(),
      input,
      actorUserId: req.auth.userId,
    });
    return res.status(200).json(payload);
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_UPDATE_FAILED');
  }
});

router.post('/:campaignId/activate', async (req, res) => {
  try {
    const payload = await setCampaignActiveState({
      campaignId: String(req.params.campaignId || '').trim(),
      actorUserId: req.auth.userId,
      isActive: true,
    });
    return res.status(200).json(payload);
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_ACTIVATE_FAILED');
  }
});

router.post('/:campaignId/pause', async (req, res) => {
  try {
    const payload = await setCampaignActiveState({
      campaignId: String(req.params.campaignId || '').trim(),
      actorUserId: req.auth.userId,
      isActive: false,
    });
    return res.status(200).json(payload);
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_PAUSE_FAILED');
  }
});

router.post('/:campaignId/coupons/generate', async (req, res) => {
  try {
    const input = couponGenerateSchema.parse(req.body || {});
    const payload = await generateCampaignCoupons({
      campaignId: String(req.params.campaignId || '').trim(),
      quantity: input.quantity,
      prefix: input.prefix || '',
      allowOverflow: Boolean(input.allowOverflow),
      actorUserId: req.auth.userId,
    });
    return res.status(200).json(payload);
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_COUPON_GENERATE_FAILED');
  }
});

router.post('/coupons/:couponId/disable', async (req, res) => {
  try {
    const payload = await disableCampaignCoupon({
      couponId: String(req.params.couponId || '').trim(),
      actorUserId: req.auth.userId,
    });
    return res.status(200).json(payload);
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_COUPON_DISABLE_FAILED');
  }
});

router.post('/:campaignId/promo-accounts/generate', async (req, res) => {
  try {
    const input = promoAccountGenerateSchema.parse(req.body || {});
    const payload = await generatePromoAccounts({
      campaignId: String(req.params.campaignId || '').trim(),
      quantity: input.quantity,
      emailPrefix: input.emailPrefix || '',
      emailDomain: input.emailDomain || '',
      allowOverflow: Boolean(input.allowOverflow),
      userRole: input.userRole || 'PRO',
      actorUserId: req.auth.userId,
    });
    return res.status(200).json({
      ...payload,
      downloadPath: `/api/campaigns/export/promo-accounts.csv?batchId=${encodeURIComponent(
        payload.batch.id,
      )}&includeSecrets=1`,
    });
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_PROMO_ACCOUNT_GENERATE_FAILED');
  }
});

router.get('/:campaignId/audit', async (req, res) => {
  try {
    const logs = await getCampaignAuditLogs({
      campaignId: String(req.params.campaignId || '').trim(),
      limit: Number(req.query.limit || 100),
    });
    return res.status(200).json({ ok: true, logs });
  } catch (error) {
    return sendError(res, error, 'CAMPAIGN_AUDIT_FETCH_FAILED');
  }
});

export default router;
