import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CreditCard, FileText, Search, SendHorizonal } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
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
import { usePanelMode } from '@/modules/navigation/panelModeContext';
import { PANEL_MODE, normalizePanelMode } from '@/modules/navigation/panelMode';
import { startSelfAssessment } from '@/utils/assessmentFlow';

const STATUS_LABELS = {
  pending: 'Pendente',
  in_progress: 'Em andamento',
  completed: 'Concluída',
  expired: 'Expirada',
};

const TYPE_LABELS = {
  business: 'Business',
  professional: 'Professional',
  personal: 'Personal',
  premium: 'Premium',
  free: 'Free',
};

const REPORT_DATE_WINDOW_MS = {
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  '180d': 180 * 24 * 60 * 60 * 1000,
};

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function normalizeStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'pending';
  if (normalized === 'in progress' || normalized === 'inprogress') return 'in_progress';
  return normalized;
}

function normalizeType(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || 'business';
}

function formatStatus(value) {
  const key = normalizeStatus(value);
  return STATUS_LABELS[key] || key || '-';
}

function formatType(value) {
  const key = normalizeType(value);
  return TYPE_LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1) : '-');
}

function getRespondent(raw = {}) {
  return (
    raw?.respondentName ||
    raw?.respondent_name ||
    raw?.candidateName ||
    raw?.candidate_name ||
    raw?.lead_name ||
    raw?.candidateEmail ||
    raw?.candidate_email ||
    raw?.lead_email ||
    raw?.user_email ||
    '-'
  );
}

function resolveDominantFactor(raw = {}) {
  const factor = String(
    raw?.dominantFactor ||
      raw?.results?.dominant_factor ||
      raw?.disc_results?.dominant_factor ||
      raw?.discProfile?.dominant ||
      raw?.discProfile?.primary ||
      '',
  )
    .trim()
    .toUpperCase();

  if (['D', 'I', 'S', 'C'].includes(factor)) return factor;
  return '-';
}

function mapOperationalAssessmentItem(item = {}, index = 0) {
  const assessmentId = String(item?.assessmentId || item?.id || `assessment-${index}`).trim();
  const createdAt = item?.createdAt || item?.created_date || null;
  const completedAt = item?.completedAt || item?.completed_at || null;
  const status = normalizeStatus(item?.status);
  const type = normalizeType(item?.type || item?.reportType || item?.report_type);
  const reportId = String(item?.reportId || item?.report_id || '').trim();
  const candidateUserId = String(
    item?.candidateUserId || item?.candidate_user_id || item?.user_id || '',
  ).trim();
  const hasReport = Boolean(item?.hasReport || reportId || item?.publicPdfUrl || item?.pdfUrl);

  return {
    id: assessmentId || `assessment-${index}`,
    assessmentId,
    createdAt,
    completedAt,
    respondentName: getRespondent(item),
    candidateEmail: String(item?.candidateEmail || item?.candidate_email || item?.lead_email || '').trim(),
    candidateUserId,
    status,
    type,
    reportId,
    hasReport,
    publicReportUrl: String(item?.publicReportUrl || item?.public_report_url || '').trim(),
    publicPdfUrl: String(item?.publicPdfUrl || item?.pdfUrl || item?.pdf_url || '').trim(),
    dominantFactor: resolveDominantFactor(item),
  };
}

function mapReportItem(item = {}, index = 0) {
  const assessmentId = String(item?.assessmentId || item?.id || item?.reportId || `report-${index}`).trim();

  return {
    id: assessmentId || `report-${index}`,
    assessmentId,
    completedAt: item?.completed_at || item?.completedAt || item?.createdAt || item?.created_date || null,
    createdAt: item?.createdAt || item?.created_date || null,
    respondentName: getRespondent(item),
    candidateEmail: String(item?.candidateEmail || item?.candidate_email || item?.lead_email || '').trim(),
    candidateUserId: String(item?.candidateUserId || item?.candidate_user_id || item?.user_id || '').trim(),
    type: normalizeType(item?.reportType || item?.report_type || item?.type),
    dominantFactor: resolveDominantFactor(item),
    publicReportUrl: String(item?.publicReportUrl || item?.public_report_url || '').trim(),
    publicPdfUrl: String(item?.publicPdfUrl || item?.pdfUrl || item?.pdf_url || '').trim(),
  };
}

