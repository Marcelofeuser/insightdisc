import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  FileBarChart2,
  Radar,
  Sparkles,
  UserCircle2,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import StatsGrid from '@/components/ui/StatsGrid';
import { getApiBaseUrl } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { PERMISSIONS, hasPermission } from '@/modules/auth/access-control';
import ActivityFeedPanel from '@/modules/dashboard/components/ActivityFeedPanel';
import DashboardHero from '@/modules/dashboard/components/DashboardHero';
import InsightPanel from '@/modules/dashboard/components/InsightPanel';
import QuickActionsPanel from '@/modules/dashboard/components/QuickActionsPanel';
import {
  BehaviorInsightsPanel,
  DiscDistributionChart,
  DiscTrendsChart,
  DominantProfilesPanel,
} from '@/modules/analytics/components';
import { DashboardErrorState, DashboardLoadingState } from '@/modules/dashboard/components/DashboardStates';
import { dashboardFactorLabels, useDashboardData } from '@/modules/dashboard/useDashboardData';
import { startSelfAssessment } from '@/utils/assessmentFlow';

export default function ProfessionalDashboardV2() {
  const navigate = useNavigate();
  const { access, user } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const data = useDashboardData({ access, user });
  const canCreateAssessment = hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE);

  const stats = useMemo(
    () => [
      {
        title: 'Avaliações realizadas',
        value: data.kpis.completedAssessments,
        subtitle: 'Conclusões com dados válidos para leitura',
        icon: ClipboardList,
        iconClassName: 'bg-indigo-100',
      },
      {
        title: 'Relatórios gerados',
        value: data.kpis.reportsGenerated,
        subtitle: 'Relatórios DISC disponíveis no período',
        icon: FileBarChart2,
        iconClassName: 'bg-sky-100',
      },
      {
        title: 'Perfis analisados',
        value: data.kpis.profilesAnalyzed,
        subtitle: 'Perfis com fatores DISC estruturados',
        icon: Sparkles,
        iconClassName: 'bg-violet-100',
      },
      {
        title: 'Clientes atendidos',
        value: data.kpis.collaboratorsAssessed,
        subtitle: 'Participantes únicos acompanhados',
        icon: UserCircle2,
        iconClassName: 'bg-emerald-100',
      },
      {
        title: 'Comparações executadas',
        value: data.comparisonsRecent,
        subtitle: 'Leituras comparativas recentes',
        icon: Radar,
        iconClassName: 'bg-amber-100',
      },
      {
        title: 'Atividade 30 dias',
        value: data.completedLast30,
        subtitle: 'Avaliações concluídas no último ciclo',
        icon: Users,
        iconClassName: 'bg-rose-100',
      },
    ],
    [data]
  );

  const toolActions = [
    {
      label: 'Avaliações',
      to: '/MyAssessments',
      icon: ClipboardList,
      description: 'Visualize status, conclusão e materiais já emitidos.',
    },
    {
      label: 'Clientes',
      to: '/SendAssessment',
      icon: Users,
      description: 'Gerencie convites e jornadas de clientes avaliados.',
    },
    {
      label: 'Relatórios',
      to: '/MyAssessments',
      icon: FileBarChart2,
      description: 'Acesse os relatórios disponíveis por participante.',
    },
    {
      label: 'Comparador',
      to: '/compare-profiles',
      icon: Radar,
      description: 'Confronte perfis para ganho de precisão analítica.',
    },
    {
      label: 'Arquétipos',
      to: '/painel/arquetipos',
      icon: Sparkles,
      description: 'Consulte narrativas de arquétipos DISC da V2.',
    },
    {
      label: 'Biblioteca DISC',
      to: '/painel/biblioteca-disc',
      icon: BookOpen,
      description: 'Materiais de apoio para interpretação técnica.',
    },
  ];

  const recentProfiles = data.reportsRecent.slice(0, 5).map((item, index) => ({
    id: item.id || `profile-${index}`,
    name: item.candidateName || 'Participante',
    dominant: item.dominantFactor || '-',
  }));

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
        source: 'dashboard-professional-v2',
      });
    } catch (error) {
      setErrorMessage(error?.payload?.message || error?.message || 'Não foi possível iniciar agora.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8" data-testid="dashboard-professional-v2">
      <DashboardHero
        label="Dashboard Professional"
        title="Produtividade analítica para especialistas DISC"
        subtitle="Organize atendimento, interpretação comportamental e entrega de relatórios com visão técnica clara."
        actions={(
          <>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleStart} disabled={isStarting}>
              {isStarting ? 'Iniciando...' : 'Nova avaliação'}
            </Button>
            <Link to="/SendAssessment">
              <Button variant="outline">Clientes</Button>
            </Link>
            <Link to="/compare-profiles">
              <Button variant="outline">Comparador</Button>
            </Link>
            <Link to="/painel/biblioteca-disc">
              <Button variant="outline">Biblioteca DISC</Button>
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
        <DashboardLoadingState
          title="Carregando visão profissional"
          description="Estamos consolidando avaliações, métricas e sinais analíticos do seu fluxo."
        />
      ) : (
        <>
          <StatsGrid items={stats} />

          <section className="grid gap-4 lg:grid-cols-2">
            <DiscDistributionChart
              title="Distribuição DISC"
              subtitle="Percentual médio dos fatores comportamentais entre os perfis acompanhados."
              distribution={data.distribution}
              predominantFactor={data.predominantFactor}
            />
            <BehaviorInsightsPanel
              title="Insights comportamentais"
              subtitle="Leituras automáticas de tendência, equilíbrio e sinais de comunicação."
              items={data.insights}
              distribution={data.distribution}
              sampleSize={data.kpis.profilesAnalyzed}
            />
          </section>

          <QuickActionsPanel
            title="Ferramentas de trabalho"
            subtitle="Acesse rapidamente os módulos mais usados na rotina profissional de análise DISC."
            actions={toolActions}
          />

          <section className="grid gap-4 lg:grid-cols-2">
            <DiscTrendsChart
              title="Tendências DISC"
              subtitle="Evolução da distribuição dos fatores nas avaliações mais recentes."
              trends={data.trends}
            />
            <DominantProfilesPanel
              title="Perfis predominantes"
              subtitle="Perfis DISC mais frequentes para orientar leitura e priorização de devolutivas."
              profiles={data.profileFrequencies}
            />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Análise recente</h3>
              <p className="mt-1 text-sm text-slate-600">
                Perfis e relatórios com leitura mais recente para continuidade de acompanhamento.
              </p>

              <div className="mt-4 space-y-3">
                {recentProfiles.length ? (
                  recentProfiles.map((profile) => (
                    <div key={profile.id} className="rounded-xl border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-900">{profile.name}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        Fator dominante:{' '}
                        <span className="font-semibold text-slate-800">
                          {profile.dominant}
                          {dashboardFactorLabels[profile.dominant]
                            ? ` • ${dashboardFactorLabels[profile.dominant]}`
                            : ''}
                        </span>
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    Ainda não há perfis analisados recentemente.
                  </div>
                )}
              </div>
            </section>

            <InsightPanel
              title="Biblioteca e leitura técnica"
              subtitle="Conteúdo de apoio para reforçar consistência interpretativa e decisões de devolutiva."
              items={[
                'Arquétipos DISC com foco em aplicação prática para devolutivas e sessões.',
                'Referências de comunicação por perfil para melhorar entendimento do cliente.',
                'Guia de sinais de atenção para leitura de risco comportamental em contexto profissional.',
              ]}
            />
          </section>

          <ActivityFeedPanel
            title="Atividade recente"
            subtitle="Últimas avaliações, relatórios e movimentações do seu fluxo analítico."
            items={data.activity}
          />
        </>
      )}
    </div>
  );
}
