import React from 'react';
import { useQuery } from '@tanstack/react-query';
import EmptyState from '@/components/ui/EmptyState';
import TableShell from '@/components/ui/TableShell';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminSectionShell from './AdminSectionShell.jsx';
import { fetchAdminOverview, formatDateTime } from './adminApi.js';

export default function AdminUsers() {
  const query = useQuery({
    queryKey: ['admin-v2-users'],
    queryFn: fetchAdminOverview,
  });

  const users = Array.isArray(query.data?.latestUsers) ? query.data.latestUsers : [];

  return (
    <AdminSectionShell
      title="Admin • Usuários"
      subtitle="Gestão de usuários, perfil de acesso e status de operação."
      isLoading={query.isLoading}
      error={query.error?.message || ''}
    >
      <TableShell title="Usuários recentes">
        {!users.length ? (
          <EmptyState
            icon={Users}
            title="Sem usuários recentes"
            description="Não encontramos usuários para o período consultado."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Criado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name || '-'}</TableCell>
                  <TableCell>{item.email || '-'}</TableCell>
                  <TableCell>{item.role || '-'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.plan || 'personal'}</Badge>
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
