import { hasSynapsysRouteContext } from './session.js';
import { isSynapsysRuntime } from './runtime.js';

export function hasSynapsysSourceParam(search = '') {
  const searchParams = new URLSearchParams(String(search || ''));
  return String(searchParams.get('source') || '').trim().toLowerCase() === 'synapsys';
}

export function shouldUseSynapsysStandaloneMode({
  runtime = isSynapsysRuntime(),
  search = '',
  routeContext = hasSynapsysRouteContext(),
} = {}) {
  return Boolean(runtime || routeContext || hasSynapsysSourceParam(search));
}
