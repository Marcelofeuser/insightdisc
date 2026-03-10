import { prisma } from '../../lib/prisma.js';
import { hashPassword } from '../../lib/security.js';
import { grantCreditsToUser } from '../credits/grant-credits.js';
import {
  buildCampaignCodePrefix,
  buildPromoEmail,
  generateCouponCode,
  generatePromoPassword,
  normalizeCampaignSlug,
} from './campaign-code.service.js';
import { buildCsv } from './campaign-export.service.js';
import { decryptPromoPassword, encryptPromoPassword } from './campaign-secret.service.js';

const MAX_LIST_LIMIT = 500;
const ACTIVE_PROMO_ACCOUNT_STATUSES = ['CREATED', 'EXPORTED'];

function codeError(code, message = '') {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

function toInt(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
}

function clampLimit(value, fallback = 100) {
  const parsed = toInt(value, fallback);
  return Math.max(1, Math.min(MAX_LIST_LIMIT, parsed || fallback));
}

function normalizeSearch(value = '') {
  return String(value || '').trim();
}

function parseOptionalDate(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return null;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    throw codeError('INVALID_CAMPAIGN_DATE', 'Data inválida.');
  }
  return date;
}

function normalizeCampaignMode(mode = '') {
  const normalized = String(mode || '').trim().toUpperCase();
  if (normalized === 'COUPON' || normalized === 'PROMO_ACCOUNT' || normalized === 'BOTH') {
    return normalized;
  }
  throw codeError('INVALID_CAMPAIGN_MODE', 'Modo de campanha inválido.');
}

function normalizeCampaignInput(input = {}, { partial = false } = {}) {
  const payload = {
    ...input,
  };

  if (!partial || payload.name !== undefined) {
    const name = String(payload.name || '').trim();
    if (!name) throw codeError('CAMPAIGN_NAME_REQUIRED', 'Nome da campanha é obrigatório.');
    payload.name = name;
  }

  if (!partial || payload.mode !== undefined) {
    payload.mode = normalizeCampaignMode(payload.mode || 'COUPON');
  }

  if (!partial || payload.creditsAmount !== undefined) {
    const creditsAmount = toInt(payload.creditsAmount, 0);
    if (creditsAmount <= 0) {
      throw codeError('INVALID_CREDITS_AMOUNT', 'Quantidade de créditos inválida.');
    }
    payload.creditsAmount = creditsAmount;
  }

  if (!partial || payload.quantityPlanned !== undefined) {
    if (payload.quantityPlanned === '' || payload.quantityPlanned == null) {
      payload.quantityPlanned = null;
    } else {
      const quantityPlanned = toInt(payload.quantityPlanned, -1);
      if (quantityPlanned < 0) {
        throw codeError('INVALID_CAMPAIGN_QUANTITY', 'Quantidade planejada inválida.');
      }
      payload.quantityPlanned = quantityPlanned;
    }
  }

  if (!partial || payload.slug !== undefined) {
    payload.slug = normalizeCampaignSlug(payload.slug || '') || null;
  }

  if (!partial || payload.description !== undefined) {
    payload.description = String(payload.description || '').trim() || null;
  }

  if (!partial || payload.startsAt !== undefined) {
    payload.startsAt = parseOptionalDate(payload.startsAt);
  }

  if (!partial || payload.expiresAt !== undefined) {
    payload.expiresAt = parseOptionalDate(payload.expiresAt);
  }

  if (payload.startsAt && payload.expiresAt && payload.expiresAt <= payload.startsAt) {
    throw codeError('INVALID_CAMPAIGN_DATE', 'A expiração deve ser posterior ao início.');
  }

  if (!partial || payload.allowMultipleRedemptionsPerUser !== undefined) {
    payload.allowMultipleRedemptionsPerUser = Boolean(payload.allowMultipleRedemptionsPerUser);
  }

  if (!partial || payload.maxRedemptionsPerUser !== undefined) {
    const maxRedemptionsPerUser = toInt(payload.maxRedemptionsPerUser, 1);
    if (maxRedemptionsPerUser <= 0) {
      throw codeError('INVALID_CAMPAIGN_QUANTITY', 'Limite por usuário inválido.');
    }
    payload.maxRedemptionsPerUser = maxRedemptionsPerUser;
  }

  if (payload.allowMultipleRedemptionsPerUser === false) {
    payload.maxRedemptionsPerUser = 1;
  } else if (
    payload.allowMultipleRedemptionsPerUser === true &&
    (!payload.maxRedemptionsPerUser || payload.maxRedemptionsPerUser < 1)
  ) {
    payload.maxRedemptionsPerUser = 1;
  }

  if (!partial || payload.isActive !== undefined) {
    payload.isActive = payload.isActive === undefined ? true : Boolean(payload.isActive);
  }

  return payload;
}

function campaignSupportsCoupons(campaign = {}) {
  return campaign.mode === 'COUPON' || campaign.mode === 'BOTH';
}

function campaignSupportsPromoAccounts(campaign = {}) {
  return campaign.mode === 'PROMO_ACCOUNT' || campaign.mode === 'BOTH';
}

export function deriveCampaignStatus(campaign = {}, now = new Date()) {
  const current = now instanceof Date ? now : new Date(now || Date.now());
  const startsAt = campaign?.startsAt ? new Date(campaign.startsAt) : null;
  const expiresAt = campaign?.expiresAt ? new Date(campaign.expiresAt) : null;
  const quantityPlanned = toInt(campaign?.quantityPlanned, 0);
  const quantityGenerated = toInt(campaign?.quantityGenerated, 0);

  if (expiresAt && expiresAt.getTime() <= current.getTime()) return 'EXPIRADA';
  if (!campaign?.isActive) return 'PAUSADA';
  if (startsAt && startsAt.getTime() > current.getTime()) return 'AGENDADA';
  if (quantityPlanned > 0 && quantityGenerated >= quantityPlanned) return 'ESGOTADA';
  return 'ATIVA';
}

