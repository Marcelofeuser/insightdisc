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
const rawApiUrl = String(import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim();
const forceMockInDev =
  import.meta.env.DEV &&
  (
    String(import.meta.env.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || '').toLowerCase() === 'true' ||
    !rawApiUrl
  );

//Create a client with authentication required
export const base44 = hasValidAppId && !forceMockInDev
  ? createClient({
      appId,
      token,
      functionsVersion,
      serverUrl: '',
      requiresAuth: false,
      appBaseUrl
    })
  : base44Mock;
