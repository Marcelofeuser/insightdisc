import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest, getApiBaseUrl, setApiSession } from '@/lib/apiClient';
import { createPageUrl } from '@/utils';

function normalizeError(error) {
  const message = error?.payload?.error || error?.message || 'Falha ao criar conta.';
  if (message.toLowerCase().includes('já cadastrado')) {
    return 'Este e-mail já está em uso. Tente entrar na conta existente.';
  }
  return message;
}

export default function Signup() {
  const navigate = useNavigate();
  const { checkAppState } = useAuth();
  const apiBaseUrl = getApiBaseUrl();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async (event) => {
    event.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (trimmedName.length < 2) {
      setError('Informe seu nome completo.');
      return;
    }
    if (password.length < 8) {
      setError('A senha precisa ter no mínimo 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setLoading(true);
    try {
      if (apiBaseUrl) {
        const payload = await apiRequest('/auth/register', {
          method: 'POST',
          body: {
            name: trimmedName,
            email: normalizedEmail,
            password,
          },
        });

        if (!payload?.token) {
          throw new Error('Cadastro concluído sem token de sessão.');
        }

        setApiSession({
          token: payload.token,
          email: payload?.user?.email || normalizedEmail,
        });
      } else if (base44?.__isMock) {
        const createdUser = await base44.entities.User.create({
          email: normalizedEmail,
          full_name: trimmedName,
          role: 'professional',
          global_role: null,
          tenant_role: 'TENANT_ADMIN',
          entitlements: ['report.pro', 'report.export.pdf'],
          plan: 'free',
        });

        const workspace = await base44.entities.Workspace.create({
          name: `${trimmedName} Workspace`,
          company_name: trimmedName,
          plan: 'free',
          credits_balance: 0,
        });

        await base44.entities.User.update(createdUser.id, {
          tenant_id: workspace.id,
          active_workspace_id: workspace.id,
        });

        await base44.auth.login({ email: normalizedEmail });
      } else {
        throw new Error('Cadastro indisponível sem backend configurado.');
      }

      await checkAppState();
      navigate(createPageUrl('Pricing'), { replace: true });
    } catch (signupError) {
      setError(normalizeError(signupError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-sm">
        <CardContent className="p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">Criar conta</h1>
            <p className="text-sm text-slate-600">
              Cadastre-se para comprar créditos e desbloquear recursos premium.
            </p>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSignup}>
            <div className="space-y-2">
              <Label htmlFor="signup-name">Nome</Label>
              <Input
                id="signup-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">E-mail</Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Senha</Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-confirm-password">Confirmar senha</Label>
              <Input
                id="signup-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repita a senha"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !name || !email || !password || !confirmPassword}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>

          <div className="text-sm text-slate-600">
            Já possui conta?{' '}
            <Link to={createPageUrl('Login')} className="text-indigo-600 hover:text-indigo-700">
              Entrar
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
