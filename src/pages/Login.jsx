import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest, getApiBaseUrl, setApiSession } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';

const DEV_MOCK_ACCOUNTS = Object.freeze([
  { email: 'admin@example.com', label: 'Entrar como Admin' },
  { email: 'pro@example.com', label: 'Entrar como Profissional' },
  { email: 'user@example.com', label: 'Entrar como Usuário' },
]);

const ENABLE_DEV_LOGIN_SHORTCUTS =
  String(import.meta.env.VITE_ENABLE_DEV_LOGIN_SHORTCUTS || '').toLowerCase() === 'true';

function sanitizeNextPath(nextPath) {
  const raw = String(nextPath || '').trim();
  if (!raw.startsWith('/')) return createPageUrl('Dashboard');
  if (raw.startsWith('//')) return createPageUrl('Dashboard');
  return raw;
}

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAppState } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const isDev = import.meta.env.DEV;
  const canShowDevMockShortcuts =
    isDev && ENABLE_DEV_LOGIN_SHORTCUTS && (!apiBaseUrl || Boolean(base44?.__isMock));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nextPath = useMemo(
    () => sanitizeNextPath(searchParams.get('next')),
    [searchParams]
  );

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
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
      } else if (typeof base44.auth.login === 'function') {
        await base44.auth.login({
          email: email.trim().toLowerCase(),
          password,
        });
      } else {
        throw new Error('Login não suportado no ambiente atual.');
      }

      await checkAppState();
      navigate(nextPath, { replace: true });
    } catch (loginError) {
      setError(loginError?.payload?.error || loginError?.message || 'Falha ao entrar.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (mockEmail) => {
    setLoading(true);
    setError('');
    try {
      await base44.auth.login({ email: mockEmail });
      await checkAppState();
      navigate(nextPath, { replace: true });
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
