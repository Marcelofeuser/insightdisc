import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  NotebookPen,
  ShoppingCart,
  Sparkles,
  Users,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { trackEvent } from '@/lib/analytics';
import { startSelfAssessment } from '@/utils/assessmentFlow';
import { buildDossierPath } from '@/modules/dossier/routes';
import { buildAssessmentReportPath } from '@/modules/reports';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatsGrid from '@/components/ui/StatsGrid';
import EmptyState from '@/components/ui/EmptyState';
import TableShell from '@/components/ui/TableShell';
import {
  PERMISSIONS,
  createAccessContext,
  hasPermission,
  isSuperAdminAccess,
} from '@/modules/auth/access-control';
import { mapCandidateReports } from '@/modules/report/backendReports.js';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function getRespondentLabel(assessment) {
  return (
    assessment?.respondent_name ||
    assessment?.candidate_name ||
    assessment?.lead_name ||
    assessment?.user_name ||
    assessment?.lead_email ||
    assessment?.email ||
    assessment?.user_email ||
    assessment?.user_id ||
    'Respondente'
  );
}

function loadLocalDossierSummary(workspaceId = '') {
  if (typeof window === 'undefined') {
    return { activeDossiers: 0, scheduledThisMonth: 0 };
  }

  try {
    const raw = JSON.parse(window.localStorage.getItem('insightdisc_behavioral_dossiers') || '{}');
    const keyPrefix = `${String(workspaceId || 'default-workspace').trim()}:`;
    const records = Object.entries(raw || {}).filter(([key]) => key.startsWith(keyPrefix));

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);

    const scheduledThisMonth = records.reduce((total, [, value]) => {
      const reminders = Array.isArray(value?.dossier?.reminders) ? value.dossier.reminders : [];
      const count = reminders.filter((item) => {
        const date = new Date(item?.date);
        return date >= monthStart && date < nextMonth;
      }).length;
      return total + count;
    }, 0);

    return {
      activeDossiers: records.length,
      scheduledThisMonth,
    };
  } catch {
    return { activeDossiers: 0, scheduledThisMonth: 0 };
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { access: authAccess, user: authUser } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const dossierPath = buildDossierPath();
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [isStartingSelfAssessment, setIsStartingSelfAssessment] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (apiBaseUrl && authUser) {
          setUser(authUser);
          setWorkspace({
            id: authUser?.active_workspace_id || authUser?.tenant_id || '',
            name: authUser?.workspace_name || authUser?.company_name || 'Workspace',
            plan: authUser?.plan || 'free',
            credits_balance: Number(authUser?.credits || 0),
          });
          return;
        }

        const currentUser = await base44.auth.me();
        setUser(currentUser);

        if (currentUser?.active_workspace_id) {
          const workspaces = await base44.entities.Workspace.filter({ id: currentUser.active_workspace_id });
          setWorkspace(workspaces[0] || null);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      }
    };

    loadUser();
  }, [apiBaseUrl, authUser]);

  const access = useMemo(
    () => (authAccess?.userId ? authAccess : createAccessContext(user)),
    [authAccess, user]
  );
  const canManageAssessments = hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE);
  const canViewCredits = hasPermission(access, PERMISSIONS.CREDIT_VIEW) || hasPermission(access, PERMISSIONS.CREDIT_MANAGE);
  const canManageCredits = hasPermission(access, PERMISSIONS.CREDIT_MANAGE);
  const canExploreTeamFeatures = hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_TENANT);
  const hasSuperAdminBypass = isSuperAdminAccess(access);

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['dashboard-assessments-v2', apiBaseUrl, access?.tenantId, access?.userId, access?.email],
    queryFn: async () => {
      if (apiBaseUrl) {
        if (!getApiToken()) {
          return [];
        }

        const payload = await apiRequest('/candidate/me/reports', {
          method: 'GET',
          requireAuth: true,
        });
        return mapCandidateReports(payload?.reports || []);
      }

      if (access?.tenantId) {
        return base44.entities.Assessment.filter({ workspace_id: access.tenantId }, '-created_date', 500);
      }

      if (access?.email) {
        const byEmail = await base44.entities.Assessment.filter({ user_id: access.email }, '-created_date', 300);
        if (byEmail.length) return byEmail;
      }

      if (access?.userId) {
        return base44.entities.Assessment.filter({ user_id: access.userId }, '-created_date', 300);
      }

      return [];
    },
    enabled: Boolean(access?.userId || access?.email),
  });

  const { data: dossierSummary } = useQuery({
    queryKey: ['dashboard-dossier-summary', apiBaseUrl, workspace?.id],
    enabled: Boolean(canManageAssessments),
    queryFn: async () => {
      const effectiveWorkspaceId = workspace?.id || access?.tenantId || '';
      if (apiBaseUrl) {
        const payload = await apiRequest(
          `/api/dossier/reminders/summary?workspaceId=${encodeURIComponent(effectiveWorkspaceId)}`,
          {
            method: 'GET',
            requireAuth: true,
          }
        );
        return {
          activeDossiers: Number(payload?.summary?.activeDossiers || 0),
          scheduledThisMonth: Number(payload?.summary?.scheduledThisMonth || 0),
        };
      }

      return loadLocalDossierSummary(effectiveWorkspaceId);
    },
  });

  const handleStartSelfAssessment = async () => {
    if (isStartingSelfAssessment) return;

    setIsStartingSelfAssessment(true);
    try {
      await startSelfAssessment({
        apiBaseUrl,
        navigate,
        access: authAccess,
        source: 'dashboard',
      });
    } catch (error) {
      alert(error?.payload?.message || error?.message || 'Não foi possível iniciar sua avaliação.');
    } finally {
      setIsStartingSelfAssessment(false);
    }
  };

  const kpis = useMemo(() => {
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    const completed = assessments.filter((assessment) => assessment?.status === 'completed');
    const pending = assessments.filter((assessment) => ['pending', 'in_progress'].includes(assessment?.status));
    const completedLast30 = completed.filter((assessment) => {
      const rawDate = assessment?.completed_at || assessment?.created_date;
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) return false;
      return now - parsed.getTime() <= thirtyDays;
    }).length;

    const totalSent = assessments.length;
    const conversionRate = totalSent ? Math.round((completed.length / totalSent) * 100) : 0;

    return {
      completedLast30,
      pendingCount: pending.length,
      credits: hasSuperAdminBypass ? 'Ilimitado' : Number(workspace?.credits_balance ?? 0) || 0,
      conversionRate,
      activeDossiers: Number(dossierSummary?.activeDossiers || 0),
      remindersThisMonth: Number(dossierSummary?.scheduledThisMonth || 0),
    };
  }, [assessments, workspace, hasSuperAdminBypass, dossierSummary]);

  const recentCompleted = useMemo(
    () => assessments.filter((assessment) => assessment?.status === 'completed').slice(0, 5),
    [assessments]
  );

  const statsItems = [
    {
      title: 'Concluídas (30 dias)',
      value: kpis.completedLast30,
      icon: CheckCircle2,
      iconClassName: 'bg-emerald-100',
    },
    {
      title: 'Pendentes / Em andamento',
      value: kpis.pendingCount,
      icon: Clock3,
      iconClassName: 'bg-amber-100',
    },
    ...(canViewCredits
      ? [
          {
            title: 'Créditos disponíveis',
            value: kpis.credits,
            icon: CreditCard,
            iconClassName: 'bg-violet-100',
          },
        ]
      : []),
    {
      title: 'Taxa de conversão',
      value: `${kpis.conversionRate}%`,
      icon: Sparkles,
      iconClassName: 'bg-indigo-100',
    },
    ...(canManageAssessments
      ? [
          {
            title: 'Dossiês ativos',
            value: kpis.activeDossiers,
            icon: NotebookPen,
            iconClassName: 'bg-sky-100',
          },
        ]
      : []),
  ];

  return (
    <div className="w-full min-w-0 max-w-6xl mx-auto px-6 py-8 space-y-6">
      <section className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">Visão geral</h2>
        <p className="text-sm text-slate-500">Resumo operacional da sua conta DISC SaaS</p>
        {hasSuperAdminBypass ? (
          <Badge className="mt-2 bg-amber-100 text-amber-800 border border-amber-300">
            SUPER ADMIN — ACESSO TOTAL
          </Badge>
        ) : null}
      </section>

      <StatsGrid items={statsItems} />

      <section className="grid lg:grid-cols-3 gap-6">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              type="button"
              onClick={handleStartSelfAssessment}
              className="w-full bg-slate-900 hover:bg-slate-800"
              disabled={isStartingSelfAssessment}
              data-testid="dashboard-self-assessment-btn"
            >
              {isStartingSelfAssessment ? 'Iniciando avaliação...' : 'Fazer minha avaliação'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            {canManageAssessments ? (
              <Link to="/sendAssessment">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Enviar convite</Button>
              </Link>
            ) : null}

            <Link to={createPageUrl('MyAssessments')}>
              <Button variant="outline" className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Abrir Minhas Avaliações
              </Button>
            </Link>

            {canExploreTeamFeatures ? (
              <Link to="/compare-profiles">
                <Button variant="outline" className="w-full">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Comparar Perfis
                </Button>
              </Link>
            ) : null}

            {canExploreTeamFeatures ? (
              <Link to="/team-map">
                <Button variant="outline" className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  Mapa de Equipes
                </Button>
              </Link>
            ) : null}

            {canViewCredits || canManageCredits ? (
              <Link to="/checkout">
                <Button variant="outline" className="w-full">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Comprar Créditos
                </Button>
              </Link>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Nome</p>
              <p className="font-semibold text-slate-900 mt-1">{workspace?.name || '—'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Plano</p>
              <p className="font-semibold text-slate-900 mt-1">{workspace?.plan || 'free'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Créditos</p>
              <p className="font-semibold text-slate-900 mt-1">
                {hasSuperAdminBypass ? 'Ilimitado' : Number(workspace?.credits_balance ?? 0) || 0}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Usuário</p>
              <p className="font-semibold text-slate-900 mt-1">{user?.full_name || user?.email || '—'}</p>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle>Dossiê Comportamental</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            Registre insights, observações e acompanhe a evolução comportamental dos avaliados.
          </p>
          <Link
            to={dossierPath}
            onClick={() =>
              trackEvent('dossier_cta_click', {
                source: 'dashboard_card',
                path: dossierPath,
              })
            }
          >
            <Button variant="outline">Abrir módulo</Button>
          </Link>
        </CardContent>
      </Card>

      {canManageAssessments ? (
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardContent className="p-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <CalendarClock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {kpis.remindersThisMonth} reavaliações programadas para este mês
                </p>
                <p className="text-xs text-slate-500">
                  Acompanhe os agendamentos no Dossiê Comportamental.
                </p>
              </div>
            </div>
            <Link to={dossierPath}>
              <Button variant="outline">Abrir Dossiê</Button>
            </Link>
          </CardContent>
        </Card>
      ) : null}

      <TableShell title="Atividade recente">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="h-12 rounded-lg bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : recentCompleted.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Sem avaliações concluídas"
            description="Quando alguém finalizar uma avaliação, ela aparecerá aqui."
            ctaLabel={canManageAssessments ? 'Enviar convite' : undefined}
            onCtaClick={canManageAssessments ? () => (window.location.href = '/sendAssessment') : undefined}
          />
        ) : (
          <div className="space-y-3">
            {recentCompleted.map((assessment) => (
              <div
                key={assessment.id}
                className="rounded-xl border border-slate-200 px-4 py-3 flex flex-col gap-3"
              >
                <div>
                  <Link
                    to={buildAssessmentReportPath(assessment?.assessmentId || assessment?.id || '')}
                    className="font-medium text-slate-900 hover:text-indigo-700 hover:underline"
                  >
                    {getRespondentLabel(assessment)}
                  </Link>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                    <CalendarClock className="w-4 h-4" />
                    <span>{formatDate(assessment?.completed_at || assessment?.created_date)}</span>
                    <Badge variant="secondary">{assessment?.type || 'disc'}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </TableShell>
    </div>
  );
}
