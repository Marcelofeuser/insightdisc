import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { attachUser } from '../middleware/rbac.js';
import { createCheckoutSession, listCheckoutProducts } from '../modules/checkout/checkout.service.js';

const router = Router();

const createCheckoutSchema = z
  .object({
    packageId: z.string().trim().optional(),
    credits: z.coerce.number().int().positive().max(500).optional(),
    provider: z.enum(['STRIPE', 'MERCADOPAGO']).optional(),
  })
  .refine(
    (value) => Boolean(String(value.packageId || '').trim()) || Number(value.credits || 0) > 0,
    'Informe packageId ou credits para criar checkout.',
  );

const ERROR_STATUS = Object.freeze({
  AUTH_REQUIRED: 401,
  INVALID_CHECKOUT_PRODUCT: 400,
  INVALID_CREDITS_AMOUNT: 400,
  INVALID_PAYLOAD: 400,
});

function resolveErrorCode(error, fallback = 'CHECKOUT_CREATE_FAILED') {
  if (error instanceof z.ZodError) return 'INVALID_PAYLOAD';
  return String(error?.code || error?.message || fallback)
    .trim()
    .toUpperCase();
}

function sendError(res, error, fallback = 'CHECKOUT_CREATE_FAILED') {
  const code = resolveErrorCode(error, fallback);
  const status = ERROR_STATUS[code] || 500;

  return res.status(status).json({
    ok: false,
    error: code,
    message: error?.message || code,
  });
}

router.use(requireAuth, attachUser);

router.get('/products', async (_req, res) => {
  try {
    return res.status(200).json({
      ok: true,
      products: listCheckoutProducts(),
    });
  } catch (error) {
    return sendError(res, error, 'CHECKOUT_PRODUCTS_FAILED');
  }
});

router.post('/create', async (req, res) => {
  try {
    const input = createCheckoutSchema.parse(req.body || {});

    const provider = String(input.provider || 'STRIPE').trim().toUpperCase();
    if (provider !== 'STRIPE') {
      return res.status(400).json({
        ok: false,
        error: 'CHECKOUT_PROVIDER_NOT_SUPPORTED',
        message: 'No momento, o checkout está disponível apenas via Stripe.',
      });
    }

    const payload = await createCheckoutSession({
      userId: req.auth.userId,
      auth: req.auth,
      packageId: input.packageId || '',
      credits: input.credits || 0,
    });

    return res.status(200).json({
      ok: true,
      checkoutUrl: payload.checkoutUrl,
      sessionId: payload.sessionId,
      provider: payload.provider,
      mocked: payload.mocked,
      package: payload.package,
    });
  } catch (error) {
    return sendError(res, error, 'CHECKOUT_CREATE_FAILED');
  }
});

export default router;
