import { Router } from 'express';

const router = Router();

export function handleStripeWebhook(_req, res) {
  res.sendStatus(200);
}

router.post('/stripe/webhook', handleStripeWebhook);

export default router;
