import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/ui/EmptyState';
import PanelState from '@/components/ui/PanelState';
import TableShell from '@/components/ui/TableShell';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { PERMISSIONS, createAccessContext, hasPermission } from '@/modules/auth/access-control';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { mapCandidateReports } from '@/modules/report/backendReports.js';
import { buildAssessmentResultPath } from '@/modules/assessmentResult/routes';
import { buildAssessmentReportPath } from '@/modules/reports';
import { startSelfAssessment } from '@/utils/assessmentFlow';

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

const STATUS_LABELS = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluída',
};

const TYPE_LABELS = {
  free: 'Free',
  premium: 'Premium',
};

function formatStatus(value) {
  const key = String(value || '').toLowerCase();
  return STATUS_LABELS[key] || value || '-';
}

function formatType(value) {
  const key = String(value || '').toLowerCase();
  return TYPE_LABELS[key] || value || '-';
}

export default function MyAssessments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { access: authAccess } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isStartingSelfAssessment, setIsStartingSelfAssessment] = useState(false);
  const [actionError, setActionError] = useState('');

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
    queryKey: ['my-assessments', apiBaseUrl, access?.tenantId, access?.userId, access?.email, canTenantView, canSelfView],
    queryFn: async () => {
      const loadLocalAssessments = async () => {
        if (canTenantView && access?.tenantId) {
          return base44.entities.Assessment.filter({ workspace_id: access.tenantId }, '-created_date', 200);
        }

        if (!canSelfView) return [];

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
      };

      if (apiBaseUrl) {
        const token = getApiToken();
        if (token) {
          try {
            const payload = await apiRequest('/candidate/me/reports', {
              method: 'GET',
              requireAuth: true,
            });
            const mapped = mapCandidateReports(payload?.reports || []);
            if (mapped.length > 0 || !base44?.__isMock) {
              return mapped;
            }
          } catch (error) {
            console.warn('[MyAssessments] API reports unavailable, fallback local mode', error);
          }
        }

        if (base44?.__isMock) {
          return loadLocalAssessments();
        }

        return [];
      }

      return loadLocalAssessments();
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

  const handleStartSelfAssessment = async (source) => {
    if (isStartingSelfAssessment) return;
    setIsStartingSelfAssessment(true);
    setActionError('');
    try {
      await startSelfAssessment({
        apiBaseUrl,
        navigate,
        access: authAccess,
        source,
      });
    } catch (error) {
      const message = error?.payload?.message || error?.message || 'Não foi possível iniciar a avaliação.';
      setActionError(message);
      toast({
        title: 'Falha ao iniciar avaliação',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsStartingSelfAssessment(false);
    }
  };

  const completedCount = filteredAssessments.filter((item) => item?.status === 'completed').length;
  const inProgressCount = filteredAssessments.filter((item) => item?.status === 'in_progress').length;

  const controls = (
    <>
      <Button
        type="button"
        onClick={() => handleStartSelfAssessment('my-assessments')}
        className="h-10 bg-indigo-600 hover:bg-indigo-700"
        data-testid="my-assessments-new-assessment-btn"
        disabled={isStartingSelfAssessment}
      >
        {isStartingSelfAssessment ? 'Iniciando...' : 'Nova Avaliação'}
      </Button>

      <div className="relative min-w-[240px] flex-1 sm:flex-none">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome, e-mail ou ID"
          className="h-10 w-full border-slate-200 pl-9 sm:w-72"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:border-slate-300"
      >
        <option value="all">Todos status</option>
        <option value="pending">Pendente</option>
        <option value="in_progress">Em andamento</option>
        <option value="completed">Concluída</option>
      </select>
      <select
        value={typeFilter}
        onChange={(e) => setTypeFilter(e.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:border-slate-300"
      >
        <option value="all">Todos tipos</option>
        <option value="free">Free</option>
        <option value="premium">Premium</option>
      </select>
    </>
  );

  return (
    <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8">
      <TableShell
        title="Minhas Avaliações"
        description="Acompanhe histórico, status e relatórios em um único fluxo."
        controls={controls}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline">Total: {filteredAssessments.length}</Badge>
          <Badge variant="outline">Concluídas: {completedCount}</Badge>
          <Badge variant="outline">Em andamento: {inProgressCount}</Badge>
        </div>

        {actionError ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}

        {isLoading ? (
          <PanelState
            type="loading"
            title="Carregando avaliações"
            description="Estamos trazendo seu histórico e status mais recentes."
          />
        ) : filteredAssessments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhuma avaliação encontrada"
            description="Ajuste os filtros ou inicie uma nova avaliação."
            ctaLabel="Nova Avaliação"
            onCtaClick={() => handleStartSelfAssessment('my-assessments-empty')}
            tone="soft"
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200">
                <TableHead>Data</TableHead>
                <TableHead>Respondente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssessments.map((assessment) => {
                const targetAssessmentId = assessment?.assessmentId || assessment?.id || '';
                const resultHref = buildAssessmentResultPath(targetAssessmentId);

                return (
                  <TableRow key={assessment.id} className="border-slate-100 hover:bg-slate-50/70">
                    <TableCell className="text-slate-700">
                      {formatDate(assessment?.completed_at || assessment?.created_date)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{getRespondent(assessment)}</TableCell>
                    <TableCell className="capitalize">{formatType(assessment?.type)}</TableCell>
                    <TableCell>
                      <Badge variant={assessment?.status === 'completed' ? 'default' : 'secondary'}>
                        {formatStatus(assessment?.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {targetAssessmentId ? (
                          <>
                            <Link to={resultHref}>
                              <Button variant="outline" size="sm">Ver resultado</Button>
                            </Link>
                            <Link to={buildAssessmentReportPath(targetAssessmentId)}>
                              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Ver relatório</Button>
                            </Link>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            Sem vínculo
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </TableShell>
    </div>
  );
}
