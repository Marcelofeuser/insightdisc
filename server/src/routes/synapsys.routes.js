import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { generateSynapsysInsight } from '../modules/synapsys/service.js';
import {
  consumeSynapsysMessageForUser,
  getProductAccessForUser,
  mapProductAccessRecord,
  PRODUCT_KEYS,
  provisionSynapsysFreeAccessForUser,
} from '../modules/product-access/product-access.service.js';

const router = Router();

router.get('/health', (_req, res) => {
  const baseDomain = process.env.BASE_DOMAIN || 'insightdisc.com';
  const synapsysSubdomain = process.env.SYNAPSYS_SUBDOMAIN || 'synapsys';
  const synapsysProtocol = process.env.SYNAPSYS_PROTOCOL || 'https';

  const synapsysDomain = `${synapsysSubdomain}.${baseDomain}`;
  const synapsysUrl = `${synapsysProtocol}://${synapsysDomain}`;

  res.json({
    status: 'ok',
    provider: process.env.AI_PROVIDER || 'openai',
    openai_model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
    synapsys_domain: synapsysDomain,
    synapsys_url: synapsysUrl,
  });
});

router.get('/access', requireAuth, async (req, res) => {
  try {
    const access = await getProductAccessForUser(req.auth?.userId, PRODUCT_KEYS.SYNAPSYS);
    return res.json({
      ok: true,
      access: mapProductAccessRecord(access),
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'SYNAPSYS_ACCESS_LOAD_FAILED',
      message: error?.message || 'Falha ao carregar acesso da Synapsys.',
    });
  }
});

router.post('/access/free', requireAuth, async (req, res) => {
  try {
    const access = await provisionSynapsysFreeAccessForUser(req.auth?.userId);
    return res.status(201).json({
      ok: true,
      access: mapProductAccessRecord(access),
    });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: String(error?.code || 'SYNAPSYS_ACCESS_PROVISION_FAILED'),
      message: error?.message || 'Falha ao iniciar acesso gratuito da Synapsys.',
    });
  }
});

router.post('/analyze', requireAuth, async (req, res) => {
  try {
    const { input, mode } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input é obrigatório' });
    }

    let accessRecord = null;
    try {
      accessRecord = await consumeSynapsysMessageForUser(req.auth?.userId);
    } catch (accessError) {
      const accessPayload = accessError?.access || null;
      const accessCode = String(accessError?.code || accessError?.message || 'SYNAPSYS_ACCESS_REQUIRED');
      const statusCode =
        accessCode === 'SYNAPSYS_DAILY_LIMIT_REACHED'
          ? 402
          : accessCode === 'SYNAPSYS_ACCESS_BLOCKED'
            ? 403
            : 403;
      return res.status(statusCode).json({
        success: false,
        error: accessCode,
        message:
          accessCode === 'SYNAPSYS_DAILY_LIMIT_REACHED'
            ? 'Seu limite diário da Synapsys foi atingido.'
            : 'Acesso à Synapsys não liberado para esta conta.',
        access: accessPayload,
      });
    }

    const result = await generateSynapsysInsight(input, mode || 'builder');

    return res.json({
      success: true,
      access: mapProductAccessRecord(accessRecord),
      ...result,
    });
  } catch (error) {
    console.error('ERRO SYNAPSYS:', error.message);

    return res.status(500).json({
      success: false,
      source: 'error',
      error: error.message,
    });
  }
});

export default router;
