import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/ui/EmptyState';
import TableShell from '@/components/ui/TableShell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PERMISSIONS, createAccessContext, hasPermission } from '@/modules/auth/access-control';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function getRespondent(assessment) {
  return (
    assessment?.respondent_name ||
    assessment?.lead_name ||
    assessment?.candidate_name ||
    assessment?.user_name ||
    assessment?.lead_email ||
    assessment?.user_email ||
    assessment?.email ||
    assessment?.user_id ||
    '-'
  );
}

export default function MyAssessments() {
  const navigate = useNavigate();
  const { access: authAccess } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

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

  const canTenantView = hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_TENANT);
  const canSelfView = hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_SELF);

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['my-assessments', access?.tenantId, access?.userId, access?.email, canTenantView, canSelfView],
    queryFn: async () => {
      if (apiBaseUrl && getApiToken()) {
        const payload = await apiRequest('/candidate/me/reports', {
          method: 'GET',
          requireAuth: true,
        });
        const reports = Array.isArray(payload?.reports) ? payload.reports : [];

        return reports.map((item, index) => ({
          id:
            item?.assessmentId ||
            item?.reportId ||
            `${item?.candidateEmail || 'report'}-${index}`,
          assessmentId: item?.assessmentId || '',
          completed_at: item?.completedAt || item?.createdAt || null,
          created_date: item?.createdAt || null,
          respondent_name: item?.candidateName || '',
          lead_name: item?.candidateName || '',
          lead_email: item?.candidateEmail || '',
          user_email: item?.candidateEmail || '',
          status: 'completed',
          type: 'premium',
          pdf_url: item?.pdfUrl || '',
        }));
      }

      if (canTenantView && access?.tenantId) {
        return base44.entities.Assessment.filter({ workspace_id: access.tenantId }, '-created_date', 200);
      }

      if (canSelfView) {
        const resultByUserId = access?.userId
          ? await base44.entities.Assessment.filter({ user_id: access.userId }, '-created_date', 200)
          : [];
        const resultByEmail = access?.email
          ? await base44.entities.Assessment.filter({ user_id: access.email }, '-created_date', 200)
          : [];
        const resultByRespondentEmail = access?.email
          ? await base44.entities.Assessment.filter({ respondent_email: access.email }, '-created_date', 200)
          : [];
        const resultByLeadEmail = access?.email
          ? await base44.entities.Assessment.filter({ lead_email: access.email }, '-created_date', 200)
          : [];

        const merged = [
          ...resultByUserId,
          ...resultByEmail,
          ...resultByRespondentEmail,
          ...resultByLeadEmail,
        ];
        const seen = new Set();
        return merged.filter((item) => {
          if (!item?.id || seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
      }

      return [];
    },
    enabled: Boolean(access?.userId || access?.email),
  });

  const filteredAssessments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return assessments.filter((assessment) => {
      const matchesStatus = statusFilter === 'all' || assessment?.status === statusFilter;
      const matchesType = typeFilter === 'all' || assessment?.type === typeFilter;

      if (!normalizedSearch) {
        return matchesStatus && matchesType;
      }

      const haystack = [
        assessment?.id,
        assessment?.user_id,
        assessment?.respondent_name,
        assessment?.lead_name,
        assessment?.lead_email,
        assessment?.email,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return matchesStatus && matchesType && haystack.includes(normalizedSearch);
    });
  }, [assessments, search, statusFilter, typeFilter]);

  const controls = (
    <>
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou ID"
          className="pl-9 w-64"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
      >
        <option value="all">Todos status</option>
        <option value="pending">Pending</option>
        <option value="in_progress">In progress</option>
        <option value="completed">Completed</option>
      </select>
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
      >
        <option value="all">Todos tipos</option>
        <option value="free">Free</option>
        <option value="premium">Premium</option>
      </select>
    </>
  );

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <TableShell title="Minhas Avaliações" controls={controls}>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredAssessments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhuma avaliação encontrada"
            description="Ajuste os filtros ou inicie uma nova avaliação."
            ctaLabel="Iniciar avaliação"
            onCtaClick={() => navigate(createPageUrl('StartFree'))}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Respondente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssessments.map((assessment) => (
                <TableRow key={assessment.id}>
                  <TableCell>{formatDate(assessment?.completed_at || assessment?.created_date)}</TableCell>
                  <TableCell className="max-w-xs truncate">{getRespondent(assessment)}</TableCell>
                  <TableCell className="capitalize">{assessment?.type || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={assessment?.status === 'completed' ? 'default' : 'secondary'}>
                      {assessment?.status || '-'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`${createPageUrl('FreeResults')}?id=${assessment.id}`}>
                        <Button variant="outline" size="sm">Ver resultado</Button>
                      </Link>
                      <Link to={`${createPageUrl('Report')}?id=${assessment.id}`}>
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Ver relatório</Button>
                      </Link>
                    </div>
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
