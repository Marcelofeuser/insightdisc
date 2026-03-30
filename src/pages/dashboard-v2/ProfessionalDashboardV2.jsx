import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  FileBarChart2,
  Radar,
  Sparkles,
  UserCircle2,
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
import { buildDossierPath } from '@/modules/dossier/routes';
import { startSelfAssessment } from '@/utils/assessmentFlow';

export default function ProfessionalDashboardV2() {
  const navigate = useNavigate();
  const { access, user } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const dossierPath = buildDossierPath();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const data = useDashboardData({ access, user });
  const canCreateAssessment = hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE);
  const creditsAvailable = Number(data.creditsBalance || 0);

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
      description: 'Acompanhe convites enviados, status e andamento operacional.',
    },
    {
      label: 'Convites',
      to: '/SendAssessment',
      icon: Users,
      description: 'Envie convites e opere a base de respondentes.',
    },
    {
      label: 'Dossiê',
      to: dossierPath,
      icon: Sparkles,
      description: 'Acesse leitura aprofundada por avaliado para devolutiva.',
    },
    {
      label: 'Relatórios',
      to: '/MyAssessments#reports',
      icon: FileBarChart2,
      description: 'Consulte entregas finais e histórico concluído.',
    },
    {
      label: 'Comparador',
      to: '/compare-profiles',
      icon: Radar,
      description: 'Confronte perfis para ganho de precisão analítica.',
    },
    {
      label: 'Mapa Organizacional',
      to: '/team-map',
      icon: Users,
      description: 'Analise equilíbrio comportamental de equipes e lacunas de composição.',
    },
    {
      label: 'Arquétipos',
      to: '/painel/arquetipos',
      icon: Sparkles,
      description: 'Interprete arquétipos com base em relatórios concluídos.',
    },
  ];

  const intelligentActions = [
    {
      label: 'Plano de desenvolvimento',
      description: 'Trilha em curto, medio e longo prazo com acoes e indicador de progresso.',
      to: '/painel/ai-lab?module=development_plan&segment=development',
    },
    {
      label: 'Feedback pronto',
      description: 'Texto para gestor com abertura, positivos, atencoes e direcionamento claro.',
      to: '/painel/ai-lab?module=manager_feedback&segment=leadership',
    },
    {
      label: 'Riscos',
      description: 'Mapa de conflito, comunicacao, pressao e mitigacoes para o perfil selecionado.',
      to: '/painel/ai-lab?module=behavioral_risk&segment=communication',
    },
    {
      label: 'Compatibilidade',
      description: 'Analise de fit entre dois perfis com sinergias e pontos de tensao.',
      to: '/painel/ai-lab?module=profile_fit&segment=leadership',
    },
    {
      label: 'Sugestoes de acao',
      description: 'Recomendacoes de alocacao e colaboracao com foco em resultado.',
      to: '/painel/ai-lab?module=team_allocation&segment=development',
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
        badge={(
          <Badge variant="outline" className="rounded-full">
            Créditos disponíveis: {creditsAvailable}
          </Badge>
        )}
        actions={(
          <>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={handleStart}
              disabled={isStarting}
              data-testid="dashboard-self-assessment-btn"
            >
              {isStarting ? 'Iniciando...' : 'Fazer minha avaliação'}
            </Button>
            <Link to="/SendAssessment">
              <Button variant="outline">Convites</Button>
            </Link>
            <Link to={dossierPath}>
              <Button variant="outline">Dossiê</Button>
            </Link>
            <Link to="/compare-profiles">
              <Button variant="outline">Comparador</Button>
            </Link>
            <Link to="/MyAssessments#reports">
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

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Insights Inteligentes</h3>
                <p className="mt-1 text-sm text-slate-600">
                  IA estratégica conectada a relatórios reais para orientar decisões de gestão e desenvolvimento.
                </p>
              </div>
              <Link to="/painel/ai-lab">
                <Button variant="outline" size="sm">Abrir AI Lab</Button>
              </Link>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {intelligentActions.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.description}</p>
                </Link>
              ))}
            </div>
          </section>

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
              title="Leitura técnica aplicada"
              subtitle="Diretrizes para devolutiva, priorização de risco comportamental e tomada de decisão."
              items={[
                'Arquétipos DISC conectados aos relatórios concluídos para contexto prático.',
                'Referências objetivas de comunicação por perfil para devolutivas mais claras.',
                'Checklist de sinais de atenção para sessões técnicas e planos de desenvolvimento.',
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
