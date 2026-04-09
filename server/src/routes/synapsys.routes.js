import { Router } from 'express';
import { generateSynapsysInsight } from '../modules/synapsys/service.js';

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

router.post('/analyze', async (req, res) => {
  try {
    const { input, mode } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input é obrigatório' });
    }

    const result = await generateSynapsysInsight(input, mode || 'builder');

    return res.json({
      success: true,
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
