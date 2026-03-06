import { createClient } from '@base44/sdk';
import { appParams } from '@/lib/app-params';
import { base44Mock } from '@/api/base44Mock';

const { appId, token, functionsVersion, appBaseUrl } = appParams;
const hasValidAppId = Boolean(
  typeof appId === 'string' &&
  appId.trim() &&
  appId !== 'null' &&
  appId !== 'undefined'
);

//Create a client with authentication required
export const base44 = hasValidAppId
  ? createClient({
      appId,
      token,
      functionsVersion,
      serverUrl: '',
      requiresAuth: false,
      appBaseUrl
    })
  : base44Mock;
