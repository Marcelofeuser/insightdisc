import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest, getApiBaseUrl, getApiErrorMessage, getApiToken } from '@/lib/apiClient';
import { GLOBAL_ROLES, hasAnyGlobalRole } from '@/modules/auth/access-control';
import { Card, CardContent } from '@/components/ui/card';

function SuperAdminDenied({ message = 'Acesso restrito à administração global.' }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-sm">
        <CardContent className="p-8 space-y-4">
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Acesso restrito</h1>
          <p className="text-sm text-slate-600">{message}</p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SuperAdminRoute({ children }) {
  const location = useLocation();
  const { access, user, isLoadingAuth, isLoadingPublicSettings } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const apiToken = getApiToken();
  const [validation, setValidation] = useState({
    state: 'idle',
    message: '',
  });

  const isSuperAdminRole = useMemo(
    () => hasAnyGlobalRole(access, [GLOBAL_ROLES.SUPER_ADMIN]),
    [access],
  );
  const isDevMockSuperAdmin = useMemo(
    () =>
      import.meta.env.DEV &&
      isSuperAdminRole &&
      !apiToken &&
      String(user?.email || '').trim().toLowerCase() === 'superadmin@example.com',
    [apiToken, isSuperAdminRole, user?.email],
  );

  useEffect(() => {
    let mounted = true;

    async function validateSuperAdmin() {
      if (!access?.userId) {
        if (mounted) setValidation({ state: 'unauthenticated', message: '' });
        return;
      }

      if (isDevMockSuperAdmin) {
        if (mounted) setValidation({ state: 'ready', message: '' });
        return;
      }

      if (!apiBaseUrl) {
        if (mounted) {
          setValidation({
            state: 'forbidden',
            message: 'Área super admin disponível apenas com backend API configurado.',
          });
        }
        return;
      }

      if (!isSuperAdminRole) {
        if (mounted) {
          setValidation({ state: 'forbidden', message: 'Apenas SUPER_ADMIN pode acessar esta área.' });
        }
        return;
      }

      if (mounted) setValidation({ state: 'checking', message: '' });

      try {
        await apiRequest('/auth/super-admin/me', {
          method: 'GET',
          requireAuth: true,
          timeoutMs: 6_000,
          retry: 1,
          retryDelayMs: 250,
        });
        if (mounted) setValidation({ state: 'ready', message: '' });
      } catch (error) {
        if (!mounted) return;
        if (error?.status === 401) {
          setValidation({ state: 'unauthenticated', message: '' });
          return;
        }
        if (error?.status === 403) {
          setValidation({
            state: 'forbidden',
            message: 'Sessão sem escopo de super admin. Faça login dedicado novamente.',
          });
          return;
        }
        setValidation({
          state: 'error',
          message: getApiErrorMessage(error, {
            apiBaseUrl,
            fallback: 'Falha ao validar acesso super admin.',
          }),
        });
      }
    }

    validateSuperAdmin();
    return () => {
      mounted = false;
    };
  }, [access?.userId, apiBaseUrl, isDevMockSuperAdmin, isSuperAdminRole]);

  if (isLoadingPublicSettings || isLoadingAuth || validation.state === 'checking' || validation.state === 'idle') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (validation.state === 'unauthenticated') {
    const next = `${location.pathname}${location.search || ''}`;
    return <Navigate replace to={`/super-admin-login?next=${encodeURIComponent(next)}`} />;
  }

  if (validation.state === 'forbidden' || validation.state === 'error') {
    return <SuperAdminDenied message={validation.message} />;
  }

  return children;
}
