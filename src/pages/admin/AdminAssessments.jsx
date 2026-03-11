import React from 'react';
import { useQuery } from '@tanstack/react-query';
import EmptyState from '@/components/ui/EmptyState';
import TableShell from '@/components/ui/TableShell';
import { Badge } from '@/components/ui/badge';
import { ClipboardList } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AdminSectionShell from './AdminSectionShell.jsx';
import { fetchAdminOverview, formatDateTime } from './adminApi.js';

export default function AdminAssessments() {
  const query = useQuery({
    queryKey: ['admin-v2-assessments'],
    queryFn: fetchAdminOverview,
  });

  const assessments = Array.isArray(query.data?.latestAssessments)
    ? query.data.latestAssessments
    : [];

  return (
    <AdminSectionShell
      title="Admin • Avaliações"
      subtitle="Acompanhamento de execução, status e relatórios associados."
      isLoading={query.isLoading}
      error={query.error?.message || ''}
    >
      <TableShell title="Avaliações recentes">
        {!assessments.length ? (
          <EmptyState
            icon={ClipboardList}
            title="Sem avaliações recentes"
            description="Não encontramos avaliações no período consultado."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Pessoa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Concluída em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.id || '-'}</TableCell>
                  <TableCell>{item.respondentName || item.candidateName || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={item.status === 'completed' ? 'default' : 'secondary'}>
                      {item.status || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.profileCode || item.profile || '-'}</TableCell>
                  <TableCell>{formatDateTime(item.completedAt || item.completed_at || item.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableShell>
    </AdminSectionShell>
  );
}
