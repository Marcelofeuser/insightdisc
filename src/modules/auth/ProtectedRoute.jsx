import React from 'react';
import { Navigate, Link } from 'react-router-dom';
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
  if (!policy) return true;
  if (policy.isPublic) return true;

  if (policy.requiresAuth && !isAuthenticatedAccess(access)) {
    return false;
  }

  const globalRoles = policy.anyGlobalRoles || [];
  const tenantRoles = policy.anyTenantRoles || [];
  const hasRoleConstraint = globalRoles.length > 0 || tenantRoles.length > 0;

  if (hasRoleConstraint) {
    const allowedByGlobalRole = hasAnyGlobalRole(access, globalRoles);
    const allowedByTenantRole = hasAnyTenantRole(access, tenantRoles);
    if (!allowedByGlobalRole && !allowedByTenantRole) {
      return false;
    }
  }

  const requiredPermissions = policy.permissions || [];
  return requiredPermissions.every((permission) => hasPermission(access, permission));
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

  if (policy?.isPublic) {
    return children;
  }

  if (!isAuthenticatedAccess(access)) {
    return <Navigate to={createPageUrl('Login')} replace />;
  }

  if (!evaluatePolicy(access, policy)) {
    return <AccessDenied pageName={pageName} />;
  }

  return children;
}
