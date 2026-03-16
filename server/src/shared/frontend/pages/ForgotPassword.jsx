import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { createPageUrl } from '@/utils';

export default function ForgotPassword() {
  const apiBaseUrl = getApiBaseUrl();
  const sessionToken = getApiToken();
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleReset = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!apiBaseUrl) {
      setError('Recuperação de senha exige backend configurado (VITE_API_URL).');
      return;
    }
    if (!sessionToken) {
      setError('Por segurança, faça login antes de alterar sua senha.');
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/auth/reset-password', {
        method: 'POST',
        requireAuth: true,
        body: {
          email: email.trim().toLowerCase(),
          currentPassword,
          newPassword: password,
        },
      });

      setSuccess('Senha atualizada com sucesso. Você já pode entrar com a nova senha.');
    } catch (resetError) {
      setError(resetError?.payload?.error || resetError?.message || 'Falha ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-sm">
        <CardContent className="p-8 space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold text-slate-900">Recuperar senha</h1>
            <p className="text-sm text-slate-600">
              Informe seu e-mail e defina uma nova senha para sua conta.
            </p>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleReset}>
            <div className="space-y-2">
              <Label htmlFor="forgot-email">E-mail</Label>
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@empresa.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forgot-password">Nova senha</Label>
              <Input
                id="forgot-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Mínimo 8 caracteres"
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="forgot-current-password">Senha atual</Label>
              <Input
                id="forgot-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Confirme sua senha atual"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !email || !currentPassword || password.length < 8}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {loading ? 'Atualizando senha...' : 'Atualizar senha'}
            </Button>
          </form>

          <div className="text-sm text-slate-600">
            <Link to={createPageUrl('Login')} className="text-indigo-600 hover:text-indigo-700">
              Voltar para login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
