function firstForwardedValue(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .find(Boolean) || ''
}

export function getRequestBaseUrl(req) {
  const forwardedProto = firstForwardedValue(req?.headers?.['x-forwarded-proto']);
  const forwardedHost = firstForwardedValue(req?.headers?.['x-forwarded-host']);
  const protocol = forwardedProto || req?.protocol || 'http';
  const host = forwardedHost || req?.get?.('host') || ''

  if (host) {
    return `${protocol}://${host}`
  }

  return String(process.env.APP_BASE_URL || '').trim().replace(/\/+$/, '')
}

export default getRequestBaseUrl
