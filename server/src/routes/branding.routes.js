import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { attachUser, canManageOrganization, requireActiveCustomer } from '../middleware/rbac.js';
import {
  getOrganizationBranding,
  updateOrganizationBranding,
  isValidHexColor,
} from '../modules/branding/branding-service.js';
import {
  brandingLogoUpload,
  saveBrandingLogo,
  buildLogoAbsoluteUrl,
} from '../modules/branding/upload-logo.js';

const router = Router();

router.use(requireAuth, attachUser, requireActiveCustomer);

const brandingSchema = z
  .object({
    company_name: z.string().trim().min(1).max(120).optional(),
    logo_url: z.string().trim().max(600).optional(),
    brand_primary_color: z.string().trim().optional(),
    brand_secondary_color: z.string().trim().optional(),
    report_footer_text: z.string().trim().min(1).max(180).optional(),
  })
  .superRefine((input, ctx) => {
    if (
      input.brand_primary_color !== undefined &&
      !isValidHexColor(input.brand_primary_color)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['brand_primary_color'],
        message: 'Cor primária inválida. Use formato hex #RRGGBB.',
      });
    }

    if (
      input.brand_secondary_color !== undefined &&
      !isValidHexColor(input.brand_secondary_color)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['brand_secondary_color'],
        message: 'Cor secundária inválida. Use formato hex #RRGGBB.',
      });
    }
  });

function normalizeWorkspaceId(raw) {
  return String(raw || '').trim();
}

function resolveFriendlyBrandingMessage(code = '', fallback = 'Não foi possível atualizar a identidade visual.') {
  const normalized = String(code || '').trim().toUpperCase();
  if (normalized.includes('FORBIDDEN')) {
    return 'Você não tem permissão para editar a marca deste workspace.';
  }
  if (normalized.includes('WORKSPACE') && normalized.includes('OBRIGAT')) {
    return 'Workspace não identificado para esta ação.';
  }
  return fallback;
}

async function ensureWorkspaceAccess(req, res, workspaceId) {
  if (!workspaceId) {
    res.status(400).json({
      ok: false,
      error: 'WORKSPACE_ID_REQUIRED',
      message: 'Workspace não identificado para esta ação.',
    });
    return false;
  }

  const allowed = await canManageOrganization(req.auth.userId, workspaceId);
  if (!allowed) {
    res.status(403).json({
      ok: false,
      error: 'FORBIDDEN',
      message: 'Você não tem permissão para editar a marca deste workspace.',
    });
    return false;
  }

  return true;
}

function runLogoUpload(req, res, next) {
  brandingLogoUpload.single('logo')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error?.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        ok: false,
        error: 'LOGO_FILE_TOO_LARGE',
        message: 'Logo deve ter no máximo 4MB.',
      });
      return;
    }

    res.status(400).json({
      ok: false,
      error: 'BRANDING_LOGO_UPLOAD_FAILED',
      message: error?.message || 'Falha no upload do logo.',
    });
  });
}

router.get('/:workspaceId', async (req, res) => {
  try {
    const workspaceId = normalizeWorkspaceId(req.params.workspaceId);
    if (!(await ensureWorkspaceAccess(req, res, workspaceId))) return;

    const branding = await getOrganizationBranding(workspaceId);
    if (!branding) {
      return res.status(404).json({
        ok: false,
        error: 'WORKSPACE_NOT_FOUND',
        message: 'Workspace não encontrado.',
      });
    }

    return res.status(200).json({ ok: true, ...branding });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: 'BRANDING_LOAD_FAILED',
      message: resolveFriendlyBrandingMessage(error?.message, 'Falha ao carregar branding.'),
    });
  }
});

router.put('/:workspaceId', async (req, res) => {
  try {
    const workspaceId = normalizeWorkspaceId(req.params.workspaceId);
    if (!(await ensureWorkspaceAccess(req, res, workspaceId))) return;

    const input = brandingSchema.parse(req.body || {});
    const branding = await updateOrganizationBranding(workspaceId, input);

    return res.status(200).json({ ok: true, ...branding });
  } catch (error) {
    return res.status(400).json({
      ok: false,
      error: 'BRANDING_SAVE_FAILED',
      message: resolveFriendlyBrandingMessage(error?.message, 'Falha ao salvar branding.'),
    });
  }
});

router.post('/:workspaceId/logo', runLogoUpload, async (req, res) => {
  try {
    const workspaceId = normalizeWorkspaceId(req.params.workspaceId);
    if (!(await ensureWorkspaceAccess(req, res, workspaceId))) return;

    const saved = await saveBrandingLogo({ workspaceId, file: req.file });
    const branding = await updateOrganizationBranding(workspaceId, { logo_url: saved.publicPath });

    return res.status(200).json({
      ok: true,
      logo_url: saved.publicPath,
      logo_absolute_url: buildLogoAbsoluteUrl(req, saved.publicPath),
      ...branding,
    });
  } catch (error) {
    const code = String(error?.code || error?.message || '').toUpperCase();
    if (code.includes('UPLOAD_STORAGE_NOT_CONFIGURED')) {
      return res.status(422).json({
        ok: false,
        error: 'UPLOAD_STORAGE_NOT_CONFIGURED',
        message:
          'Upload de arquivo indisponível neste ambiente. Use uma URL pública do logotipo no campo de logo.',
      });
    }
    return res.status(400).json({
      ok: false,
      error: 'BRANDING_LOGO_SAVE_FAILED',
      message: resolveFriendlyBrandingMessage(error?.message, 'Falha ao enviar logo.'),
    });
  }
});

export default router;
