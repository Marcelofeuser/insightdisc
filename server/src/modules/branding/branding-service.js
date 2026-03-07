import { prisma } from '../../lib/prisma.js';

export const BRANDING_FALLBACK = Object.freeze({
  company_name: 'InsightDISC',
  logo_url: '/brand/insightdisc-logo-transparent.png',
  brand_primary_color: '#0b1f3b',
  brand_secondary_color: '#f7b500',
  report_footer_text: 'InsightDISC - Plataforma de Análise Comportamental',
});

const HEX_COLOR_REGEX = /^#([A-Fa-f0-9]{6})$/;

function sanitizeText(value, maxLength = 140) {
  return String(value || '')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, maxLength);
}

function normalizeColor(value, fallback) {
  const color = String(value || '').trim();
  if (!color) return fallback;
  if (!HEX_COLOR_REGEX.test(color)) return fallback;
  return color.toLowerCase();
}

export function normalizeBrandingFromOrganization(organization = {}) {
  return {
    company_name:
      sanitizeText(organization?.companyName, 120) ||
      sanitizeText(organization?.name, 120) ||
      BRANDING_FALLBACK.company_name,
    logo_url: String(organization?.logoUrl || '').trim() || BRANDING_FALLBACK.logo_url,
    brand_primary_color: normalizeColor(
      organization?.brandPrimaryColor,
      BRANDING_FALLBACK.brand_primary_color
    ),
    brand_secondary_color: normalizeColor(
      organization?.brandSecondaryColor,
      BRANDING_FALLBACK.brand_secondary_color
    ),
    report_footer_text:
      sanitizeText(organization?.reportFooterText, 180) || BRANDING_FALLBACK.report_footer_text,
  };
}

export function normalizeBrandingInput(input = {}) {
  const hasCompanyName = Object.prototype.hasOwnProperty.call(input, 'company_name');
  const hasLogoUrl = Object.prototype.hasOwnProperty.call(input, 'logo_url');
  const hasPrimaryColor = Object.prototype.hasOwnProperty.call(input, 'brand_primary_color');
  const hasSecondaryColor = Object.prototype.hasOwnProperty.call(input, 'brand_secondary_color');
  const hasFooter = Object.prototype.hasOwnProperty.call(input, 'report_footer_text');

  return {
    companyName: hasCompanyName ? sanitizeText(input?.company_name, 120) || null : undefined,
    logoUrl: hasLogoUrl ? sanitizeText(input?.logo_url, 600) || null : undefined,
    brandPrimaryColor: hasPrimaryColor
      ? normalizeColor(input?.brand_primary_color, BRANDING_FALLBACK.brand_primary_color)
      : undefined,
    brandSecondaryColor: hasSecondaryColor
      ? normalizeColor(input?.brand_secondary_color, BRANDING_FALLBACK.brand_secondary_color)
      : undefined,
    reportFooterText: hasFooter ? sanitizeText(input?.report_footer_text, 180) || null : undefined,
  };
}

export async function getOrganizationBranding(organizationId) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      companyName: true,
      logoUrl: true,
      brandPrimaryColor: true,
      brandSecondaryColor: true,
      reportFooterText: true,
    },
  });

  if (!organization) return null;

  return {
    workspace_id: organization.id,
    workspace_name: organization.name,
    ...normalizeBrandingFromOrganization(organization),
  };
}

export async function updateOrganizationBranding(organizationId, input = {}) {
  const normalized = normalizeBrandingInput(input);
  const data = {};

  if (normalized.companyName !== undefined) data.companyName = normalized.companyName;
  if (normalized.logoUrl !== undefined) data.logoUrl = normalized.logoUrl;
  if (normalized.brandPrimaryColor !== undefined) data.brandPrimaryColor = normalized.brandPrimaryColor;
  if (normalized.brandSecondaryColor !== undefined) data.brandSecondaryColor = normalized.brandSecondaryColor;
  if (normalized.reportFooterText !== undefined) data.reportFooterText = normalized.reportFooterText;

  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data,
    select: {
      id: true,
      name: true,
      companyName: true,
      logoUrl: true,
      brandPrimaryColor: true,
      brandSecondaryColor: true,
      reportFooterText: true,
    },
  });

  return {
    workspace_id: organization.id,
    workspace_name: organization.name,
    ...normalizeBrandingFromOrganization(organization),
  };
}

export function isValidHexColor(value) {
  return HEX_COLOR_REGEX.test(String(value || '').trim());
}
