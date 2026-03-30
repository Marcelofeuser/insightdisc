import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileText, Radar, Share2, ShieldCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/ui/EmptyState';
import PanelShell from '@/components/ui/PanelShell';
import PanelState from '@/components/ui/PanelState';
import SectionHeader from '@/components/ui/SectionHeader';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import {
  canViewReport,
  createAccessContext,
} from '@/modules/auth/access-control';
import { DiscRadarChart } from '@/modules/analytics/components';
import { recordBehaviorHistoryEntry } from '@/modules/behaviorAnalytics';
import {
  BehavioralReadingsGrid,
  DevelopmentPanel,
  DiscScoreSummary,
  ResultHero,
  StrengthsAttentionPanels,
  TechnicalProfilePanel,
} from '@/modules/assessmentResult/components';
import {
  resolveAssessmentDiscSnapshot,
  resolveAssessmentIdentity,
} from '@/modules/assessmentResult/assessmentResultData';
import { buildAssessmentResultPath } from '@/modules/assessmentResult/routes';
import { buildAssessmentReportPath } from '@/modules/reports/routes';
import { buildDiscInterpretation } from '@/modules/discEngine';
import { buildDevelopmentPlan3090, DevelopmentPlanPanel } from '@/modules/developmentPlan';
import { buildLeadershipInsights } from '@/modules/leadershipInsights';
import { findCandidateReportByIdentifier, mapCandidateReports } from '@/modules/report/backendReports';
import { markCheckoutPreviewSeen } from '@/modules/checkout/funnel';

const RESULT_STATE = Object.freeze({
  LOADING: 'loading',
  READY: 'ready',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  ERROR: 'error',
});

function mapReportDataPayload(payload = {}, assessmentId = '') {
  const reportItem =
    payload?.reportItem ||
    (payload?.assessment?.id
      ? {
          assessmentId: payload.assessment.id,
          reportId: payload?.report?.id || '',
          candidateUserId: payload?.assessment?.candidateUserId || '',
          candidateName: payload?.assessment?.candidateName || '',
          candidateEmail: payload?.assessment?.candidateEmail || '',
          createdAt: payload?.assessment?.createdAt || null,
          completedAt: payload?.assessment?.completedAt || null,
          pdfUrl: payload?.report?.pdfUrl || '',
          discProfile: payload?.report?.discProfile || null,
        }
      : null);

  if (!reportItem) return null;

  const mappedReports = mapCandidateReports([reportItem]);
  return findCandidateReportByIdentifier(mappedReports, assessmentId) || mappedReports[0] || null;
}

async function loadAssessmentResult({
  assessmentId,
  apiBaseUrl,
  authAccess,
}) {
  const trimmedId = String(assessmentId || '').trim();
  if (!trimmedId) {
    return { status: RESULT_STATE.NOT_FOUND, message: 'ID da avaliação não informado.' };
  }

  if (apiBaseUrl) {
    const hasApiSession = Boolean(getApiToken() || authAccess?.email);

    if (hasApiSession) {
      try {
        const payload = await apiRequest(`/assessment/report-data?id=${encodeURIComponent(trimmedId)}`, {
          method: 'GET',
          requireAuth: true,
        });
        const assessment = mapReportDataPayload(payload, trimmedId);
        if (assessment) {
          return { status: RESULT_STATE.READY, assessment };
        }
      } catch (error) {
        const status = Number(error?.status);
        if ((status === 401 || status === 403) && !base44?.__isMock) {
          return {
            status: RESULT_STATE.FORBIDDEN,
            message: 'Sem permissão para visualizar este resultado.',
          };
        }
      }

      try {
        const payload = await apiRequest('/candidate/me/reports', {
          method: 'GET',
          requireAuth: true,
        });
        const reports = mapCandidateReports(payload?.reports || []);
        const assessment = findCandidateReportByIdentifier(reports, trimmedId);
        if (assessment) {
          return { status: RESULT_STATE.READY, assessment };
        }
      } catch (error) {
        const status = Number(error?.status);
        if ((status === 401 || status === 403) && !base44?.__isMock) {
          return {
            status: RESULT_STATE.FORBIDDEN,
            message: 'Sem permissão para visualizar este resultado.',
          };
        }
      }
    }

    if (!base44?.__isMock) {
      return {
        status: RESULT_STATE.NOT_FOUND,
        message: 'Resultado não encontrado na base atual.',
      };
    }
  }

  try {
    const records = await base44.entities.Assessment.filter({ id: trimmedId });
    if (records.length > 0) {
      const assessment = records[0];
      const fallbackUser = authAccess?.userId ? null : await base44.auth.me().catch(() => null);
      const accessContext = authAccess?.userId ? authAccess : createAccessContext(fallbackUser);
      const requiresPro = Boolean(assessment?.type === 'premium' || assessment?.report_unlocked);

      if (!canViewReport(accessContext, assessment, { requiresPro })) {
        return {
          status: RESULT_STATE.FORBIDDEN,
          message: 'Sem permissão para visualizar este resultado.',
        };
      }

      return { status: RESULT_STATE.READY, assessment };
    }
  } catch (error) {
    return {
      status: RESULT_STATE.ERROR,
      message: error?.message || 'Falha ao carregar avaliação.',
    };
  }

  return { status: RESULT_STATE.NOT_FOUND, message: 'Resultado não encontrado para o ID informado.' };
}

