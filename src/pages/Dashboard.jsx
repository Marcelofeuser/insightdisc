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
  ShoppingCart,
  Sparkles,
  Users,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest, getApiBaseUrl } from '@/lib/apiClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import StatsGrid from '@/components/ui/StatsGrid';
import EmptyState from '@/components/ui/EmptyState';
import TableShell from '@/components/ui/TableShell';
import { PERMISSIONS, createAccessContext, hasPermission } from '@/modules/auth/access-control';

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

export default function Dashboard() {
  const navigate = useNavigate();
  const { access: authAccess, user: authUser } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
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

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ['dashboard-assessments-v2', access?.tenantId, access?.userId, access?.email],
    queryFn: async () => {
      if (apiBaseUrl) {
        return [];
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

  const handleStartSelfAssessment = async () => {
    if (isStartingSelfAssessment) return;

    if (!apiBaseUrl) {
      navigate(createPageUrl('PremiumAssessment'));
      return;
    }

    if (Number(workspace?.credits_balance || 0) < 1) {
      navigate(`${createPageUrl('Pricing')}?unlock=1&reason=no_credits`, { replace: false });
      return;
    }

    setIsStartingSelfAssessment(true);
    try {
      const payload = await apiRequest('/assessment/self/start', {
        method: 'POST',
        requireAuth: true,
      });
      if (!payload?.token) {
        throw new Error('Falha ao iniciar autoavaliação.');
      }

      navigate(`/c/assessment?token=${encodeURIComponent(payload.token)}&self=1&from=dashboard`);
    } catch (error) {
      if (Number(error?.status) === 402) {
        navigate(`${createPageUrl('Pricing')}?unlock=1&reason=no_credits`, { replace: false });
        return;
      }
      // eslint-disable-next-line no-alert
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
      credits: Number(workspace?.credits_balance ?? 0) || 0,
      conversionRate,
    };
  }, [assessments, workspace]);

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
  ];

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      <section className="space-y-1">
        <h2 className="text-2xl font-bold text-slate-900">Visão geral</h2>
        <p className="text-sm text-slate-500">Resumo operacional da sua conta DISC SaaS</p>
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
              <Link to={createPageUrl('SendAssessment')}>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Enviar avaliação</Button>
              </Link>
            ) : null}

            <Link to={createPageUrl('MyAssessments')}>
              <Button variant="outline" className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Abrir Minhas Avaliações
              </Button>
            </Link>

            {canManageCredits ? (
              <Link to={createPageUrl('Pricing')}>
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
              <p className="font-semibold text-slate-900 mt-1">{Number(workspace?.credits_balance ?? 0) || 0}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Usuário</p>
              <p className="font-semibold text-slate-900 mt-1">{user?.full_name || user?.email || '—'}</p>
            </div>
          </CardContent>
        </Card>
      </section>

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
            ctaLabel={canManageAssessments ? 'Enviar avaliação' : undefined}
            onCtaClick={canManageAssessments ? () => (window.location.href = createPageUrl('SendAssessment')) : undefined}
          />
        ) : (
          <div className="space-y-3">
            {recentCompleted.map((assessment) => (
              <div
                key={assessment.id}
                className="rounded-xl border border-slate-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div>
                  <p className="font-medium text-slate-900">{getRespondentLabel(assessment)}</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                    <CalendarClock className="w-4 h-4" />
                    <span>{formatDate(assessment?.completed_at || assessment?.created_date)}</span>
                    <Badge variant="secondary">{assessment?.type || 'disc'}</Badge>
                  </div>
                </div>
                <Link to={`${createPageUrl('Report')}?id=${assessment.id}`}>
                  <Button variant="outline" size="sm">Abrir relatório</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </TableShell>
    </div>
  );
}
