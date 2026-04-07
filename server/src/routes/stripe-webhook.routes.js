import { Router } from 'express';
import { handleStripeWebhook } from './stripe-webhooks.routes.js';

const router = Router();

// Mounted with express.raw() in server/src/app.js
router.post('/', handleStripeWebhook);

export default router;

