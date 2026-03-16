import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, PlusCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/use-toast';
import TableShell from '@/components/ui/TableShell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PERMISSIONS, createAccessContext, hasPermission } from '@/modules/auth/access-control';
import { downgradePlan, openBillingPortal, upgradePlan } from '@/modules/billing';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

export default function CreditCenter() {
  const { access: authAccess } = useAuth();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [isManagingPlan, setIsManagingPlan] = useState(false);

  useEffect(() => {
    let mounted = true;
    const loadUser = async () => {
      if (authAccess?.userId) {
        if (mounted) setUser(authAccess.user || null);
        return;
      }
      try {
        const me = await base44.auth.me();
        if (mounted) setUser(me);
      } catch {
        if (mounted) setUser(null);
      }
    };

    loadUser();
    return () => {
      mounted = false;
    };
  }, [authAccess]);

  const access = useMemo(() => {
    if (authAccess?.userId) return authAccess;
    return createAccessContext(user);
  }, [authAccess, user]);

  const canManageCredits = hasPermission(access, PERMISSIONS.CREDIT_MANAGE);

  const { data: workspace } = useQuery({
    queryKey: ['credits-workspace', access?.tenantId],
    queryFn: async () => {
      if (!access?.tenantId) return null;
      const data = await base44.entities.Workspace.filter({ id: access.tenantId });
      return data[0] || null;
    },
    enabled: Boolean(access?.tenantId),
  });

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['credits-transactions', access?.tenantId],
    queryFn: async () => {
      if (!access?.tenantId) return [];
      return base44.entities.Transaction.filter({ workspace_id: access.tenantId }, '-created_date', 50);
    },
    enabled: Boolean(access?.tenantId),
  });

  const handleOpenPortal = async () => {
    setIsManagingPlan(true);
    try {
      const response = await openBillingPortal();
      if (response?.url) {
        window.location.href = response.url;
        return;
      }
      throw new Error('BILLING_PORTAL_URL_MISSING');
    } catch (error) {
      toast({
        title: 'Falha ao abrir portal',
        description: error?.message || 'Não foi possível abrir o portal de assinatura.',
        variant: 'destructive',
      });
    } finally {
      setIsManagingPlan(false);
    }
  };

  const handleUpgrade = async () => {
    setIsManagingPlan(true);
    try {
      const response = await upgradePlan('business');
      if (response?.url) {
        window.location.href = response.url;
        return;
      }
      toast({
        title: 'Upgrade solicitado',
        description: response?.message || 'Solicitação registrada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Falha no upgrade',
        description: error?.message || 'Não foi possível processar upgrade.',
        variant: 'destructive',
      });
    } finally {
      setIsManagingPlan(false);
    }
  };

  const handleDowngrade = async () => {
    setIsManagingPlan(true);
    try {
      const response = await downgradePlan('personal');
      toast({
        title: 'Downgrade solicitado',
        description: response?.message || 'Solicitação registrada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Falha no downgrade',
        description: error?.message || 'Não foi possível processar downgrade.',
        variant: 'destructive',
      });
    } finally {
      setIsManagingPlan(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <Card className="rounded-2xl shadow-sm border-slate-200">
        <CardHeader>
          <CardTitle>Saldo de Créditos</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">Disponível no workspace atual</p>
            <p className="text-4xl font-bold text-slate-900">{Number(workspace?.credits_balance ?? 0) || 0}</p>
          </div>
          {canManageCredits ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link to={createPageUrl('Pricing')}>
                <Button className="bg-indigo-600 hover:bg-indigo-700">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Comprar créditos
                </Button>
              </Link>
              <Button variant="outline" onClick={() => void handleOpenPortal()} disabled={isManagingPlan}>
                Portal de assinatura
              </Button>
              <Button variant="outline" onClick={() => void handleUpgrade()} disabled={isManagingPlan}>
                Upgrade
              </Button>
              <Button variant="ghost" onClick={() => void handleDowngrade()} disabled={isManagingPlan}>
                Downgrade
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <TableShell title="Histórico de créditos">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, idx) => (
              <div key={idx} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Sem movimentações"
            description="Quando houver compras ou ajustes, o histórico aparecerá aqui."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{formatDate(tx.created_date)}</TableCell>
                  <TableCell>{tx.product || '-'}</TableCell>
                  <TableCell>R$ {((Number(tx.amount) || 0) / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                      {tx.status || '-'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableShell>
    </div>
  );
}
