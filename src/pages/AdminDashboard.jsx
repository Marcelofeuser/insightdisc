import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, DollarSign, FileText, ShieldCheck, UserCog } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import StatsGrid from '@/components/ui/StatsGrid';
import TableShell from '@/components/ui/TableShell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import SuperAdminTenantSwitch from '@/components/admin/SuperAdminTenantSwitch';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

export default function AdminDashboard() {
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['admin-users-v2'],
    queryFn: () => base44.entities.User.list('-created_date', 200),
  });

  const { data: assessments = [], isLoading: loadingAssessments } = useQuery({
    queryKey: ['admin-assessments-v2'],
    queryFn: () => base44.entities.Assessment.list('-created_date', 500),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['admin-transactions-v2'],
    queryFn: () => base44.entities.Transaction.list('-created_date', 200),
  });

  const { data: workspaces = [], isLoading: loadingWorkspaces } = useQuery({
    queryKey: ['admin-workspaces-v2'],
    queryFn: () => base44.entities.Workspace.list('-created_date', 100),
  });

  const stats = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const assessmentsMonth = assessments.filter((assessment) => {
      const raw = assessment?.created_date || assessment?.completed_at;
      if (!raw) return false;
      const date = new Date(raw);
      if (Number.isNaN(date.getTime())) return false;
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;

    const estimatedRevenue = transactions
      .filter((transaction) => transaction?.status === 'completed')
      .reduce((sum, transaction) => sum + (Number(transaction?.amount) || 0), 0) / 100;

    return {
      activeTenants: workspaces.filter((workspace) => workspace?.subscription_status === 'active').length,
      totalUsers: users.length,
      assessmentsMonth,
      estimatedRevenue,
    };
  }, [assessments, transactions, users, workspaces]);

  const statItems = [
    {
      title: 'Tenants ativos',
      value: stats.activeTenants,
      icon: Building2,
      iconClassName: 'bg-indigo-100',
    },
    {
      title: 'Usuários',
      value: stats.totalUsers,
      icon: UserCog,
      iconClassName: 'bg-violet-100',
    },
    {
      title: 'Avaliações no mês',
      value: stats.assessmentsMonth,
      icon: FileText,
      iconClassName: 'bg-amber-100',
    },
    {
      title: 'Receita estimada',
      value: `R$ ${stats.estimatedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      iconClassName: 'bg-emerald-100',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <section className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">Console da Plataforma</h2>
        <p className="text-sm text-slate-500">Visão operacional de tenants, usuários e consumo</p>
      </section>

      <SuperAdminTenantSwitch />

      <StatsGrid items={statItems} />

      <TableShell
        title="Tenants"
        controls={
          <Button variant="outline" disabled>
            <ShieldCheck className="w-4 h-4 mr-2" />
            Impersonar tenant (em breve)
          </Button>
        }
      >
        {loadingWorkspaces || loadingUsers || loadingAssessments ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, idx) => (
              <div key={idx} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Créditos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaces.map((workspace) => (
                <TableRow key={workspace.id}>
                  <TableCell className="font-medium">{workspace?.name || '-'}</TableCell>
                  <TableCell>{workspace?.plan || 'free'}</TableCell>
                  <TableCell>{Number(workspace?.credits_balance ?? 0) || 0}</TableCell>
                  <TableCell>
                    <Badge variant={workspace?.subscription_status === 'active' ? 'default' : 'secondary'}>
                      {workspace?.subscription_status || 'unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(workspace?.created_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableShell>
    </div>
  );
}
