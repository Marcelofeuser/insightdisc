import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Building2,
  ClipboardList,
  FileBarChart2,
  Radar,
  Sparkles,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import StatsGrid from '@/components/ui/StatsGrid';
import { getApiBaseUrl } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { PERMISSIONS, hasPermission } from '@/modules/auth/access-control';
import ActivityFeedPanel from '@/modules/dashboard/components/ActivityFeedPanel';
import DashboardHero from '@/modules/dashboard/components/DashboardHero';
import QuickActionsPanel from '@/modules/dashboard/components/QuickActionsPanel';
import { buildDossierPath } from '@/modules/dossier/routes';
import {
  BehaviorInsightsPanel,
  DiscDistributionChart,
  DiscRadarChart,
  DiscTrendsChart,
  DominantProfilesPanel,
  TeamDiscMap,
} from '@/modules/analytics/components';
import { DashboardErrorState, DashboardLoadingState } from '@/modules/dashboard/components/DashboardStates';
import { dashboardFactorLabels, useDashboardData } from '@/modules/dashboard/useDashboardData';
import { startSelfAssessment } from '@/utils/assessmentFlow';

export default function BusinessDashboardV2() {
  const navigate = useNavigate();
  const { access, user } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const dossierPath = buildDossierPath();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const data = useDashboardData({ access, user });
  const canCreateAssessment = hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE);

  const metrics = useMemo(
    () => [
      {
        title: 'Total de avaliações',
        value: data.kpis.totalAssessments,
        subtitle: 'Visão consolidada da operação',
        icon: ClipboardList,
        iconClassName: 'bg-indigo-100',
      },
      {
        title: 'Colaboradores avaliados',
        value: data.kpis.collaboratorsAssessed,
        subtitle: 'Pessoas únicas com histórico DISC',
        icon: Users,
        iconClassName: 'bg-emerald-100',
      },
      {
        title: 'Comparações recentes',
        value: data.comparisonsRecent,
        subtitle: 'Leituras cruzadas no período atual',
        icon: Radar,
        iconClassName: 'bg-amber-100',
      },
      {
        title: 'Relatórios gerados',
        value: data.kpis.reportsGenerated,
        subtitle: 'Relatórios disponíveis para decisão',
        icon: FileBarChart2,
        iconClassName: 'bg-sky-100',
      },
      {
        title: 'Equipes monitoradas',
        value: data.teamsMonitored,
        subtitle: 'Grupos com leitura comportamental ativa',
        icon: Building2,
        iconClassName: 'bg-violet-100',
      },
      {
        title: 'Alertas relevantes',
        value: data.insights.length,
        subtitle: 'Sinais organizacionais para acompanhar',
        icon: Sparkles,
        iconClassName: 'bg-rose-100',
      },
    ],
    [data]
  );

  const quickActions = [
    {
      label: 'Avaliações',
      to: '/MyAssessments',
      icon: ClipboardList,
      description: 'Gerencie envios, status e conclusão das avaliações.',
    },
    {
      label: 'Dossiê',
      to: dossierPath,
      icon: BookOpen,
      description: 'Abra o histórico comportamental, notas, insights, planos e lembretes.',
    },
    {
      label: 'Equipe',
      to: '/team-map',
      icon: Users,
      description: 'Visualize distribuição DISC coletiva e predominâncias.',
    },
    {
      label: 'Comparador',
      to: '/compare-profiles',
      icon: Radar,
      description: 'Compare perfis comportamentais de forma objetiva.',
    },
    {
      label: 'Insights',
      to: '/JobMatching',
      icon: Sparkles,
      description: 'Explore aderência comportamental por contexto de função.',
    },
    {
      label: 'Relatórios',
      to: '/MyAssessments',
      icon: FileBarChart2,
      description: 'Acesse relatórios DISC e histórico consolidado.',
    },
    {
      label: 'Organização',
      to: '/app/branding',
      icon: Building2,
      description: 'Ajuste marca e centralize configurações da operação.',
    },
  ];

  const predominantLabel =
    data.predominantFactor && dashboardFactorLabels[data.predominantFactor]
      ? `${data.predominantFactor} • ${dashboardFactorLabels[data.predominantFactor]}`
      : 'Sem predominância definida';

  const handleStart = async () => {
    if (isStarting) return;
    setErrorMessage('');

    if (canCreateAssessment) {
      navigate('/SendAssessment');
      return;
    }

    setIsStarting(true);
    try {
      await startSelfAssessment({
        apiBaseUrl,
        navigate,
        access,
        source: 'dashboard-business-v2',
      });
    } catch (error) {
      setErrorMessage(error?.payload?.message || error?.message || 'Não foi possível iniciar agora.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8" data-testid="dashboard-business-v2">
      <DashboardHero
        label="Dashboard Business"
        title="Gestão organizacional com inteligência comportamental"
        subtitle="Acompanhe operação, equipes e relatórios para decisões de RH e liderança com mais precisão."
        badge={<Badge variant="outline">Modo organizacional ativo</Badge>}
        actions={(
          <>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleStart} disabled={isStarting}>
              {isStarting ? 'Iniciando...' : 'Nova avaliação'}
            </Button>
            <Link to="/team-map">
              <Button variant="outline">Ver equipe</Button>
            </Link>
            <Link to="/compare-profiles">
              <Button variant="outline">Comparar perfis</Button>
            </Link>
            <Link to="/MyAssessments">
              <Button variant="outline">Relatórios</Button>
            </Link>
          </>
        )}
      />

      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {data.error ? (
        <DashboardErrorState message={data.error?.message} />
      ) : null}

      {data.isLoading ? (
        <DashboardLoadingState />
      ) : (
        <>
          <StatsGrid items={metrics} />

          <section className="grid gap-4 lg:grid-cols-2">
            <DiscDistributionChart
              title="Distribuição DISC"
              subtitle="Percentual médio dos fatores D, I, S e C na base analisada."
              distribution={data.distribution}
              predominantFactor={data.predominantFactor}
            />
            <DiscRadarChart
              title="Radar comportamental coletivo"
              subtitle="Intensidade média dos fatores DISC para leitura organizacional rápida."
              profile={data.distribution}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <TeamDiscMap
              title="Mapa de perfis da equipe"
              subtitle="Visualização rápida da composição comportamental dos participantes recentes."
              members={data.teamProfiles}
            />
            <BehaviorInsightsPanel
              title="Insights comportamentais"
              subtitle="Leituras automáticas para apoiar liderança, cultura e comunicação."
              items={data.insights}
              distribution={data.distribution}
              sampleSize={data.kpis.profilesAnalyzed}
            />
          </section>

          <QuickActionsPanel
            title="Ações rápidas"
            subtitle="Atalhos para operar avaliação, equipe, comparador e organização sem fricção."
            actions={quickActions}
          />

          <section className="grid gap-4 lg:grid-cols-2">
            <DiscTrendsChart
              title="Tendências comportamentais"
              subtitle="Evolução mensal dos fatores DISC nas avaliações concluídas."
              trends={data.trends}
            />
            <DominantProfilesPanel
              title="Perfis predominantes"
              subtitle="Combinações DISC mais frequentes para apoiar decisões de RH e liderança."
              profiles={data.profileFrequencies}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <ActivityFeedPanel
              title="Atividade recente"
              subtitle="Últimos movimentos de avaliação e geração de relatórios da organização."
              items={data.activity}
            />

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Resumo executivo</h3>
              <p className="mt-1 text-sm text-slate-600">
                Predominância atual da base analisada: <strong>{predominantLabel}</strong>
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Dossiês ativos</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{data.dossier.activeDossiers}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Lembretes do mês</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{data.dossier.scheduledThisMonth}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Concluídas em 30 dias</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{data.completedLast30}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Créditos disponíveis</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">{data.creditsBalance}</p>
                </div>
              </div>
            </section>
          </section>
        </>
      )}
    </div>
  );
}
