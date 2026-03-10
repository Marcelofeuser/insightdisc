import proxyBackendRequest from './_lib/backend-proxy.js';

export default async function handler(req, res) {
  return proxyBackendRequest(req, res);
}