function deriveCouponStatus(coupon = {}, now = new Date()) {
  if (coupon?.status === 'AVAILABLE') {
    const campaignStatus = deriveCampaignStatus(coupon?.campaign || {}, now);
    if (campaignStatus === 'EXPIRADA') return 'EXPIRED';
  }
  return String(coupon?.status || 'AVAILABLE');
}

async function ensureUniqueCampaignSlug(slug, excludeId = '') {
  const normalizedSlug = String(slug || '').trim();
  if (!normalizedSlug) return;
  const existing = await prisma.campaign.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });
  if (existing && existing.id !== excludeId) {
    throw codeError('CAMPAIGN_SLUG_CONFLICT', 'Slug já utilizado por outra campanha.');
  }
}

async function createCampaignAuditLog(client, {
  campaignId = null,
  actorUserId = null,
  action,
  targetType,
  targetId,
  metadata = null,
}) {
  await client.campaignAuditLog.create({
    data: {
      campaignId,
      actorUserId,
      action: String(action || 'CAMPAIGN_EVENT').trim(),
      targetType: String(targetType || 'campaign').trim(),
      targetId: String(targetId || campaignId || '').trim() || 'unknown',
      metadata: metadata || null,
    },
  });
}

function sanitizeCampaign(campaign = {}, options = {}) {
  const now = options.now || new Date();
  const availableCoupons =
    options.availableCoupons ??
    (Array.isArray(campaign?.coupons)
      ? campaign.coupons.filter((coupon) => deriveCouponStatus({ ...coupon, campaign }, now) === 'AVAILABLE').length
      : 0);
  const promoAccountsGenerated =
    options.promoAccountsGenerated ??
    (Array.isArray(campaign?.promoAccounts) ? campaign.promoAccounts.length : 0);
  const creditsDistributed = Number(options.creditsDistributed ?? 0);

  return {
    id: campaign.id,
    name: campaign.name,
    slug: campaign.slug || '',
    description: campaign.description || '',
    mode: campaign.mode,
    creditsAmount: Number(campaign.creditsAmount || 0),
    quantityPlanned: campaign.quantityPlanned == null ? null : Number(campaign.quantityPlanned),
    quantityGenerated: Number(campaign.quantityGenerated || 0),
    quantityRedeemed: Number(campaign.quantityRedeemed || 0),
    startsAt: campaign.startsAt ? new Date(campaign.startsAt).toISOString() : '',
    expiresAt: campaign.expiresAt ? new Date(campaign.expiresAt).toISOString() : '',
    isActive: Boolean(campaign.isActive),
    allowMultipleRedemptionsPerUser: Boolean(campaign.allowMultipleRedemptionsPerUser),
    maxRedemptionsPerUser: Number(campaign.maxRedemptionsPerUser || 1),
    createdBy: campaign.createdBy,
    createdAt: campaign.createdAt ? new Date(campaign.createdAt).toISOString() : '',
    updatedAt: campaign.updatedAt ? new Date(campaign.updatedAt).toISOString() : '',
    status: deriveCampaignStatus(campaign, now),
    availableCoupons,
    promoAccountsGenerated,
    creditsDistributed,
    creator: campaign.creator
      ? {
          id: campaign.creator.id,
          name: campaign.creator.name,
          email: campaign.creator.email,
        }
      : null,
  };
}

async function ensureCampaignExists(campaignId, options = {}) {
  const normalizedCampaignId = String(campaignId || '').trim();
  if (!normalizedCampaignId) {
    throw codeError('CAMPAIGN_ID_REQUIRED', 'Campanha não informada.');
  }

  const client = options.client || prisma;
  const campaign = await client.campaign.findUnique({
    where: { id: normalizedCampaignId },
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  if (!campaign) {
    throw codeError('CAMPAIGN_NOT_FOUND', 'Campanha não encontrada.');
  }

  return campaign;
}

function assertCampaignCapacity(campaign, quantity, allowOverflow = false) {
  const planned = toInt(campaign?.quantityPlanned, 0);
  if (allowOverflow || planned <= 0) return;

  const alreadyGenerated = toInt(campaign?.quantityGenerated, 0);
  if (alreadyGenerated + quantity > planned) {
    throw codeError('CAMPAIGN_LIMIT_REACHED', 'Quantidade planejada da campanha já foi atingida.');
  }
}

async function nextUniqueCouponCode(client, campaign, prefix = '') {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const code = generateCouponCode({
      prefix,
      slug: campaign?.slug || '',
      name: campaign?.name || '',
    });
    const existing = await client.campaignCoupon.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!existing) return code;
  }

  throw codeError('COUPON_GENERATION_FAILED', 'Não foi possível gerar um código de cupom único.');
}

async function nextUniquePromoEmail(client, campaign, { emailPrefix = '', emailDomain = '', startIndex = 1 } = {}) {
  let currentIndex = Math.max(1, toInt(startIndex, 1));
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const email = buildPromoEmail({
      campaign,
      index: currentIndex,
      emailPrefix,
      emailDomain,
    });

    const [existingUser, existingProvision] = await Promise.all([
      client.user.findUnique({ where: { email }, select: { id: true } }),
      client.promoAccountProvision.findUnique({ where: { email }, select: { id: true } }),
    ]);

    if (!existingUser && !existingProvision) {
      return { email, index: currentIndex };
    }
    currentIndex += 1;
  }

  throw codeError('PROMO_EMAIL_GENERATION_FAILED', 'Não foi possível gerar e-mails promocionais únicos.');
}

