import React from 'react';
import { useQuery } from '@tanstack/react-query';
import EmptyState from '@/components/ui/EmptyState';
import TableShell from '@/components/ui/TableShell';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminSectionShell from './AdminSectionShell.jsx';
import { fetchAdminOverview, formatDateTime } from './adminApi.js';

export default function AdminCompanies() {
  const query = useQuery({
    queryKey: ['admin-v2-companies'],
    queryFn: fetchAdminOverview,
  });

  const workspaces = Array.isArray(query.data?.latestWorkspaces)
    ? query.data.latestWorkspaces
    : [];

  return (
    <AdminSectionShell
      title="Admin • Empresas"
      subtitle="Controle de workspaces, plano ativo e volume de consumo."
      isLoading={query.isLoading}
      error={query.error?.message || ''}
    >
      <TableShell title="Empresas recentes">
        {!workspaces.length ? (
          <EmptyState
            icon={Building2}
            title="Sem empresas recentes"
            description="Não encontramos empresas para o período consultado."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Créditos</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workspaces.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name || '-'}</TableCell>
                  <TableCell>{item.plan || 'personal'}</TableCell>
                  <TableCell>
                    <Badge variant={item.subscriptionStatus === 'active' ? 'default' : 'secondary'}>
                      {item.subscriptionStatus || 'trial'}
                    </Badge>
                  </TableCell>
                  <TableCell>{Number(item.credits || item.creditsBalance || 0)}</TableCell>
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
