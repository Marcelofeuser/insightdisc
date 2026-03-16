import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, Compass, FileText, Sparkles, Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DashboardHero from '@/modules/dashboard/components/DashboardHero';
import ActivityFeedPanel from '@/modules/dashboard/components/ActivityFeedPanel';
import { DiscRadarChart } from '@/modules/analytics/components';
import { DashboardErrorState, DashboardLoadingState } from '@/modules/dashboard/components/DashboardStates';
import { dashboardFactorLabels, useDashboardData } from '@/modules/dashboard/useDashboardData';
import { buildDiscInterpretation } from '@/modules/discEngine';
import { getApiBaseUrl } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { startSelfAssessment } from '@/utils/assessmentFlow';

export default function UserDashboardV2() {
  const navigate = useNavigate();
  const { access, user } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const data = useDashboardData({ access, user });
  const personalProfile = data.latestIndividualSummary || data.distribution || {};
  const interpretation = useMemo(
    () => buildDiscInterpretation(personalProfile, { context: 'personal_dashboard', detailLevel: 'long' }),
    [personalProfile],
  );
  const dominantFactor = interpretation?.primaryFactor || data.predominantFactor || 'D';

  const cards = useMemo(
    () => [
      {
        title: 'Meu perfil',
        value: `${interpretation?.profileCode || dominantFactor} • ${interpretation?.styleLabel || dashboardFactorLabels[dominantFactor] || 'DISC'}`,
        icon: Sparkles,
      },
      {
        title: 'Meu relatório',
        value: `${data.kpis.reportsGenerated} relatório${data.kpis.reportsGenerated === 1 ? '' : 's'} disponível${data.kpis.reportsGenerated === 1 ? '' : 'is'}`,
        icon: FileText,
      },
      {
        title: 'Pontos fortes',
        value: interpretation?.strengths?.[0] || 'Consolide avaliações para habilitar leitura mais personalizada.',
        icon: TrendingUp,
      },
      {
        title: 'Pontos de atenção',
        value: interpretation?.attentionPoints?.[0] || 'Sem pontos de atenção prioritários no momento.',
        icon: Target,
      },
      {
        title: 'Ambiente ideal',
        value: interpretation?.idealEnvironment || 'Ambiente em mapeamento com base nos seus dados DISC.',
        icon: Compass,
      },
      {
        title: 'Desenvolvimento',
        value: interpretation?.developmentRecommendations?.[0] || 'Conclua uma nova avaliação para ampliar recomendações.',
        icon: BookOpen,
      },
    ],
    [data.kpis.reportsGenerated, dominantFactor, interpretation]
  );

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);
    setErrorMessage('');
    try {
      await startSelfAssessment({
        apiBaseUrl,
        navigate,
        access,
        source: 'dashboard-personal-v2',
      });
    } catch (error) {
      setErrorMessage(error?.payload?.message || error?.message || 'Não foi possível iniciar agora.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8" data-testid="dashboard-personal-v2">
      <DashboardHero
        label="Meu Painel"
        title="Autoconhecimento com clareza e próximos passos"
        subtitle="Acompanhe seu perfil DISC, consulte seu relatório e avance com recomendações práticas de desenvolvimento."
        actions={(
          <>
            <Link to="/MyAssessments">
              <Button className="bg-indigo-600 hover:bg-indigo-700">Ver meu perfil</Button>
            </Link>
            <Link to="/MyAssessments">
              <Button variant="outline">Meu relatório</Button>
            </Link>
            <Link to="/painel/meu-desenvolvimento">
              <Button variant="outline">Meu desenvolvimento</Button>
            </Link>
          </>
        )}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">Resumo principal</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              Perfil predominante: {interpretation?.profileCode || dominantFactor} • {interpretation?.styleLabel || dashboardFactorLabels[dominantFactor] || 'DISC'}
            </h3>
            <p className="mt-2 text-sm text-slate-600">{interpretation?.summaryShort || 'Leitura comportamental em consolidação.'}</p>
          </div>

          <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleStart} disabled={isStarting}>
            {isStarting ? 'Iniciando...' : 'Nova avaliação'}
          </Button>
        </div>

      {errorMessage ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      ) : null}
      </section>

      {data.error ? <DashboardErrorState message={data.error?.message} /> : null}

      {data.isLoading ? (
        <DashboardLoadingState
          title="Carregando seu painel pessoal"
          description="Estamos preparando sua leitura comportamental e histórico mais recente."
        />
      ) : (
        <>
          <section className="grid gap-4 lg:grid-cols-2">
            <DiscRadarChart
              title="Radar do meu perfil"
              subtitle="Leitura do seu padrão comportamental mais recente."
              profile={personalProfile}
              emptyMessage="Finalize sua avaliação para visualizar seu radar individual."
            />

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900">Leitura rápida do estilo predominante</h3>
              <p className="mt-1 text-sm text-slate-600">
                Interpretação direta para aplicar seu perfil em comunicação, rotina e desenvolvimento.
              </p>

              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Estilo principal</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {interpretation?.profileCode || dominantFactor} • {interpretation?.styleLabel || dashboardFactorLabels[dominantFactor] || 'DISC'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Resumo comportamental</p>
                  <p className="mt-1 text-sm text-slate-700">{interpretation?.summaryMedium || interpretation?.summaryShort}</p>
                </div>

                <div className="rounded-xl border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-slate-500">Foco de evolução</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {interpretation?.developmentRecommendations?.[0] || 'Mantenha ciclos curtos de feedback para calibrar seu estilo.'}
                  </p>
                </div>
              </div>
            </section>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 text-slate-900">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <Icon className="h-4 w-4" />
                    </span>
                    <h4 className="text-sm font-semibold">{card.title}</h4>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{card.value}</p>
                </article>
              );
            })}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Próximos passos de desenvolvimento</h3>
            <p className="mt-1 text-sm text-slate-600">
              Uma trilha simples para transformar seu perfil em ações práticas no dia a dia.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                1. Escolha um comportamento para fortalecer nesta semana.
              </div>
              <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                2. Defina um indicador simples para observar evolução.
              </div>
              <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                3. Peça feedback de uma pessoa de confiança sobre sua comunicação.
              </div>
              <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-700">
                4. Revise seu progresso após 30 dias e ajuste o plano.
              </div>
            </div>
          </section>

          <ActivityFeedPanel
            title="Histórico pessoal"
            subtitle="Suas avaliações e relatórios mais recentes para acompanhar sua evolução."
            items={data.activity}
          />
        </>
      )}
    </div>
  );
}
