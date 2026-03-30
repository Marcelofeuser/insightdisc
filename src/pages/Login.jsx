import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiBaseUrl, setApiSession } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { mapAuthRequestError, submitAuthRequest } from '@/modules/auth/authApi';
import { deriveUserLifecycle, USER_LIFECYCLE } from '@/modules/auth/access-control';
import { sanitizeNextPath } from '@/modules/auth/next-path';
import { isSupabaseConfigured, supabase } from '@/lib/supabaseClient';

const DEV_MOCK_ACCOUNTS = Object.freeze([
  { email: 'admin@example.com', label: 'Entrar como Admin' },
  { email: 'pro@example.com', label: 'Entrar como Profissional' },
  { email: 'user@example.com', label: 'Entrar como Usuário' },
]);

const ENABLE_DEV_LOGIN_SHORTCUTS =
  String(import.meta.env.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || '').toLowerCase() === 'true';

function resolvePostLoginPath(user, nextPath = '') {
  const normalizedNextPath = sanitizeNextPath(nextPath, '');
  const isCheckoutNext = normalizedNextPath.startsWith('/checkout');
  const lifecycleStatus = deriveUserLifecycle(user || {});
  if (lifecycleStatus === USER_LIFECYCLE.SUPER_ADMIN) {
    return '/super-admin';
  }

  if (isCheckoutNext) {
    return normalizedNextPath;
  }

  if (lifecycleStatus !== USER_LIFECYCLE.CUSTOMER_ACTIVE) {
    return `${createPageUrl('Pricing')}?unlock=1`;
  }

  return normalizedNextPath || createPageUrl('Dashboard');
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { applyAuthenticatedUser, checkAppState } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const isDev = import.meta.env.DEV && String(import.meta.env.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || "").toLowerCase() === "true";
  const runtimeMode = String(import.meta.env.MODE || '').trim().toLowerCase();
  const isE2ERuntime = runtimeMode.startsWith('e2e');
  const canUseMockAuth = isDev && ENABLE_DEV_LOGIN_SHORTCUTS;
  const canShowDevMockShortcuts = isDev && String(import.meta.env.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || "").toLowerCase() === "true";

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState('');
  const [error, setError] = useState('');

  const nextPath = useMemo(
    () => sanitizeNextPath(searchParams.get('next'), ''),
    [searchParams]
  );

  useEffect(() => {
    if (!isDev) return;
      console.info('[Login] dev shortcut flags', {
        isDev,
        runtimeMode,
        enableFlagRaw: import.meta.env.VITE_ENABLE_DEV_LOGIN_SHORTCUTS,
        canUseMockAuth,
        canShowDevMockShortcuts,
        hasMockClient: Boolean(base44?.__isMock),
        apiBaseUrl,
      });
  }, [isDev, runtimeMode, canUseMockAuth, canShowDevMockShortcuts, apiBaseUrl]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      let resolvedUser = null;
      if (apiBaseUrl) {
        const payload = await submitAuthRequest({
          path: '/auth/login',
          apiBaseUrl,
          body: {
            email: email.trim().toLowerCase(),
            password,
          },
        });

        if (!payload?.token || !payload?.user) {
          throw new Error('Falha ao iniciar sessão.');
        }

        setApiSession({
          token: payload.token,
          email: payload?.user?.email || email.trim().toLowerCase(),
        });
        resolvedUser = payload?.user || null;
        applyAuthenticatedUser(resolvedUser);
      } else {
        throw new Error('API_BASE_URL_NOT_CONFIGURED');
      }

      const destination = resolvePostLoginPath(resolvedUser, nextPath);
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(
        mapAuthRequestError(loginError, {
          apiBaseUrl,
          path: '/auth/login',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider) => {
    setError('');

    if (!isSupabaseConfigured || !supabase) {
      setError('Login social não configurado neste ambiente.');
      return;
    }

    setOauthLoadingProvider(provider);

    try {
      const callbackUrl = new URL('/auth/callback', window.location.origin);
      if (nextPath) {
        callbackUrl.searchParams.set('next', nextPath);
      }
      callbackUrl.searchParams.set('provider', provider);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (oauthError) {
      setOauthLoadingProvider('');
      setError(oauthError?.message || 'Não foi possível iniciar login social.');
    }
  };

  const quickLogin = async (mockEmail) => {
    if (!canUseMockAuth) {
      setError('Atalho mock disponível apenas em desenvolvimento local.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      let mockUser = null;
      if (Boolean(base44?.__isMock) && typeof base44?.auth?.login === 'function') {
        mockUser = await base44.auth.login({ email: mockEmail });
      } else if (typeof window !== 'undefined') {
        const normalizedEmail = String(mockEmail || '').trim().toLowerCase();
        window.localStorage.setItem('disc_mock_user_email', normalizedEmail);
        window.localStorage.setItem('disc_mock_active_tenant', 'workspace-1');

        ['insightdisc_token', 'insightdisc_api_token', 'insight_api_token', 'server_api_token'].forEach((key) => {
          window.localStorage.removeItem(key);
          window.sessionStorage.removeItem(key);
        });

        if (normalizedEmail === 'user@example.com') {
          mockUser = {
            id: 'dev-user',
            email: normalizedEmail,
            role: 'user',
            lifecycle_status: 'registered_no_purchase',
            plan: 'free',
          };
        } else if (normalizedEmail === 'superadmin@example.com') {
          mockUser = {
            id: 'dev-super-admin',
            email: normalizedEmail,
            role: 'SUPER_ADMIN',
            global_role: 'SUPER_ADMIN',
            lifecycle_status: 'super_admin',
            plan: 'enterprise',
          };
        } else {
          mockUser = {
            id: 'dev-pro',
            email: normalizedEmail,
            role: 'professional',
            lifecycle_status: 'customer_active',
            plan: 'premium',
            has_paid_purchase: true,
            credits: 100,
          };
        }
      }

      await checkAppState();
      navigate(resolvePostLoginPath(mockUser, nextPath), { replace: true });
    } catch (loginError) {
      setError(loginError?.message || 'Falha no atalho de login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-sm">
        <CardContent className="p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">Entrar</h1>
            <p className="text-slate-600 text-sm">
              Entrar em 1 clique com Google ou Apple. E-mail e senha continuam disponíveis.
            </p>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div className="space-y-2">
              <Label htmlFor="login-email">E-mail</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="voce@empresa.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Senha</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || Boolean(oauthLoadingProvider) || !email.trim() || !password}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

          <div className="space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase tracking-wide">
                <span className="bg-white px-2 text-slate-500">entrar em 1 clique</span>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                disabled={loading || Boolean(oauthLoadingProvider)}
                onClick={() => handleSocialLogin('google')}
                className="h-11"
              >
                {oauthLoadingProvider === 'google' ? 'Conectando...' : 'Continuar com Google'}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={loading || Boolean(oauthLoadingProvider)}
                onClick={() => handleSocialLogin('apple')}
                className="h-11"
              >
                {oauthLoadingProvider === 'apple' ? 'Conectando...' : 'Continuar com Apple'}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <Link to={createPageUrl('Signup')} className="text-indigo-600 hover:text-indigo-700">
              Criar conta
            </Link>
            <Link
              to={createPageUrl('ForgotPassword')}
              className="text-indigo-600 hover:text-indigo-700"
            >
              Esqueci minha senha
            </Link>
            <Link to={createPageUrl('Pricing')} className="text-slate-600 hover:text-slate-800">
              Ver planos
            </Link>
          </div>

          {canShowDevMockShortcuts ? (
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                Atalhos de desenvolvimento
              </p>
              <div className="grid gap-2">
                {DEV_MOCK_ACCOUNTS.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    variant="outline"
                    onClick={() => quickLogin(account.email)}
                    disabled={loading}
                  >
                    {account.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
