import React from 'react';
import { useQuery } from '@tanstack/react-query';
import EmptyState from '@/components/ui/EmptyState';
import TableShell from '@/components/ui/TableShell';
import { Badge } from '@/components/ui/badge';
import { CreditCard } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminSectionShell from './AdminSectionShell.jsx';
import { fetchAdminOverview, formatCurrency, formatDateTime } from './adminApi.js';

function resolveStatusVariant(status = '') {
  const key = String(status || '').toLowerCase();
  if (key === 'paid' || key === 'completed' || key === 'succeeded') return 'default';
  if (key === 'pending') return 'secondary';
  return 'outline';
}

export default function AdminBilling() {
  const query = useQuery({
    queryKey: ['admin-v2-billing'],
    queryFn: fetchAdminOverview,
  });

  const payments = Array.isArray(query.data?.latestPayments)
    ? query.data.latestPayments
    : [];

  return (
    <AdminSectionShell
      title="Admin • Billing"
      subtitle="Visão de pagamentos, assinatura, receita e crédito consumido."
      isLoading={query.isLoading}
      error={query.error?.message || ''}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Pagamentos</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{query.data?.paymentsTotal || 0}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Pagamentos aprovados</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{query.data?.paymentsApproved || 0}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Receita total</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{formatCurrency(query.data?.revenueTotal || 0)}</p>
        </article>
      </div>

      <TableShell title="Transações recentes">
        {!payments.length ? (
          <EmptyState
            icon={CreditCard}
            title="Sem transações recentes"
            description="Ainda não há transações registradas para o período atual."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.id || '-'}</TableCell>
                  <TableCell>{item.product || item.plan || '-'}</TableCell>
                  <TableCell>{formatCurrency(item.amount || 0)}</TableCell>
                  <TableCell>
                    <Badge variant={resolveStatusVariant(item.status)}>
                      {item.status || 'unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDateTime(item.createdAt || item.created_date)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableShell>
    </AdminSectionShell>
  );
}