function isDateInWindow(value, windowKey) {
  if (!windowKey || windowKey === 'all') return true;
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return false;
  const maxAge = REPORT_DATE_WINDOW_MS[windowKey];
  if (!maxAge) return true;
  return Date.now() - date.getTime() <= maxAge;
}

function matchesSearch(item, query = '') {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return true;

  const haystack = [
    item?.id,
    item?.assessmentId,
    item?.respondentName,
    item?.candidateEmail,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(needle);
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function isOwnRespondentRecord(item = {}, identity = {}) {
  const userId = String(identity?.userId || '').trim();
  const email = normalizeEmail(identity?.email || '');
  const candidateUserId = String(
    item?.candidateUserId || item?.candidate_user_id || item?.user_id || '',
  ).trim();
  const candidateEmail = normalizeEmail(
    item?.candidateEmail ||
      item?.candidate_email ||
      item?.lead_email ||
      item?.user_email ||
      item?.email ||
      '',
  );

  if (userId && candidateUserId && userId === candidateUserId) {
    return true;
  }

  if (email && candidateEmail && email === candidateEmail) {
    return true;
  }

  return false;
}

export default function MyAssessments() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { access: authAccess } = useAuth();
  const { panelMode, autoPanelMode } = usePanelMode();
  const apiBaseUrl = getApiBaseUrl();

  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assessmentTypeFilter, setAssessmentTypeFilter] = useState('all');
  const [reportTypeFilter, setReportTypeFilter] = useState('all');
  const [reportDateFilter, setReportDateFilter] = useState('all');
  const [profileFilter, setProfileFilter] = useState('all');
  const [isStartingSelfAssessment, setIsStartingSelfAssessment] = useState(false);
  const [actionError, setActionError] = useState('');

  const isReportsView = String(location.hash || '').toLowerCase().includes('reports');
  const activePanelMode = normalizePanelMode(panelMode, autoPanelMode || PANEL_MODE.BUSINESS);
  const isPersonalMode = activePanelMode === PANEL_MODE.PERSONAL;

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
  const canCreateAssessment = hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE);
  const selfIdentity = {
    userId: access?.userId || '',
    email: access?.email || '',
  };

  const loadLocalAssessments = async () => {
    if (!isPersonalMode && canTenantView && access?.tenantId) {
      const tenantItems = await base44.entities.Assessment.filter(
        { workspace_id: access.tenantId },
        '-created_date',
        240,
      );
      return tenantItems.map(mapOperationalAssessmentItem);
    }

    if (!canSelfView) return [];

    const byUserId = access?.userId
      ? await base44.entities.Assessment.filter({ user_id: access.userId }, '-created_date', 240)
      : [];
    const byEmail = access?.email
      ? await base44.entities.Assessment.filter({ user_id: access.email }, '-created_date', 240)
      : [];
    const byRespondentEmail = access?.email
      ? await base44.entities.Assessment.filter({ respondent_email: access.email }, '-created_date', 240)
      : [];
    const byLeadEmail = access?.email
      ? await base44.entities.Assessment.filter({ lead_email: access.email }, '-created_date', 240)
      : [];

    const merged = [...byUserId, ...byEmail, ...byRespondentEmail, ...byLeadEmail]
      .map(mapOperationalAssessmentItem);

    const seen = new Set();
    const deduped = merged.filter((item) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });

    if (isPersonalMode) {
      return deduped.filter((item) => isOwnRespondentRecord(item, selfIdentity));
    }

    return deduped;
  };

  const {
    data: operationalAssessments = [],
    isLoading: isLoadingAssessments,
  } = useQuery({
    queryKey: [
      'my-assessments-operational',
      apiBaseUrl,
      access?.tenantId,
      access?.userId,
      access?.email,
      canTenantView,
      canSelfView,
      isPersonalMode,
      selfIdentity.userId,
      selfIdentity.email,
    ],
    queryFn: async () => {
      if (apiBaseUrl) {
        const token = getApiToken();
        if (token) {
          try {
            const payload = await apiRequest('/candidate/me/assessments', {
              method: 'GET',
              requireAuth: true,
            });

            const mapped = Array.isArray(payload?.assessments)
              ? payload.assessments.map(mapOperationalAssessmentItem)
              : [];
            const scoped = isPersonalMode
              ? mapped.filter((item) => isOwnRespondentRecord(item, selfIdentity))
              : mapped;

            if (scoped.length > 0 || !base44?.__isMock) {
              return scoped;
            }
          } catch (error) {
            console.warn('[MyAssessments] API assessments unavailable, fallback local mode', error);
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

  const {
    data: reports = [],
    isLoading: isLoadingReports,
  } = useQuery({
    queryKey: [
      'my-assessments-reports',
      apiBaseUrl,
      access?.tenantId,
      access?.userId,
      access?.email,
      isPersonalMode,
      selfIdentity.userId,
      selfIdentity.email,
    ],
    queryFn: async () => {
      if (apiBaseUrl) {
        const token = getApiToken();
        if (token) {
          try {
            const payload = await apiRequest('/candidate/me/reports', {
              method: 'GET',
              requireAuth: true,
            });
            const mapped = mapCandidateReports(payload?.reports || []).map(mapReportItem);
            const scoped = isPersonalMode
              ? mapped.filter((item) => isOwnRespondentRecord(item, selfIdentity))
              : mapped;
            if (scoped.length > 0 || !base44?.__isMock) {
              return scoped;
            }
          } catch (error) {
            console.warn('[MyAssessments] API reports unavailable, fallback local mode', error);
          }
        }

        if (base44?.__isMock) {
          const local = await loadLocalAssessments();
          const mapped = local.filter((item) => item.hasReport || item.status === 'completed').map(mapReportItem);
          return isPersonalMode
            ? mapped.filter((item) => isOwnRespondentRecord(item, selfIdentity))
            : mapped;
        }

        return [];
      }

      const local = await loadLocalAssessments();
      const mapped = local.filter((item) => item.hasReport || item.status === 'completed').map(mapReportItem);
      return isPersonalMode
        ? mapped.filter((item) => isOwnRespondentRecord(item, selfIdentity))
        : mapped;
    },
    enabled: Boolean(access?.userId || access?.email),
  });

  const assessmentTypeOptions = useMemo(() => {
    return Array.from(new Set(operationalAssessments.map((item) => item.type).filter(Boolean))).sort();
  }, [operationalAssessments]);

  const reportTypeOptions = useMemo(() => {
    return Array.from(new Set(reports.map((item) => item.type).filter(Boolean))).sort();
  }, [reports]);

  const profileOptions = useMemo(() => {
    return Array.from(
      new Set(
        reports
          .map((item) => String(item.dominantFactor || '').toUpperCase())
          .filter((item) => ['D', 'I', 'S', 'C'].includes(item)),
      ),
    ).sort();
  }, [reports]);

  const filteredAssessments = useMemo(() => {
    return operationalAssessments.filter((item) => {
      if (!matchesSearch(item, search)) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (assessmentTypeFilter !== 'all' && item.type !== assessmentTypeFilter) return false;
      return true;
    });
  }, [operationalAssessments, search, statusFilter, assessmentTypeFilter]);

  const filteredReports = useMemo(() => {
    return reports.filter((item) => {
      if (!matchesSearch(item, search)) return false;
      if (reportTypeFilter !== 'all' && item.type !== reportTypeFilter) return false;
      if (profileFilter !== 'all' && item.dominantFactor !== profileFilter) return false;
      if (!isDateInWindow(item.completedAt || item.createdAt, reportDateFilter)) return false;
      return true;
    });
  }, [reports, search, reportTypeFilter, profileFilter, reportDateFilter]);

  const isLoading = isReportsView ? isLoadingReports : isLoadingAssessments;
  const rows = isReportsView ? filteredReports : filteredAssessments;

  const assessmentsCompleted = filteredAssessments.filter((item) => item.status === 'completed').length;
  const assessmentsInProgress = filteredAssessments.filter((item) => item.status === 'in_progress').length;
  const assessmentsPending = filteredAssessments.filter((item) => item.status === 'pending').length;

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

  const assessmentsControls = (
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

      {isPersonalMode ? (
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={() => navigate('/checkout')}
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Comprar créditos
        </Button>
      ) : null}

      {!isPersonalMode && canCreateAssessment ? (
        <Button
          type="button"
          variant="outline"
          className="h-10"
          onClick={() => navigate('/SendAssessment')}
        >
          <SendHorizonal className="mr-2 h-4 w-4" />
          Enviar convite
        </Button>
      ) : null}

      <div className="relative min-w-[240px] flex-1 sm:flex-none">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por nome, e-mail ou ID"
          className="h-10 w-full border-slate-200 pl-9 sm:w-72"
        />
      </div>

      <select
        value={statusFilter}
        onChange={(event) => setStatusFilter(event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:border-slate-300"
      >
        <option value="all">Todos status</option>
        <option value="pending">Pendente</option>
        <option value="in_progress">Em andamento</option>
        <option value="completed">Concluída</option>
      </select>

      <select
        value={assessmentTypeFilter}
        onChange={(event) => setAssessmentTypeFilter(event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:border-slate-300"
      >
        <option value="all">Todos tipos</option>
        {assessmentTypeOptions.map((type) => (
          <option key={type} value={type}>
            {formatType(type)}
          </option>
        ))}
      </select>
    </>
  );

  const reportsControls = (
    <>
      <div className="relative min-w-[240px] flex-1 sm:flex-none">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por respondente, e-mail ou ID"
          className="h-10 w-full border-slate-200 pl-9 sm:w-72"
        />
      </div>

      <select
        value={reportDateFilter}
        onChange={(event) => setReportDateFilter(event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:border-slate-300"
      >
        <option value="all">Todo período</option>
        <option value="30d">Últimos 30 dias</option>
        <option value="90d">Últimos 90 dias</option>
        <option value="180d">Últimos 180 dias</option>
      </select>

      <select
        value={reportTypeFilter}
        onChange={(event) => setReportTypeFilter(event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:border-slate-300"
      >
        <option value="all">Todos tipos</option>
        {reportTypeOptions.map((type) => (
          <option key={type} value={type}>
            {formatType(type)}
          </option>
        ))}
      </select>

      <select
        value={profileFilter}
        onChange={(event) => setProfileFilter(event.target.value)}
        className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 transition hover:border-slate-300"
      >
        <option value="all">Todos perfis</option>
        {profileOptions.map((profile) => (
          <option key={profile} value={profile}>
            {profile}
          </option>
        ))}
      </select>
    </>
  );

  return (
    <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8">
      <TableShell
        title={isReportsView ? 'Relatórios' : 'Avaliações'}
        description={
          isReportsView
            ? 'Histórico de relatórios concluídos para análise e entrega (resultado + PDF).'
            : 'Fluxo operacional de avaliação: criar, enviar, acompanhar status e progresso dos respondentes.'
        }
        controls={isReportsView ? reportsControls : assessmentsControls}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Link
            to="/MyAssessments"
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              !isReportsView
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            Avaliações
          </Link>
          <Link
            to="/MyAssessments#reports"
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              isReportsView
                ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            Relatórios
          </Link>

          {isReportsView ? (
            <>
              <Badge variant="outline">Total: {filteredReports.length}</Badge>
              <Badge variant="outline">
                Com PDF: {filteredReports.filter((item) => Boolean(item.publicPdfUrl)).length}
              </Badge>
            </>
          ) : (
            <>
              <Badge variant="outline">Total: {filteredAssessments.length}</Badge>
              <Badge variant="outline">Concluídas: {assessmentsCompleted}</Badge>
              <Badge variant="outline">Em andamento: {assessmentsInProgress}</Badge>
              <Badge variant="outline">Pendentes: {assessmentsPending}</Badge>
            </>
          )}
        </div>

        {actionError ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {actionError}
          </div>
        ) : null}

        {isLoading ? (
          <PanelState
            type="loading"
            title={isReportsView ? 'Carregando relatórios' : 'Carregando avaliações'}
            description={
              isReportsView
                ? 'Buscando histórico de relatórios finais e PDFs.'
                : 'Buscando status operacionais das avaliações.'
            }
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={isReportsView ? 'Nenhum relatório encontrado' : 'Nenhuma avaliação encontrada'}
            description={
              isReportsView
                ? 'Ajuste os filtros por data, tipo ou perfil para localizar os relatórios concluídos.'
                : 'Ajuste os filtros ou inicie uma nova avaliação.'
            }
            ctaLabel={isReportsView || isPersonalMode ? undefined : 'Nova Avaliação'}
            onCtaClick={
              isReportsView || isPersonalMode
                ? undefined
                : () => handleStartSelfAssessment('my-assessments-empty')
            }
            tone="soft"
          />
        ) : isReportsView ? (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200">
                <TableHead>Conclusão</TableHead>
                <TableHead>Respondente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => {
                const assessmentId = report.assessmentId || report.id;
                const reportHref = assessmentId ? buildAssessmentReportPath(assessmentId) : '';
                const pdfHref = report.publicPdfUrl || '';

                return (
                  <TableRow key={report.id} className="border-slate-100 hover:bg-slate-50/70">
                    <TableCell className="text-slate-700">{formatDate(report.completedAt || report.createdAt)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {assessmentId ? (
                        <Link to={resultHref} className="font-medium text-slate-900 hover:text-indigo-700 hover:underline">
                          {report.respondentName}
                        </Link>
                      ) : (
                        report.respondentName
                      )}
                    </TableCell>
                    <TableCell>{formatType(report.type)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.dominantFactor || '-'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {assessmentId ? (
                          <Link to={reportHref}>
                            <Button variant="outline" size="sm">Relatório</Button>
                          </Link>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            Relatório
                          </Button>
                        )}
                        {pdfHref ? (
                          <a href={pdfHref} target="_blank" rel="noreferrer">
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">PDF</Button>
                          </a>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            PDF indisponível
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-200">
                <TableHead>Criação</TableHead>
                <TableHead>Respondente</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssessments.map((assessment) => {
                const assessmentId = assessment.assessmentId || assessment.id;
                const resultHref = assessmentId ? buildAssessmentResultPath(assessmentId) : '';
                const reportHref = assessmentId ? buildAssessmentReportPath(assessmentId) : '';

                return (
                  <TableRow key={assessment.id} className="border-slate-100 hover:bg-slate-50/70">
                    <TableCell className="text-slate-700">{formatDate(assessment.createdAt || assessment.completedAt)}</TableCell>
                    <TableCell className="max-w-xs truncate">{assessment.respondentName}</TableCell>
                    <TableCell>{formatType(assessment.type)}</TableCell>
                    <TableCell>
                      <Badge variant={assessment.status === 'completed' ? 'default' : 'secondary'}>
                        {formatStatus(assessment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        {assessmentId ? (
                          <Link to={resultHref}>
                            <Button variant="outline" size="sm">Resultado</Button>
                          </Link>
                        ) : null}
                        {assessment.hasReport && assessmentId ? (
                          <Link to={reportHref}>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">Relatório</Button>
                          </Link>
                        ) : (
                          <Button variant="outline" size="sm" disabled>
                            Sem relatório
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
