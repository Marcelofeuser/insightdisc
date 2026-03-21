import { env } from '../config/env.js';

function firstForwardedValue(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .find(Boolean) || ''
}

function normalizeBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function resolveOriginFromReferer(value) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';

  try {
    return new URL(normalized).origin;
  } catch {
    return '';
  }
}

export function getRequestBaseUrl(req) {
  const forwardedProto = firstForwardedValue(req?.headers?.['x-forwarded-proto']);
  const forwardedHost = firstForwardedValue(req?.headers?.['x-forwarded-host']);
  const protocol = forwardedProto || req?.protocol || 'http';
  const host = forwardedHost || req?.get?.('host') || ''

  if (host) {
    return `${protocol}://${host}`
  }

  return normalizeBaseUrl(process.env.APP_BASE_URL || '')
}

export function getPublicAppBaseUrl(req) {
  const headerOrigin = normalizeBaseUrl(req?.headers?.origin || '');
  if (headerOrigin) {
    return headerOrigin;
  }

  const refererOrigin = normalizeBaseUrl(resolveOriginFromReferer(req?.headers?.referer || ''));
  if (refererOrigin) {
    return refererOrigin;
  }

  const configuredAppUrl = normalizeBaseUrl(env.appUrl || process.env.APP_URL || '');
  if (configuredAppUrl) {
    return configuredAppUrl;
  }

  return getRequestBaseUrl(req);
}

export default getRequestBaseUrl