export default function AssessmentResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { access: authAccess } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [loadState, setLoadState] = useState({
    status: RESULT_STATE.LOADING,
    assessment: null,
    message: '',
  });

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoadState({ status: RESULT_STATE.LOADING, assessment: null, message: '' });
      const result = await loadAssessmentResult({
        assessmentId: id,
        apiBaseUrl,
        authAccess,
      });

      if (!cancelled) {
        setLoadState({
          status: result.status,
          assessment: result.assessment || null,
          message: result.message || '',
        });
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, authAccess, id]);

  const identity = useMemo(
    () => resolveAssessmentIdentity(loadState.assessment || {}, id),
    [id, loadState.assessment]
  );

  const discSnapshot = useMemo(
    () => resolveAssessmentDiscSnapshot(loadState.assessment || {}),
    [loadState.assessment]
  );

  const interpretation = useMemo(
    () =>
      buildDiscInterpretation(discSnapshot?.summary || {}, {
        context: 'assessment_result_page',
        detailLevel: 'long',
      }),
    [discSnapshot?.summary]
  );
  const leadershipInsights = useMemo(
    () =>
      buildLeadershipInsights(discSnapshot?.summary || {}, {
        context: 'assessment_result_leadership',
        detailLevel: 'short',
      }),
    [discSnapshot?.summary]
  );
  const developmentPlan = useMemo(
    () => buildDevelopmentPlan3090(interpretation, discSnapshot?.summary || {}),
    [discSnapshot?.summary, interpretation],
  );

  useEffect(() => {
    if (loadState.status !== RESULT_STATE.READY) return;
    if (!identity?.id || !discSnapshot?.hasValidScores) return;
    const scope = authAccess?.userId || authAccess?.email || 'global';
    recordBehaviorHistoryEntry(scope, {
      id: identity.id,
      date: identity.completedAt || new Date().toISOString(),
      profileCode: interpretation?.profileCode,
      scores: discSnapshot.summary || {},
    });
  }, [
    authAccess?.email,
    authAccess?.userId,
    discSnapshot?.hasValidScores,
    discSnapshot?.summary,
    identity?.completedAt,
    identity?.id,
    interpretation?.profileCode,
    loadState.status,
  ]);

  useEffect(() => {
    if (loadState.status !== RESULT_STATE.READY) return;
    if (!identity?.id || !discSnapshot?.hasValidScores) return;

    markCheckoutPreviewSeen({
      source: 'assessment_result',
      assessmentId: String(identity.id || '').trim(),
      reportType: 'premium',
    });
  }, [discSnapshot?.hasValidScores, identity?.id, loadState.status]);

  const reportHref = identity.id ? buildAssessmentReportPath(identity.id) : '/MyAssessments';
  const compareHref = identity.id
    ? `/compare-profiles?assessmentId=${encodeURIComponent(identity.id)}`
    : '/compare-profiles';

  if (loadState.status === RESULT_STATE.LOADING) {
    return (
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 space-y-4 sm:px-6 sm:py-8">
        <PanelState
          type="loading"
          title="Carregando resultado oficial"
          description="Estamos preparando a leitura comportamental estruturada da avaliação."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  if (loadState.status === RESULT_STATE.FORBIDDEN) {
    return (
      <div className="w-full min-w-0 max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <PanelState
          type="error"
          title="Sem permissão para abrir este resultado"
          description={
            loadState.message ||
            'Sua conta não possui acesso para esta avaliação. Verifique permissões ou abra outro resultado.'
          }
          ctaLabel="Voltar ao painel"
          onCtaClick={() => navigate('/painel')}
        />
      </div>
    );
  }

  if (loadState.status === RESULT_STATE.NOT_FOUND) {
    return (
      <div className="w-full min-w-0 max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <EmptyState
          icon={FileText}
          title="Resultado oficial não encontrado"
          description={
            loadState.message ||
            'Não localizamos dados suficientes para esta avaliação. Verifique o ID e tente novamente.'
          }
          ctaLabel="Voltar ao painel"
          onCtaClick={() => navigate('/painel')}
          tone="soft"
        />
      </div>
    );
  }

  if (loadState.status === RESULT_STATE.ERROR) {
    return (
      <div className="w-full min-w-0 max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <PanelState
          type="error"
          title="Falha ao carregar resultado"
          description={loadState.message || 'Tente novamente em alguns instantes.'}
          ctaLabel="Tentar novamente"
          onCtaClick={() => navigate(buildAssessmentResultPath(id))}
        />
      </div>
    );
  }

  return (
    <div
      className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8"
      data-testid="assessment-result-page"
    >
      <ResultHero
        interpretation={interpretation}
        respondentName={identity.respondentName}
        completedAt={identity.completedAt}
        actions={
          <>
            <Button variant="outline" onClick={() => navigate('/painel')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao painel
            </Button>
            <Link to={compareHref}>
              <Button variant="outline">
                <Radar className="mr-2 h-4 w-4" />
                Comparar perfil
              </Button>
            </Link>
            <Link to={reportHref}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <FileText className="mr-2 h-4 w-4" />
                Ver relatório
              </Button>
            </Link>
            <Button variant="outline" disabled>
              <Share2 className="mr-2 h-4 w-4" />
              Compartilhar (em breve)
            </Button>
          </>
        }
      />

      {!discSnapshot.hasValidScores ? (
        <PanelState
          title="Scores DISC incompletos"
          description="A leitura textual foi gerada com amostra reduzida. Novas avaliações refinam precisão e comparabilidade."
        />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        <DiscRadarChart
          title="Radar comportamental"
          subtitle="Intensidade dos fatores D, I, S e C para leitura rápida do perfil."
          profile={discSnapshot.summary || {}}
          emptyMessage="Conclua uma avaliação com scores DISC válidos para habilitar o radar."
        />

        <PanelShell>
          <SectionHeader
            icon={Radar}
            title="Visão geral do perfil"
            subtitle="Distribuição dos fatores e leitura resumida do estilo predominante."
          />
          <div className="mt-4">
            <DiscScoreSummary
              scores={discSnapshot.summary || {}}
              primaryFactor={interpretation?.primaryFactor}
              secondaryFactor={interpretation?.secondaryFactor}
            />
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Resumo comportamental
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {interpretation?.summaryMedium || interpretation?.summaryShort}
            </p>
          </div>
        </PanelShell>
      </section>

      <StrengthsAttentionPanels
        strengths={interpretation?.strengths || []}
        attentionPoints={interpretation?.attentionPoints || []}
      />

      <BehavioralReadingsGrid interpretation={interpretation} />

      <PanelShell>
        <SectionHeader
          icon={ShieldCheck}
          title="Inteligência de liderança"
          subtitle="Leitura automática do estilo de liderança, decisão e gestão de equipe para aplicação prática."
        />
        <p className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-sm text-indigo-900">
          {leadershipInsights?.summaryMedium || 'Sem leitura de liderança disponível no momento.'}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Riscos de liderança</h3>
            {(leadershipInsights?.leadershipRisks || []).length ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {leadershipInsights.leadershipRisks.slice(0, 3).map((item) => (
                  <li key={item} className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Sem riscos críticos de liderança mapeados.</p>
            )}
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Como liderar melhor</h3>
            {(leadershipInsights?.recommendations || []).length ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {leadershipInsights.recommendations.slice(0, 3).map((item) => (
                  <li key={item} className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Sem recomendações adicionais no momento.</p>
            )}
          </article>
        </div>
      </PanelShell>

      <DevelopmentPanel
        summaryLong={interpretation?.summaryLong}
        learningStyle={interpretation?.learningStyle}
        developmentRecommendations={interpretation?.developmentRecommendations || []}
        adaptationNotes={interpretation?.adaptationNotes || []}
      />

      <DevelopmentPlanPanel plan={developmentPlan} />

      <TechnicalProfilePanel
        interpretation={interpretation}
        scores={discSnapshot.summary || {}}
      />
    </div>
  );
}
