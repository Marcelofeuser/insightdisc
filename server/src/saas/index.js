// Entrypoint do módulo SaaS isolado
import express from 'express';
const router = express.Router();
import saasTestRoutes from './routes/saasTestRoutes.js';

router.use('/', saasTestRoutes);

export default router;
