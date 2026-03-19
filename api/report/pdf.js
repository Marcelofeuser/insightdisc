import proxyBackendRequest from '../_lib/backend-proxy.js';

export default async function handler(req, res) {
  req.query = {
    ...(req.query || {}),
    path: 'assessment/public-report-pdf',
  };

  return proxyBackendRequest(req, res);
}
