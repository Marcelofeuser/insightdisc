import { Router } from 'express';
import { pingPrisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
  const ts = new Date().toISOString();

  try {
    await pingPrisma({ retries: 1 });
    return res.status(200).json({
      ok: true,
      service: 'insightdisc-server',
      db: 'ok',
      ts,
    });
  } catch (error) {
    console.error('[health] falha no ping do banco', {
      code: String(error?.code || '').trim() || null,
      message: String(error?.message || error || 'DATABASE_UNAVAILABLE').slice(0, 240),
    });

    return res.status(503).json({
      ok: false,
      service: 'insightdisc-server',
      db: 'unavailable',
      error: 'DATABASE_UNAVAILABLE',
      ts,
    });
  }
});

export default router;
