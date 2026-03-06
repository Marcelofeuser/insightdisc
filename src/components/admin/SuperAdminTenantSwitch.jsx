import React, { useEffect, useMemo, useState } from 'react';
import { Building2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { GLOBAL_ROLES } from '@/modules/auth/roles';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const DEFAULT_TENANTS = ['workspace-1', 'workspace-2', 'tenant-individual-user-3'];

export default function SuperAdminTenantSwitch({ className = '' }) {
  const { access, checkAppState } = useAuth();
  const { toast } = useToast();
  const [selected, setSelected] = useState(access?.tenantId || DEFAULT_TENANTS[0]);
  const [isApplying, setIsApplying] = useState(false);

  const tenantOptions = useMemo(() => {
    const options = new Set(DEFAULT_TENANTS);
    if (access?.tenantId) {
      options.add(access.tenantId);
    }
    return Array.from(options);
  }, [access?.tenantId]);

  useEffect(() => {
    if (access?.tenantId) {
      setSelected(access.tenantId);
    }
  }, [access?.tenantId]);

  if (access?.globalRole !== GLOBAL_ROLES.SUPER_ADMIN) {
    return null;
  }

  const applyTenant = async () => {
    if (typeof base44?.auth?.setActiveTenant !== 'function') {
      toast({
        title: 'Não disponível',
        description: 'setActiveTenant não está disponível no provider atual.',
        variant: 'destructive',
      });
      return;
    }

    if (selected === access?.tenantId) {
      return;
    }

    setIsApplying(true);
    try {
      await base44.auth.setActiveTenant(selected);
      await checkAppState();
      toast({
        title: 'Tenant alterado',
        description: `Tenant ativo: ${selected}`,
      });
    } catch (error) {
      toast({
        title: 'Falha ao trocar tenant',
        description: error?.message || 'Erro desconhecido.',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-3 flex flex-col sm:flex-row sm:items-center gap-3 ${className}`}>
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <Building2 className="w-4 h-4" />
        <span>Impersonar tenant (mock)</span>
      </div>
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
        >
          {tenantOptions.map((tenantId) => (
            <option key={tenantId} value={tenantId}>
              {tenantId}
            </option>
          ))}
        </select>
        <Button onClick={applyTenant} disabled={isApplying} size="sm">
          {isApplying ? 'Aplicando...' : 'Aplicar'}
        </Button>
      </div>
    </div>
  );
}
