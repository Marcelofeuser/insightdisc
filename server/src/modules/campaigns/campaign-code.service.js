import crypto from 'node:crypto';

const COUPON_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';

function randomChars(length, alphabet) {
  const size = Math.max(1, Number(length || 1));
  const source = crypto.randomBytes(size);
  const chars = [];
  for (let index = 0; index < size; index += 1) {
    chars.push(alphabet[source[index] % alphabet.length]);
  }
  return chars.join('');
}

export function normalizeCampaignSlug(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 48);
}

export function buildCampaignCodePrefix({ prefix = '', slug = '', name = '' } = {}) {
  const base = prefix || slug || name || 'INSIGHT';
  const normalized = String(base || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();

  return (normalized || 'INSIGHT').slice(0, 10);
}

export function generateCouponCode({ prefix = '', slug = '', name = '' } = {}) {
  const label = buildCampaignCodePrefix({ prefix, slug, name });
  return `${label}-${randomChars(6, COUPON_ALPHABET)}`;
}

export function generatePromoPassword(length = 12) {
  return randomChars(Math.max(10, Number(length || 12)), PASSWORD_ALPHABET);
}

export function buildPromoEmail({
  campaign = {},
  index = 1,
  emailPrefix = '',
  emailDomain = '',
} = {}) {
  const slug = normalizeCampaignSlug(campaign?.slug || campaign?.name || 'promo') || 'promo';
  const numeric = String(Number(index || 1)).padStart(3, '0');
  const localPart = String(emailPrefix || `promo+${slug}`)
    .toLowerCase()
    .replace(/[^a-z0-9+._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 42);
  const domain = String(emailDomain || 'insightdisc.app')
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9.-]+/g, '')
    .replace(/^-+|-+$/g, '') || 'insightdisc.app';

  return `${localPart}${localPart.includes('+') ? '' : '-'}${numeric}@${domain}`;
}
