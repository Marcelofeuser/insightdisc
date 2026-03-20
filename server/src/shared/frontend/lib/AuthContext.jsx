import React, { createContext, useState, useContext, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';
import { createAccessContext, deriveUserLifecycle, USER_LIFECYCLE } from '@/modules/auth/access-control';
import { useUserStore } from '@/store/user-store';
import {
  apiRequest,
  clearApiSession,
  getApiBaseUrl,
  getApiErrorMessage,
  getApiToken,
  isRetryableApiError,
} from '@/lib/apiClient';
import { createPageUrl } from '@/utils';

const AuthContext = createContext();
const ENABLE_DEV_LOGIN_SHORTCUTS =
  import.meta.env.DEV &&
  String(import.meta.env.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || '').toLowerCase() === 'true';
const CAN_USE_DEV_BASE44_FALLBACK = import.meta.env.DEV;
const SHOULD_SKIP_BASE44_PUBLIC_SETTINGS =
  CAN_USE_DEV_BASE44_FALLBACK && Boolean(base44?.__isMock);

function buildDevShortcutUser() {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;

  const email = String(window.localStorage.getItem('disc_mock_user_email') || '')
    .trim()
    .toLowerCase();
  if (!email) return null;

  const activeWorkspaceId =
    String(window.localStorage.getItem('disc_mock_active_tenant') || '').trim() || 'workspace-1';

  if (email === 'superadmin@example.com') {
    return {
      id: 'dev-super-admin',
      email,
      full_name: 'Super Admin E2E',
      role: 'SUPER_ADMIN',
      global_role: 'SUPER_ADMIN',
      tenant_role: null,
      tenant_id: activeWorkspaceId,
      active_workspace_id: activeWorkspaceId,
      entitlements: ['*'],
      plan: 'enterprise',
      credits: 999999,
      lifecycle_status: 'super_admin',
      has_paid_purchase: true,
    };
  }

  if (email === 'admin@example.com') {
    return {
      id: 'dev-admin',
      email,
      full_name: 'Admin E2E',
      role: 'admin',
      global_role: 'PLATFORM_ADMIN',
      tenant_role: 'TENANT_ADMIN',
      tenant_id: activeWorkspaceId,
      active_workspace_id: activeWorkspaceId,
      entitlements: ['report.pro', 'report.export.pdf', 'report.export.csv'],
      plan: 'premium',
      credits: 500,
      lifecycle_status: 'customer_active',
      has_paid_purchase: true,
    };
  }

  if (email === 'user@example.com') {
    return {
      id: 'dev-user',
      email,
      full_name: 'Usuario E2E',
      role: 'user',
      global_role: null,
      tenant_role: 'TENANT_USER',
      tenant_id: activeWorkspaceId,
      active_workspace_id: activeWorkspaceId,
      entitlements: [],
      plan: 'free',
      credits: 0,
      lifecycle_status: 'registered_no_purchase',
      has_paid_purchase: false,
    };
  }

  return {
    id: `dev-${email.replace(/[^a-z0-9]/g, '-')}`,
    email,
    full_name: 'Profissional E2E',
    role: 'professional',
    global_role: null,
    tenant_role: 'TENANT_ADMIN',
    tenant_id: activeWorkspaceId,
    active_workspace_id: activeWorkspaceId,
    entitlements: ['report.pro', 'report.export.pdf'],
    plan: 'premium',
    credits: 100,
    lifecycle_status: 'customer_active',
    has_paid_purchase: true,
  };
}

export const AuthProvider = ({ children }) => {
  const setAuthContextStore = useUserStore((state) => state.setAuthContext);
  const resetAuthContextStore = useUserStore((state) => state.resetAuthContext);
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }
  const apiBaseUrl = getApiBaseUrl();
  const access = useMemo(() => createAccessContext(user), [user]);

  const applyAuthenticatedUser = (nextUser) => {
    if (!nextUser) {
      setUser(null);
      setIsAuthenticated(false);
      resetAuthContextStore();
      return;
    }

    setUser(nextUser);
    setIsAuthenticated(true);
    setAuthError(null);

    const normalizedAccess = createAccessContext(nextUser);
    setAuthContextStore({
      user: nextUser,
      plan: inferPlan(nextUser),
      tenantId: normalizedAccess.tenantId,
      globalRole: normalizedAccess.globalRole,
      tenantRole: normalizedAccess.tenantRole,
      entitlements: normalizedAccess.entitlements,
      lifecycleStatus: normalizedAccess.lifecycleStatus,
      creditsBalance: normalizedAccess.creditsBalance,
    });
  };

  useEffect(() => {
    checkAppState();
  }, []);

  const inferPlan = (inputUser) => {
    const lifecycleStatus = deriveUserLifecycle(inputUser);
    if (lifecycleStatus === USER_LIFECYCLE.SUPER_ADMIN) {
      return 'enterprise';
    }
    if (lifecycleStatus === USER_LIFECYCLE.CUSTOMER_ACTIVE) {
      return 'premium';
    }

    const rawPlan = String(
      inputUser?.plan ||
        inputUser?.workspace_plan ||
        inputUser?.subscription_plan ||
        ''
    ).toLowerCase();
    if (lifecycleStatus !== USER_LIFECYCLE.REGISTERED_NO_PURCHASE && ['premium', 'pro', 'enterprise'].includes(rawPlan)) {
      return 'premium';
    }

    return 'free';
  };

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      if (apiBaseUrl) {
        setAppPublicSettings({ id: null, public_settings: {} });
        await checkUserAuth();
        setIsLoadingPublicSettings(false);
        return;
      }

      if (!CAN_USE_DEV_BASE44_FALLBACK) {
        resetAuthContextStore();
        setAuthError({
          type: 'api_required',
          message: 'Backend API não configurado para autenticação.',
        });
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
        return;
      }

      if (SHOULD_SKIP_BASE44_PUBLIC_SETTINGS) {
        if (import.meta.env.DEV) {
          console.info('[AuthContext] skipping Base44 public-settings bootstrap for local/mock runtime');
        }
        setAppPublicSettings({ id: null, public_settings: {} });
        await checkUserAuth();
        setIsLoadingPublicSettings(false);
        return;
      }

      const normalizedAppId = String(appParams.appId || '').trim().toLowerCase();
      const hasValidAppId = Boolean(
        typeof appParams.appId === 'string' &&
        appParams.appId.trim() &&
        !['null', 'undefined', 'false'].includes(normalizedAppId)
      );

      // Local/dev fallback: when app id is missing, skip Base44 public-settings endpoint
      if (!hasValidAppId) {
        setAppPublicSettings({ id: null, public_settings: {} });
        await checkUserAuth();
        setIsLoadingPublicSettings(false);
        return;
      }
      
      // First, check app public settings (with token if available)
      // This will tell us if auth is required, user not registered, etc.
      const appClient = createAxiosClient({
        baseURL: `/api/apps/public`,
        headers: {
          'X-App-Id': appParams.appId
        },
        token: appParams.token, // Include token if available
        interceptResponses: true
      });
      
      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          resetAuthContextStore();
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        resetAuthContextStore();
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      resetAuthContextStore();
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      console.info('[AuthContext] loading auth session...');

      const devShortcutUser = buildDevShortcutUser();
      if (devShortcutUser) {
        applyAuthenticatedUser(devShortcutUser);
        setIsLoadingAuth(false);
        return;
      }

      if (apiBaseUrl) {
        const token = getApiToken();
        console.info('[AuthContext] token detected:', Boolean(token));
        if (!token) {
          setIsAuthenticated(false);
          setUser(null);
          resetAuthContextStore();
          setIsLoadingAuth(false);
          return;
        }

        const payload = await apiRequest('/auth/me', {
          method: 'GET',
          requireAuth: true,
          runtimeOrigin: apiBaseUrl,
        });
        const currentUser = payload?.user || null;
        if (!currentUser) {
          throw new Error('Sessão inválida.');
        }

        applyAuthenticatedUser(currentUser);
        console.info('[AuthContext] auth session loaded for:', currentUser?.email || currentUser?.id || 'unknown-user');
        setIsLoadingAuth(false);
        return;
      }

      if (!CAN_USE_DEV_BASE44_FALLBACK) {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setUser(null);
        resetAuthContextStore();
        setAuthError({
          type: 'api_required',
          message: 'Backend API não configurado para autenticação.',
        });
        return;
      }

      const currentUser = await base44.auth.me();
      applyAuthenticatedUser(currentUser);
      setIsLoadingAuth(false);
  } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);

      // If user auth fails, it might be an expired token
      const hasApiToken = Boolean(getApiToken());
      const isTransientApiFailure = hasApiToken && isRetryableApiError(error, { method: 'GET' });
      if (isTransientApiFailure && user) {
        setAuthError({
          type: 'backend_unavailable',
          message: getApiErrorMessage(error, {
            apiBaseUrl,
            fallback: 'Backend API temporariamente indisponível.',
          }),
        });
        setIsAuthenticated(true);
        return;
      }

      setIsAuthenticated(false);
      setUser(null);
      resetAuthContextStore();

      const hasSessionToken =
        Boolean(appParams?.token) ||
        hasApiToken ||
        (ENABLE_DEV_LOGIN_SHORTCUTS &&
          typeof window !== 'undefined' &&
          Boolean(window.localStorage.getItem('disc_mock_user_email')));
      if ((error.status === 401 || error.status === 403) && hasSessionToken) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      } else if (isTransientApiFailure) {
        setAuthError({
          type: 'backend_unavailable',
          message: getApiErrorMessage(error, {
            apiBaseUrl,
            fallback: 'Backend API temporariamente indisponível.',
          }),
        });
      } else {
        setAuthError(null);
      }
    }
  };

  const logout = (shouldRedirect = true) => {
    applyAuthenticatedUser(null);

    if (apiBaseUrl) {
      clearApiSession();
      if (shouldRedirect && typeof window !== 'undefined') {
        window.location.href = createPageUrl('Home');
      }
      return;
    }

    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      base44.auth.logout(window.location.href);
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    if (typeof window !== 'undefined') {
      const next = `${window.location.pathname}${window.location.search || ''}`;
      const loginUrl = `${createPageUrl('Login')}?next=${encodeURIComponent(next)}`;
      window.location.href = loginUrl;
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      access,
      logout,
      navigateToLogin,
      checkAppState,
      applyAuthenticatedUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
