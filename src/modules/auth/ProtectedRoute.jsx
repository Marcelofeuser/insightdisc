import React from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import {
  hasAnyGlobalRole,
  hasAnyTenantRole,
  hasPermission,
  isAuthenticatedAccess,
} from '@/modules/auth/access-control';

function evaluatePolicy(access, policy) {
  if (!policy) return { allowed: true };
  if (policy.isPublic) return { allowed: true };

  if (policy.requiresAuth && !isAuthenticatedAccess(access)) {
    return { allowed: false, reason: 'auth' };
  }

  const allowedLifecycle = policy.allowedLifecycle || [];
  if (allowedLifecycle.length > 0) {
    if (!allowedLifecycle.includes(access?.lifecycleStatus)) {
      return { allowed: false, reason: 'lifecycle' };
    }
  }

  const globalRoles = policy.anyGlobalRoles || [];
  const tenantRoles = policy.anyTenantRoles || [];
  const hasRoleConstraint = globalRoles.length > 0 || tenantRoles.length > 0;

  if (hasRoleConstraint) {
    const allowedByGlobalRole = hasAnyGlobalRole(access, globalRoles);
    const allowedByTenantRole = hasAnyTenantRole(access, tenantRoles);
    if (!allowedByGlobalRole && !allowedByTenantRole) {
      return { allowed: false, reason: 'role' };
    }
  }

  const requiredPermissions = policy.permissions || [];
  const permissionOk = requiredPermissions.every((permission) => hasPermission(access, permission));
  if (!permissionOk) {
    return { allowed: false, reason: 'permission' };
  }

  return { allowed: true };
}

function AccessDenied({ pageName }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-sm">
        <CardContent className="p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Acesso negado</h2>
          <p className="text-sm text-slate-600">
            Sua conta nao tem permissao para acessar <strong>{pageName}</strong>.
          </p>
          <div className="pt-2">
            <Link to={createPageUrl('Dashboard')}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">Voltar ao dashboard</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProtectedRoute({ children, policy, pageName }) {
  const { access } = useAuth();
  const location = useLocation();

  if (policy?.isPublic) {
    return children;
  }

  if (!isAuthenticatedAccess(access)) {
    const next = `${location.pathname}${location.search || ''}`;
    return <Navigate to={`${createPageUrl('Login')}?next=${encodeURIComponent(next)}`} replace />;
  }

  const evaluation = evaluatePolicy(access, policy);
  if (!evaluation.allowed) {
    if (evaluation.reason === 'lifecycle') {
      return <Navigate to={policy?.redirectTo || '/Pricing?unlock=1'} replace />;
    }

    return <AccessDenied pageName={pageName} />;
  }

  return children;
}
