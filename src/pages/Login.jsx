import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest, getApiBaseUrl, setApiSession } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { deriveUserLifecycle, USER_LIFECYCLE } from '@/modules/auth/access-control';

const DEV_MOCK_ACCOUNTS = Object.freeze([
  { email: 'admin@example.com', label: 'Entrar como Admin' },
  { email: 'pro@example.com', label: 'Entrar como Profissional' },
  { email: 'user@example.com', label: 'Entrar como Usuário' },
]);

const ENABLE_DEV_LOGIN_SHORTCUTS =
  String(import.meta.env.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || '').toLowerCase() === 'true';

function sanitizeNextPath(nextPath) {
  const raw = String(nextPath || '').trim();
  if (!raw.startsWith('/')) return '';
  if (raw.startsWith('//')) return '';
  if (raw === createPageUrl('Login') || raw === createPageUrl('Signup')) return '';
  return raw;
}

function resolvePostLoginPath(user, nextPath = '') {
  const lifecycleStatus = deriveUserLifecycle(user || {});
  if (lifecycleStatus === USER_LIFECYCLE.SUPER_ADMIN) {
    return '/super-admin';
  }

  if (lifecycleStatus !== USER_LIFECYCLE.CUSTOMER_ACTIVE) {
    return `${createPageUrl('Pricing')}?unlock=1`;
  }

  return nextPath || createPageUrl('Dashboard');
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAppState } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const isDev = import.meta.env.DEV && String(import.meta.env.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || "").toLowerCase() === "true";
  const runtimeMode = String(import.meta.env.MODE || '').trim().toLowerCase();
  const isE2ERuntime = runtimeMode.startsWith('e2e');
  const canUseMockAuth = isDev && ENABLE_DEV_LOGIN_SHORTCUTS;
  const canShowDevMockShortcuts = isDev && String(import.meta.env.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || "").toLowerCase() === "true";

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nextPath = useMemo(() => sanitizeNextPath(searchParams.get('next')), [searchParams]);

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
        const payload = await apiRequest('/auth/login', {
          method: 'POST',
          body: {
            email: email.trim().toLowerCase(),
            password,
          },
        });

        if (!payload?.token) {
          throw new Error('Falha ao iniciar sessão.');
        }

        setApiSession({
          token: payload.token,
          email: payload?.user?.email || email.trim().toLowerCase(),
        });
        resolvedUser = payload?.user || null;
      } else {
        throw new Error(
          'Autenticação indisponível: backend não configurado. Defina VITE_API_URL/BACKEND_API_URL.'
        );
      }

      await checkAppState();
      const destination = resolvePostLoginPath(resolvedUser, nextPath);
      navigate(destination, { replace: true });
    } catch (loginError) {
      setError(loginError?.payload?.error || loginError?.message || 'Falha ao entrar.');
    } finally {
      setLoading(false);
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
              Acesse sua conta para usar os recursos premium e comprar créditos.
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
              disabled={loading || !email.trim() || !password}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>

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
