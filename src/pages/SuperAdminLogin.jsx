import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiBaseUrl, setSuperAdminSession } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { mapAuthRequestError, submitAuthRequest } from '@/modules/auth/authApi';
import { createPageUrl } from '@/utils';

function sanitizeNextPath(nextPath) {
  const raw = String(nextPath || '').trim();
  if (!raw.startsWith('/')) return '/super-admin';
  if (raw.startsWith('//')) return '/super-admin';
  return raw;
}

export default function SuperAdminLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { applyAuthenticatedUser } = useAuth();
  const apiBaseUrl = getApiBaseUrl();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterKey, setMasterKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nextPath = useMemo(
    () => sanitizeNextPath(searchParams.get('next')),
    [searchParams],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!apiBaseUrl) {
      setError('API não configurada para este ambiente.');
      return;
    }

    setLoading(true);
    try {
      const payload = await submitAuthRequest({
        path: '/auth/super-admin-login',
        apiBaseUrl,
        body: {
          email: email.trim().toLowerCase(),
          password,
          masterKey,
        },
      });

      if (!payload?.token || !payload?.user) {
        throw new Error('Resposta sem token de sessão.');
      }

      setSuperAdminSession({
        token: payload.token,
        email: payload?.user?.email || email.trim().toLowerCase(),
      });

      setMasterKey('');
      applyAuthenticatedUser(payload.user);
      navigate(nextPath, { replace: true });
    } catch (submitError) {
      setError(
        mapAuthRequestError(submitError, {
          apiBaseUrl,
          path: '/auth/super-admin-login',
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,.22),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(14,165,233,.16),transparent_38%)]" />
      <div className="relative min-h-screen flex items-center justify-center p-6">
        <Card className="w-full max-w-xl border-slate-800 bg-slate-900/95 text-white shadow-2xl">
          <CardContent className="p-8 md:p-10 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Acesso dedicado SUPER_ADMIN
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">Entrar como Super Admin</h1>
              <p className="text-sm text-slate-300">
                Autenticação exclusiva para administração global da plataforma InsightDISC.
              </p>
            </div>

            {error ? (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="super-admin-email" className="text-slate-200">
                  E-mail
                </Label>
                <Input
                  id="super-admin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@insightdisc.app"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="super-admin-password" className="text-slate-200">
                  Senha
                </Label>
                <Input
                  id="super-admin-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-400"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="super-admin-key" className="text-slate-200">
                  Chave administrativa
                </Label>
                <Input
                  id="super-admin-key"
                  type="password"
                  autoComplete="off"
                  placeholder="SUPER_ADMIN_MASTER_KEY"
                  value={masterKey}
                  onChange={(event) => setMasterKey(event.target.value)}
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-400"
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim() || !password || !masterKey}
                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {loading ? (
                  'Validando acesso...'
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 mr-2" />
                    Entrar como Super Admin
                  </>
                )}
              </Button>
            </form>

            <div className="text-sm text-slate-400 flex flex-wrap gap-3">
              <Link to={createPageUrl('Login')} className="hover:text-slate-200 transition-colors">
                Login público
              </Link>
              <Link to={createPageUrl('Pricing')} className="hover:text-slate-200 transition-colors">
                Ver planos
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