function buildCampaignWhere(filters = {}) {
  const search = normalizeSearch(filters.search);
  const mode = String(filters.mode || '').trim().toUpperCase();
  const where = {};

  if (mode === 'COUPON' || mode === 'PROMO_ACCOUNT' || mode === 'BOTH') {
    where.mode = mode;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  return where;
}

async function enrichCampaignCollection(campaigns = []) {
  const normalizedCampaigns = Array.isArray(campaigns) ? campaigns : [];
  if (!normalizedCampaigns.length) return [];

  const campaignIds = normalizedCampaigns.map((campaign) => campaign.id);
  const [couponGroups, promoGroups, grantGroups] = await Promise.all([
    prisma.campaignCoupon.groupBy({
      by: ['campaignId', 'status'],
      where: { campaignId: { in: campaignIds } },
      _count: { _all: true },
    }),
    prisma.promoAccountProvision.groupBy({
      by: ['campaignId'],
      where: { campaignId: { in: campaignIds } },
      _count: { _all: true },
    }),
    prisma.creditGrant.groupBy({
      by: ['campaignId'],
      where: { campaignId: { in: campaignIds }, sourceType: { in: ['CAMPAIGN_COUPON', 'PROMO_ACCOUNT'] } },
      _sum: { amount: true },
    }),
  ]);

  const availableByCampaign = new Map();
  couponGroups.forEach((entry) => {
    if (entry.status === 'AVAILABLE') {
      availableByCampaign.set(entry.campaignId, Number(entry._count?._all || 0));
    }
  });

  const promoByCampaign = new Map();
  promoGroups.forEach((entry) => {
    promoByCampaign.set(entry.campaignId, Number(entry._count?._all || 0));
  });

  const creditsByCampaign = new Map();
  grantGroups.forEach((entry) => {
    creditsByCampaign.set(entry.campaignId, Number(entry._sum?.amount || 0));
  });

  return normalizedCampaigns.map((campaign) =>
    sanitizeCampaign(campaign, {
      availableCoupons: availableByCampaign.get(campaign.id) || 0,
      promoAccountsGenerated: promoByCampaign.get(campaign.id) || 0,
      creditsDistributed: creditsByCampaign.get(campaign.id) || 0,
    }),
  );
}

export async function createCampaign({ input = {}, actorUserId = '' } = {}) {
  if (!String(actorUserId || '').trim()) {
    throw codeError('ACTOR_USER_REQUIRED', 'Usuário responsável não informado.');
  }

  const payload = normalizeCampaignInput(input, { partial: false });
  await ensureUniqueCampaignSlug(payload.slug || '');

  const campaign = await prisma.$transaction(async (tx) => {
    const created = await tx.campaign.create({
      data: {
        name: payload.name,
        slug: payload.slug,
        description: payload.description,
        mode: payload.mode,
        creditsAmount: payload.creditsAmount,
        quantityPlanned: payload.quantityPlanned,
        startsAt: payload.startsAt,
        expiresAt: payload.expiresAt,
        isActive: payload.isActive,
        allowMultipleRedemptionsPerUser: payload.allowMultipleRedemptionsPerUser,
        maxRedemptionsPerUser: payload.maxRedemptionsPerUser,
        createdBy: actorUserId,
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    await createCampaignAuditLog(tx, {
      campaignId: created.id,
      actorUserId,
      action: 'CAMPAIGN_CREATED',
      targetType: 'campaign',
      targetId: created.id,
      metadata: {
        name: created.name,
        mode: created.mode,
        creditsAmount: created.creditsAmount,
      },
    });

    return created;
  });

  return {
    ok: true,
    campaign: sanitizeCampaign(campaign),
  };
}

export async function updateCampaign({ campaignId = '', input = {}, actorUserId = '' } = {}) {
  const existing = await ensureCampaignExists(campaignId);
  const payload = normalizeCampaignInput(input, { partial: true });
  if (payload.slug) {
    await ensureUniqueCampaignSlug(payload.slug, existing.id);
  }

  const updated = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.update({
      where: { id: existing.id },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.slug !== undefined ? { slug: payload.slug } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.mode !== undefined ? { mode: payload.mode } : {}),
        ...(payload.creditsAmount !== undefined ? { creditsAmount: payload.creditsAmount } : {}),
        ...(payload.quantityPlanned !== undefined ? { quantityPlanned: payload.quantityPlanned } : {}),
        ...(payload.startsAt !== undefined ? { startsAt: payload.startsAt } : {}),
        ...(payload.expiresAt !== undefined ? { expiresAt: payload.expiresAt } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        ...(payload.allowMultipleRedemptionsPerUser !== undefined
          ? { allowMultipleRedemptionsPerUser: payload.allowMultipleRedemptionsPerUser }
          : {}),
        ...(payload.maxRedemptionsPerUser !== undefined
          ? { maxRedemptionsPerUser: payload.maxRedemptionsPerUser }
          : {}),
      },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    await createCampaignAuditLog(tx, {
      campaignId: campaign.id,
      actorUserId,
      action: 'CAMPAIGN_UPDATED',
      targetType: 'campaign',
      targetId: campaign.id,
      metadata: {
        fields: Object.keys(payload),
      },
    });

    return campaign;
  });

  return {
    ok: true,
    campaign: sanitizeCampaign(updated),
  };
}

export async function setCampaignActiveState({ campaignId = '', isActive = true, actorUserId = '' } = {}) {
  const existing = await ensureCampaignExists(campaignId);
  const updated = await prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.update({
      where: { id: existing.id },
      data: { isActive: Boolean(isActive) },
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    await createCampaignAuditLog(tx, {
      campaignId: campaign.id,
      actorUserId,
      action: isActive ? 'CAMPAIGN_ACTIVATED' : 'CAMPAIGN_PAUSED',
      targetType: 'campaign',
      targetId: campaign.id,
      metadata: { isActive: Boolean(isActive) },
    });

    return campaign;
  });

  return {
    ok: true,
    campaign: sanitizeCampaign(updated),
  };
}

export async function listCampaigns(filters = {}) {
  const where = buildCampaignWhere(filters);
  const rows = await prisma.campaign.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: clampLimit(filters.limit, 100),
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
  });

  let campaigns = await enrichCampaignCollection(rows);
  const statusFilter = String(filters.status || '').trim().toUpperCase();
  if (statusFilter) {
    campaigns = campaigns.filter((campaign) => campaign.status === statusFilter);
  }
  return campaigns;
}

export async function getCampaignOverview() {
  const now = new Date();
  const [campaigns, couponGroups, promoAccountsGenerated, creditsDistributed] = await Promise.all([
    prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      take: 250,
      include: {
        creator: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.campaignCoupon.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.promoAccountProvision.count(),
    prisma.creditGrant.aggregate({
      where: { sourceType: { in: ['CAMPAIGN_COUPON', 'PROMO_ACCOUNT'] } },
      _sum: { amount: true },
    }),
  ]);

  const summary = {
    campaignsActive: 0,
    campaignsScheduled: 0,
    campaignsExpired: 0,
    campaignsPaused: 0,
    campaignsExhausted: 0,
    couponsAvailable: 0,
    couponsRedeemed: 0,
    couponsDisabled: 0,
    promoAccountsGenerated: Number(promoAccountsGenerated || 0),
    creditsDistributed: Number(creditsDistributed?._sum?.amount || 0),
  };

  campaigns.forEach((campaign) => {
    const status = deriveCampaignStatus(campaign, now);
    if (status === 'ATIVA') summary.campaignsActive += 1;
    if (status === 'AGENDADA') summary.campaignsScheduled += 1;
    if (status === 'EXPIRADA') summary.campaignsExpired += 1;
    if (status === 'PAUSADA') summary.campaignsPaused += 1;
    if (status === 'ESGOTADA') summary.campaignsExhausted += 1;
  });

  couponGroups.forEach((group) => {
    const count = Number(group._count?._all || 0);
    if (group.status === 'AVAILABLE') summary.couponsAvailable += count;
    if (group.status === 'REDEEMED') summary.couponsRedeemed += count;
    if (group.status === 'DISABLED') summary.couponsDisabled += count;
  });

  return summary;
}

export async function generateCampaignCoupons({
  campaignId = '',
  quantity = 1,
  prefix = '',
  allowOverflow = false,
  actorUserId = '',
} = {}) {
  const campaign = await ensureCampaignExists(campaignId);
  if (!campaignSupportsCoupons(campaign)) {
    throw codeError('CAMPAIGN_MODE_MISMATCH', 'Esta campanha não aceita geração de cupons.');
  }

  const normalizedQuantity = toInt(quantity, 0);
  if (normalizedQuantity <= 0) {
    throw codeError('INVALID_CAMPAIGN_QUANTITY', 'Quantidade inválida para geração de cupons.');
  }

  assertCampaignCapacity(campaign, normalizedQuantity, allowOverflow);

  const generatedCoupons = await prisma.$transaction(async (tx) => {
    const created = [];
    for (let index = 0; index < normalizedQuantity; index += 1) {
      const code = await nextUniqueCouponCode(tx, campaign, prefix || buildCampaignCodePrefix(campaign));
      const coupon = await tx.campaignCoupon.create({
        data: {
          campaignId: campaign.id,
          code,
          creditsAmount: campaign.creditsAmount,
        },
        include: {
          redeemedBy: { select: { id: true, name: true, email: true } },
          campaign: { select: { id: true, name: true, slug: true, expiresAt: true, isActive: true, startsAt: true } },
        },
      });
      created.push(coupon);
    }

    await tx.campaign.update({
      where: { id: campaign.id },
      data: { quantityGenerated: { increment: created.length } },
    });

    await createCampaignAuditLog(tx, {
      campaignId: campaign.id,
      actorUserId,
      action: 'COUPONS_GENERATED',
      targetType: 'campaign',
      targetId: campaign.id,
      metadata: {
        quantityRequested: normalizedQuantity,
        quantityGenerated: created.length,
        prefix: prefix || '',
      },
    });

    return created;
  });

  return {
    ok: true,
    generatedCount: generatedCoupons.length,
    coupons: generatedCoupons.map((coupon) => ({
      id: coupon.id,
      campaignId: coupon.campaignId,
      code: coupon.code,
      creditsAmount: Number(coupon.creditsAmount || 0),
      status: deriveCouponStatus(coupon),
      redeemedByUserId: coupon.redeemedByUserId || '',
      redeemedAt: coupon.redeemedAt ? new Date(coupon.redeemedAt).toISOString() : '',
      createdAt: new Date(coupon.createdAt).toISOString(),
      redeemedBy: coupon.redeemedBy
        ? {
            id: coupon.redeemedBy.id,
            name: coupon.redeemedBy.name,
            email: coupon.redeemedBy.email,
          }
        : null,
    })),
  };
}

function buildCouponWhere(filters = {}) {
  const where = {};
  const campaignId = String(filters.campaignId || '').trim();
  const search = normalizeSearch(filters.search);

  if (campaignId) {
    where.campaignId = campaignId;
  }

  if (search) {
    where.OR = [
      { code: { contains: search, mode: 'insensitive' } },
      { campaign: { is: { name: { contains: search, mode: 'insensitive' } } } },
      { redeemedBy: { is: { email: { contains: search, mode: 'insensitive' } } } },
      { redeemedBy: { is: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const requestedStatus = String(filters.status || '').trim().toUpperCase();
  if (requestedStatus === 'AVAILABLE' || requestedStatus === 'REDEEMED' || requestedStatus === 'DISABLED') {
    where.status = requestedStatus;
  }

  return where;
}

export async function listCampaignCoupons(filters = {}) {
  const rows = await prisma.campaignCoupon.findMany({
    where: buildCouponWhere(filters),
    orderBy: { createdAt: 'desc' },
    take: clampLimit(filters.limit, 100),
    include: {
      campaign: {
        select: {
          id: true,
          name: true,
          slug: true,
          startsAt: true,
          expiresAt: true,
          isActive: true,
          quantityGenerated: true,
          quantityRedeemed: true,
          quantityPlanned: true,
        },
      },
      redeemedBy: { select: { id: true, name: true, email: true } },
    },
  });

  let coupons = rows.map((coupon) => ({
    id: coupon.id,
    campaignId: coupon.campaignId,
    campaignName: coupon.campaign?.name || '-',
    code: coupon.code,
    creditsAmount: Number(coupon.creditsAmount || 0),
    status: deriveCouponStatus(coupon),
    redeemedByUserId: coupon.redeemedByUserId || '',
    redeemedAt: coupon.redeemedAt ? new Date(coupon.redeemedAt).toISOString() : '',
    createdAt: coupon.createdAt ? new Date(coupon.createdAt).toISOString() : '',
    redeemedBy: coupon.redeemedBy
      ? {
          id: coupon.redeemedBy.id,
          name: coupon.redeemedBy.name,
          email: coupon.redeemedBy.email,
        }
      : null,
  }));

  const requestedStatus = String(filters.status || '').trim().toUpperCase();
  if (requestedStatus === 'EXPIRED') {
    coupons = coupons.filter((coupon) => coupon.status === 'EXPIRED');
  }

  return coupons;
}

export async function disableCampaignCoupon({ couponId = '', actorUserId = '' } = {}) {
  const normalizedCouponId = String(couponId || '').trim();
  if (!normalizedCouponId) {
    throw codeError('COUPON_ID_REQUIRED', 'Cupom não informado.');
  }

  const coupon = await prisma.campaignCoupon.findUnique({
    where: { id: normalizedCouponId },
    include: {
      campaign: { select: { id: true, name: true } },
    },
  });

  if (!coupon) {
    throw codeError('COUPON_NOT_FOUND', 'Cupom não encontrado.');
  }

  if (coupon.status === 'REDEEMED') {
    throw codeError('COUPON_ALREADY_REDEEMED', 'Cupom já resgatado.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const disabledCoupon = await tx.campaignCoupon.update({
      where: { id: coupon.id },
      data: { status: 'DISABLED' },
      include: {
        campaign: { select: { id: true, name: true, slug: true, startsAt: true, expiresAt: true, isActive: true } },
        redeemedBy: { select: { id: true, name: true, email: true } },
      },
    });

    await createCampaignAuditLog(tx, {
      campaignId: disabledCoupon.campaignId,
      actorUserId,
      action: 'COUPON_DISABLED',
      targetType: 'coupon',
      targetId: disabledCoupon.id,
      metadata: { code: disabledCoupon.code },
    });

    return disabledCoupon;
  });

  return {
    ok: true,
    coupon: {
      id: updated.id,
      campaignId: updated.campaignId,
      code: updated.code,
      creditsAmount: Number(updated.creditsAmount || 0),
      status: deriveCouponStatus(updated),
      redeemedByUserId: updated.redeemedByUserId || '',
      redeemedAt: updated.redeemedAt ? new Date(updated.redeemedAt).toISOString() : '',
      createdAt: updated.createdAt ? new Date(updated.createdAt).toISOString() : '',
    },
  };
}

function buildPromoAccountWhere(filters = {}) {
  const where = {};
  const campaignId = String(filters.campaignId || '').trim();
  const batchId = String(filters.batchId || '').trim();
  const search = normalizeSearch(filters.search);
  const requestedStatus = String(filters.status || '').trim().toUpperCase();

  if (campaignId) where.campaignId = campaignId;
  if (batchId) where.batchId = batchId;
  if (requestedStatus === 'CREATED' || requestedStatus === 'ACTIVATED' || requestedStatus === 'EXPORTED' || requestedStatus === 'DISABLED') {
    where.status = requestedStatus;
  }

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { user: { is: { name: { contains: search, mode: 'insensitive' } } } },
      { campaign: { is: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  return where;
}

function promoUserName(campaign, index) {
  return `Conta Promocional ${campaign?.name || 'InsightDISC'} ${String(index).padStart(3, '0')}`;
}

async function provisionPromoAccount(client, {
  campaign,
  batch,
  actorUserId,
  email,
  sequence,
  userRole,
  rawPassword,
}) {
  const passwordHash = await hashPassword(rawPassword);

  return client.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        name: promoUserName(campaign, sequence),
        role: userRole,
        passwordHash,
        credits: { create: { balance: 0 } },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    if (userRole !== 'CANDIDATE') {
      const organization = await tx.organization.create({
        data: {
          name: `${campaign.name} ${String(sequence).padStart(3, '0')}`,
          companyName: `${campaign.name} Promo`,
          logoUrl: '/brand/insightdisc-report-logo.png',
          brandPrimaryColor: '#0b1f3b',
          brandSecondaryColor: '#f7b500',
          reportFooterText: 'InsightDISC - Conta promocional',
          ownerId: user.id,
        },
        select: { id: true },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: 'OWNER',
        },
      });
    }

    const provision = await tx.promoAccountProvision.create({
      data: {
        campaignId: campaign.id,
        batchId: batch.id,
        email,
        passwordHash,
        userId: user.id,
        creditsGranted: campaign.creditsAmount,
      },
      select: {
        id: true,
        email: true,
        creditsGranted: true,
        createdAt: true,
        status: true,
      },
    });

    const secret = encryptPromoPassword(rawPassword);
    await tx.promoAccountDeliverySecret.create({
      data: {
        provisionId: provision.id,
        cipherText: secret.cipherText,
        iv: secret.iv,
        authTag: secret.authTag,
      },
    });

    await grantCreditsToUser({
      tx,
      userId: user.id,
      amount: campaign.creditsAmount,
      reason: `Conta promocional da campanha ${campaign.name}`,
      sourceType: 'PROMO_ACCOUNT',
      sourceId: provision.id,
      actorUserId,
      campaignId: campaign.id,
    });

    await tx.promoAccountBatch.update({
      where: { id: batch.id },
      data: { generatedCount: { increment: 1 } },
    });

    await tx.campaign.update({
      where: { id: campaign.id },
      data: { quantityGenerated: { increment: 1 } },
    });

    return {
      provision,
      user,
    };
  });
}

export async function generatePromoAccounts({
  campaignId = '',
  quantity = 1,
  emailPrefix = '',
  emailDomain = '',
  allowOverflow = false,
  userRole = 'PRO',
  actorUserId = '',
} = {}) {
  const campaign = await ensureCampaignExists(campaignId);
  if (!campaignSupportsPromoAccounts(campaign)) {
    throw codeError('CAMPAIGN_MODE_MISMATCH', 'Esta campanha não aceita contas promocionais.');
  }

  const normalizedQuantity = toInt(quantity, 0);
  if (normalizedQuantity <= 0) {
    throw codeError('INVALID_CAMPAIGN_QUANTITY', 'Quantidade inválida para geração de contas.');
  }

  const normalizedRole = String(userRole || 'PRO').trim().toUpperCase();
  if (!['ADMIN', 'PRO', 'CANDIDATE'].includes(normalizedRole)) {
    throw codeError('INVALID_PROMO_ACCOUNT_ROLE', 'Perfil inválido para conta promocional.');
  }

  assertCampaignCapacity(campaign, normalizedQuantity, allowOverflow);

  const batch = await prisma.promoAccountBatch.create({
    data: {
      campaignId: campaign.id,
      createdBy: actorUserId,
      requestedCount: normalizedQuantity,
      creditsAmount: campaign.creditsAmount,
      userRole: normalizedRole,
      emailPrefix: String(emailPrefix || '').trim() || null,
      emailDomain: String(emailDomain || '').trim() || null,
    },
  });

  const createdAccounts = [];
  let sequence = toInt(campaign.quantityGenerated, 0) + 1;
  for (let index = 0; index < normalizedQuantity; index += 1) {
    const nextEmail = await nextUniquePromoEmail(prisma, campaign, {
      emailPrefix,
      emailDomain,
      startIndex: sequence,
    });
    sequence = nextEmail.index + 1;
    const rawPassword = generatePromoPassword(12);
    const created = await provisionPromoAccount(prisma, {
      campaign,
      batch,
      actorUserId,
      email: nextEmail.email,
      sequence: nextEmail.index,
      userRole: normalizedRole,
      rawPassword,
    });
    createdAccounts.push({
      id: created.provision.id,
      email: created.provision.email,
      creditsGranted: Number(created.provision.creditsGranted || 0),
      status: created.provision.status,
      createdAt: new Date(created.provision.createdAt).toISOString(),
      user: created.user,
    });
  }

  await createCampaignAuditLog(prisma, {
    campaignId: campaign.id,
    actorUserId,
    action: 'PROMO_ACCOUNTS_GENERATED',
    targetType: 'promo_batch',
    targetId: batch.id,
    metadata: {
      batchId: batch.id,
      quantityRequested: normalizedQuantity,
      quantityGenerated: createdAccounts.length,
      userRole: normalizedRole,
    },
  });

  return {
    ok: true,
    batch: {
      id: batch.id,
      campaignId: batch.campaignId,
      requestedCount: batch.requestedCount,
      generatedCount: createdAccounts.length,
      creditsAmount: batch.creditsAmount,
      userRole: batch.userRole,
      createdAt: new Date(batch.createdAt).toISOString(),
    },
    generatedCount: createdAccounts.length,
    accounts: createdAccounts,
  };
}

export async function listPromoAccounts(filters = {}) {
  const rows = await prisma.promoAccountProvision.findMany({
    where: buildPromoAccountWhere(filters),
    orderBy: { createdAt: 'desc' },
    take: clampLimit(filters.limit, 100),
    include: {
      campaign: {
        select: { id: true, name: true, slug: true },
      },
      batch: {
        select: {
          id: true,
          requestedCount: true,
          generatedCount: true,
          userRole: true,
          createdAt: true,
        },
      },
      user: {
        select: { id: true, email: true, name: true, role: true },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    campaignId: row.campaignId,
    campaignName: row.campaign?.name || '-',
    batchId: row.batchId,
    email: row.email,
    userId: row.userId,
    userName: row.user?.name || '-',
    userRole: row.user?.role || row.batch?.userRole || '-',
    creditsGranted: Number(row.creditsGranted || 0),
    status: row.status,
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : '',
    activatedAt: row.activatedAt ? new Date(row.activatedAt).toISOString() : '',
    exportedAt: row.exportedAt ? new Date(row.exportedAt).toISOString() : '',
    disabledAt: row.disabledAt ? new Date(row.disabledAt).toISOString() : '',
  }));
}

export async function getCampaignAuditLogs({ campaignId = '', limit = 100 } = {}) {
  const normalizedCampaignId = String(campaignId || '').trim();
  if (!normalizedCampaignId) {
    throw codeError('CAMPAIGN_ID_REQUIRED', 'Campanha não informada.');
  }

  const rows = await prisma.campaignAuditLog.findMany({
    where: { campaignId: normalizedCampaignId },
    orderBy: { createdAt: 'desc' },
    take: clampLimit(limit, 100),
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    campaignId: row.campaignId || '',
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    metadata: row.metadata || {},
    createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : '',
    actor: row.actor
      ? { id: row.actor.id, name: row.actor.name, email: row.actor.email }
      : null,
  }));
}

export async function exportCampaignsCsv(filters = {}) {
  const campaigns = await listCampaigns({ ...filters, limit: clampLimit(filters.limit, 250) });
  return buildCsv(
    campaigns.map((campaign) => ({
      id: campaign.id,
      nome: campaign.name,
      slug: campaign.slug,
      modo: campaign.mode,
      creditos_por_item: campaign.creditsAmount,
      planejado: campaign.quantityPlanned ?? '',
      gerado: campaign.quantityGenerated,
      resgatado: campaign.quantityRedeemed,
      inicio_utc: campaign.startsAt,
      expiracao_utc: campaign.expiresAt,
      ativa: campaign.isActive ? 'sim' : 'nao',
      status: campaign.status,
      limite_por_usuario: campaign.maxRedemptionsPerUser,
      criado_em_utc: campaign.createdAt,
    })),
  );
}

export async function exportCampaignCouponsCsv(filters = {}) {
  const coupons = await listCampaignCoupons({ ...filters, limit: clampLimit(filters.limit, 500) });
  return buildCsv(
    coupons.map((coupon) => ({
      id: coupon.id,
      campaign_id: coupon.campaignId,
      campaign_name: coupon.campaignName,
      code: coupon.code,
      credits_amount: coupon.creditsAmount,
      status: coupon.status,
      redeemed_by_email: coupon.redeemedBy?.email || '',
      redeemed_by_name: coupon.redeemedBy?.name || '',
      redeemed_at_utc: coupon.redeemedAt,
      created_at_utc: coupon.createdAt,
    })),
  );
}

export async function exportPromoAccountsCsv({ filters = {}, includeSecrets = false, actorUserId = '' } = {}) {
  const rows = await prisma.promoAccountProvision.findMany({
    where: buildPromoAccountWhere(filters),
    orderBy: { createdAt: 'desc' },
    take: clampLimit(filters.limit, 500),
    include: {
      campaign: { select: { id: true, name: true } },
      batch: { select: { id: true, userRole: true } },
      user: { select: { id: true, email: true, name: true, role: true } },
      deliverySecret: true,
    },
  });

  const revealableIds = [];
  const csvRows = rows.map((row) => {
    let temporaryPassword = '';
    let note = 'Senha não incluída nesta exportação.';

    if (includeSecrets) {
      if (row.deliverySecret && !row.deliverySecret.isRevealed) {
        temporaryPassword = decryptPromoPassword(row.deliverySecret);
        note = 'Senha temporária. Oriente a troca no primeiro acesso.';
        revealableIds.push(row.deliverySecret.id);
      } else {
        note = 'Senha já exportada anteriormente e não é reexibida.';
      }
    }

    return {
      id: row.id,
      batch_id: row.batchId,
      campaign_id: row.campaignId,
      campaign_name: row.campaign?.name || '-',
      email: row.email,
      nome: row.user?.name || '-',
      role: row.user?.role || row.batch?.userRole || '-',
      credits_granted: Number(row.creditsGranted || 0),
      status: row.status,
      created_at_utc: row.createdAt ? new Date(row.createdAt).toISOString() : '',
      activated_at_utc: row.activatedAt ? new Date(row.activatedAt).toISOString() : '',
      senha_temporaria: temporaryPassword,
      observacao: note,
    };
  });

  if (includeSecrets && revealableIds.length) {
    await prisma.$transaction(async (tx) => {
      await tx.promoAccountDeliverySecret.updateMany({
        where: { id: { in: revealableIds } },
        data: {
          isRevealed: true,
          revealedAt: new Date(),
          revealedByUserId: actorUserId || null,
        },
      });

      await tx.promoAccountProvision.updateMany({
        where: {
          deliverySecret: {
            is: { id: { in: revealableIds } },
          },
          status: 'CREATED',
        },
        data: {
          status: 'EXPORTED',
          exportedAt: new Date(),
        },
      });

      if (rows[0]?.campaignId) {
        await createCampaignAuditLog(tx, {
          campaignId: rows[0].campaignId,
          actorUserId,
          action: 'CAMPAIGN_EXPORTED',
          targetType: 'promo_accounts_csv',
          targetId: String(filters.batchId || rows[0].batchId || rows[0].campaignId),
          metadata: {
            includeSecrets: true,
            rows: revealableIds.length,
          },
        });
      }
    });
  }

  return buildCsv(csvRows);
}

export async function redeemCampaignCoupon({ code = '', userId = '', actorUserId = '' } = {}) {
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) {
    throw codeError('COUPON_CODE_REQUIRED', 'Código de cupom obrigatório.');
  }
  if (!String(userId || '').trim()) {
    throw codeError('AUTH_REQUIRED', 'Autenticação necessária.');
  }

  const coupon = await prisma.campaignCoupon.findUnique({
    where: { code: normalizedCode },
    include: {
      campaign: true,
      redeemedBy: { select: { id: true, email: true, name: true } },
    },
  });

  if (!coupon) {
    throw codeError('COUPON_NOT_FOUND', 'Cupom não encontrado.');
  }

  const campaignStatus = deriveCampaignStatus(coupon.campaign);
  if (campaignStatus === 'EXPIRADA' || campaignStatus === 'AGENDADA' || campaignStatus === 'PAUSADA') {
    throw codeError('CAMPAIGN_REDEMPTION_CLOSED', 'A campanha não está disponível para resgate.');
  }
  if (coupon.status === 'DISABLED') {
    throw codeError('COUPON_DISABLED', 'Este cupom está desabilitado.');
  }
  if (coupon.status === 'REDEEMED') {
    if (coupon.redeemedByUserId === userId) {
      const credit = await prisma.credit.findFirst({
        where: { userId },
        select: { balance: true },
      });
      return {
        ok: true,
        linked: true,
        alreadyRedeemed: true,
        balance: Number(credit?.balance || 0),
        coupon: {
          id: coupon.id,
          code: coupon.code,
          campaignId: coupon.campaignId,
          status: coupon.status,
          creditsAmount: Number(coupon.creditsAmount || 0),
        },
      };
    }
    throw codeError('COUPON_ALREADY_REDEEMED', 'Este cupom já foi resgatado.');
  }

  const redeemedCount = await prisma.campaignCoupon.count({
    where: {
      campaignId: coupon.campaignId,
      redeemedByUserId: userId,
      status: 'REDEEMED',
    },
  });

  const limit = coupon.campaign.allowMultipleRedemptionsPerUser
    ? Math.max(1, Number(coupon.campaign.maxRedemptionsPerUser || 1))
    : 1;
  if (redeemedCount >= limit) {
    throw codeError('CAMPAIGN_USER_LIMIT_REACHED', 'Este usuário já atingiu o limite desta campanha.');
  }

  return prisma.$transaction(async (tx) => {
    const reserved = await tx.campaignCoupon.updateMany({
      where: {
        id: coupon.id,
        status: 'AVAILABLE',
      },
      data: {
        status: 'REDEEMED',
        redeemedByUserId: userId,
        redeemedAt: new Date(),
      },
    });

    if (reserved.count !== 1) {
      throw codeError('COUPON_ALREADY_REDEEMED', 'Este cupom já foi resgatado.');
    }

    const creditGrant = await grantCreditsToUser({
      tx,
      userId,
      amount: coupon.creditsAmount,
      reason: `Resgate do cupom ${coupon.code}`,
      sourceType: 'CAMPAIGN_COUPON',
      sourceId: coupon.id,
      actorUserId: actorUserId || userId,
      campaignId: coupon.campaignId,
    });

    await tx.campaign.update({
      where: { id: coupon.campaignId },
      data: {
        quantityRedeemed: { increment: 1 },
      },
    });

    await createCampaignAuditLog(tx, {
      campaignId: coupon.campaignId,
      actorUserId: actorUserId || userId,
      action: 'COUPON_REDEEMED',
      targetType: 'coupon',
      targetId: coupon.id,
      metadata: {
        code: coupon.code,
        userId,
        amount: coupon.creditsAmount,
      },
    });

    return {
      ok: true,
      linked: true,
      alreadyRedeemed: false,
      balance: Number(creditGrant.balance || 0),
      coupon: {
        id: coupon.id,
        campaignId: coupon.campaignId,
        code: coupon.code,
        status: 'REDEEMED',
        creditsAmount: Number(coupon.creditsAmount || 0),
      },
    };
  });
}

export async function markPromoAccountActivated(userId = '') {
  const normalizedUserId = String(userId || '').trim();
  if (!normalizedUserId) return { ok: true, updated: 0 };

  const provisions = await prisma.promoAccountProvision.findMany({
    where: {
      userId: normalizedUserId,
      status: { in: ACTIVE_PROMO_ACCOUNT_STATUSES },
    },
    select: {
      id: true,
      campaignId: true,
      status: true,
    },
  });

  if (!provisions.length) {
    return { ok: true, updated: 0 };
  }

  await prisma.$transaction(async (tx) => {
    for (const provision of provisions) {
      await tx.promoAccountProvision.update({
        where: { id: provision.id },
        data: {
          status: 'ACTIVATED',
          activatedAt: new Date(),
        },
      });

      await tx.campaign.update({
        where: { id: provision.campaignId },
        data: {
          quantityRedeemed: { increment: 1 },
        },
      });

      await createCampaignAuditLog(tx, {
        campaignId: provision.campaignId,
        actorUserId: normalizedUserId,
        action: 'PROMO_ACCOUNT_ACTIVATED',
        targetType: 'promo_account',
        targetId: provision.id,
        metadata: { userId: normalizedUserId },
      });
    }
  });

  return { ok: true, updated: provisions.length };
}
