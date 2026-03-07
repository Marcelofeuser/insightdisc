import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, requireActiveCustomer, requireRole } from '../middleware/rbac.js';

const router = Router();

const createLeadSchema = z.object({
  source: z.string().min(1).max(120).optional(),
  name: z.string().min(2).max(160),
  email: z.string().email(),
  phone: z.string().max(40).optional(),
  company: z.string().max(160).optional(),
  interest: z.string().max(200).optional(),
  message: z.string().max(1200).optional(),
  page: z.string().max(240).optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
});

const patchLeadSchema = z.object({
  status: z.string().min(1).max(32).optional(),
  notes: z.string().max(2000).optional(),
  assignedTo: z.string().max(160).optional(),
  tags: z.array(z.string().max(60)).max(20).optional(),
});

function normalizeEmail(email = '') {
  return String(email || '').trim().toLowerCase();
}

function csvCell(value) {
  const escaped = String(value ?? '').replace(/"/g, '""');
  return `"${escaped}"`;
}

function normalizeTags(tags = []) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => String(tag || '').trim())
    .filter(Boolean)
    .slice(0, 20);
}

router.post('/', async (req, res) => {
  try {
    const input = createLeadSchema.parse(req.body || {});
    const created = await prisma.lead.create({
      data: {
        source: String(input.source || 'chatbot'),
        name: String(input.name).trim(),
        email: normalizeEmail(input.email),
        phone: String(input.phone || '').trim() || null,
        company: String(input.company || '').trim() || null,
        interest: String(input.interest || '').trim() || null,
        message: String(input.message || '').trim() || null,
        page: String(input.page || '').trim() || null,
        tags: normalizeTags(input.tags || []),
      },
    });

    return res.status(201).json({ ok: true, lead: created });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'LEAD_CREATE_FAILED' });
  }
});

router.get(
  '/',
  requireAuth,
  attachUser,
  requireRole('ADMIN', 'PRO'),
  requireActiveCustomer,
  async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const search = String(req.query.search || '').trim();
    const limit = Math.min(200, Math.max(1, Number(req.query.limit || 100)));

    const where = {
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { company: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return res.status(200).json({ ok: true, leads });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'LEAD_LIST_FAILED' });
  }
  }
);

router.get(
  '/export/csv',
  requireAuth,
  attachUser,
  requireRole('ADMIN', 'PRO'),
  requireActiveCustomer,
  async (req, res) => {
  try {
    const status = String(req.query.status || '').trim();
    const where = status ? { status } : {};
    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const lines = [
      [
        'Data',
        'Nome',
        'Email',
        'Telefone',
        'Empresa',
        'Interesse',
        'Mensagem',
        'Status',
        'Origem',
      ],
      ...leads.map((lead) => [
        new Date(lead.createdAt).toISOString(),
        lead.name || '',
        lead.email || '',
        lead.phone || '',
        lead.company || '',
        lead.interest || '',
        lead.message || '',
        lead.status || '',
        lead.source || '',
      ]),
    ];

    const csv = lines.map((line) => line.map(csvCell).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="insightdisc-leads-${Date.now()}.csv"`
    );
    return res.status(200).send(`\uFEFF${csv}`);
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'LEAD_EXPORT_FAILED' });
  }
  }
);

router.get(
  '/:id',
  requireAuth,
  attachUser,
  requireRole('ADMIN', 'PRO'),
  requireActiveCustomer,
  async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      return res.status(404).json({ ok: false, error: 'LEAD_NOT_FOUND' });
    }
    return res.status(200).json({ ok: true, lead });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error?.message || 'LEAD_FETCH_FAILED' });
  }
  }
);

router.patch(
  '/:id',
  requireAuth,
  attachUser,
  requireRole('ADMIN', 'PRO'),
  requireActiveCustomer,
  async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const input = patchLeadSchema.parse(req.body || {});

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        ...(input.status !== undefined ? { status: String(input.status).trim() || 'new' } : {}),
        ...(input.notes !== undefined ? { notes: String(input.notes || '').trim() || null } : {}),
        ...(input.assignedTo !== undefined
          ? { assignedTo: String(input.assignedTo || '').trim() || null }
          : {}),
        ...(input.tags !== undefined ? { tags: normalizeTags(input.tags || []) } : {}),
      },
    });

    return res.status(200).json({ ok: true, lead: updated });
  } catch (error) {
    if (String(error?.message || '').includes('Record to update not found')) {
      return res.status(404).json({ ok: false, error: 'LEAD_NOT_FOUND' });
    }
    return res.status(400).json({ ok: false, error: error?.message || 'LEAD_UPDATE_FAILED' });
  }
  }
);

export default router;
