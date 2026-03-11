import React, { useEffect, useMemo, useState } from 'react';
import { FileSearch, FileText } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import EmptyState from '@/components/ui/EmptyState';
import PanelState from '@/components/ui/PanelState';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { getApiBaseUrl } from '@/lib/apiClient';
import { buildAssessmentResultPath } from '@/modules/assessmentResult/routes';
import { downloadPdfBlob, exportAssessmentReportPdf } from '@/modules/reportExport';
import {
  buildAssessmentReportViewModel,
  loadAssessmentReportData,
  REPORT_LOAD_STATE,
} from '@/modules/reports';
import {
  BehavioralReadingsSection,
  CombinationAnalysisSection,
  DevelopmentSection,
  ExecutiveSummarySection,
  FactorAnalysisSection,
  LeadershipInsightsSection,
  ReportHeroSection,
  ReportOverviewSection,
  StrengthsAttentionSection,
  TechnicalSummarySection,
} from '@/modules/reports/sections';

const SECTION_LINKS = [
  { href: '#overview', label: 'Visão geral' },
  { href: '#executive-summary', label: 'Resumo executivo' },
  { href: '#strengths-attention', label: 'Forças e atenção' },
  { href: '#behavioral-readings', label: 'Leituras comportamentais' },
  { href: '#leadership-insights', label: 'Liderança' },
  { href: '#factor-analysis', label: 'Fatores DISC' },
  { href: '#combination-analysis', label: 'Combinação' },
  { href: '#development', label: 'Desenvolvimento' },
  { href: '#technical-summary', label: 'Resumo técnico' },
];

export default function AssessmentReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { access: authAccess } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [loadState, setLoadState] = useState({
    status: REPORT_LOAD_STATE.LOADING,
    assessment: null,
    message: '',
  });
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoadState({ status: REPORT_LOAD_STATE.LOADING, assessment: null, message: '' });
      const result = await loadAssessmentReportData({
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

  const viewModel = useMemo(
    () => buildAssessmentReportViewModel(loadState.assessment || {}, { assessmentId: id }),
    [id, loadState.assessment]
  );

  const reportIdentity = viewModel?.identity || { id: '' };
  const resultHref = buildAssessmentResultPath(reportIdentity.id || id);
  const compareHref = reportIdentity.id
    ? `/compare-profiles?assessmentId=${encodeURIComponent(reportIdentity.id)}`
    : '/compare-profiles';

  const handleExportPdf = async () => {
    const assessmentId = String(reportIdentity.id || id || '').trim();
    if (!assessmentId) {
      setExportError('Não foi possível exportar: ID da avaliação indisponível.');
      return;
    }

    setIsExportingPdf(true);
    setExportError('');

    try {
      const payload = await exportAssessmentReportPdf({
        assessmentId,
        apiBaseUrl,
      });
      downloadPdfBlob(payload.blob, payload.fileName);
      toast({
        title: 'PDF gerado com sucesso',
        description: `Download iniciado (${(payload.bytes / 1024).toFixed(1)} KB).`,
      });
    } catch (error) {
      const message =
        error?.message ||
        'Não foi possível exportar o PDF do relatório oficial no momento.';
      setExportError(message);
      toast({
        title: 'Falha na exportação',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (loadState.status === REPORT_LOAD_STATE.LOADING) {
    return (
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 space-y-4 sm:px-6 sm:py-8">
        <PanelState
          type="loading"
          title="Carregando relatório oficial"
          description="Estamos estruturando a leitura comportamental completa da avaliação DISC."
        />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    );
  }

  if (loadState.status === REPORT_LOAD_STATE.FORBIDDEN) {
    return (
      <div className="w-full min-w-0 max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <PanelState
          type="error"
          title="Sem permissão para abrir este relatório"
          description={
            loadState.message ||
            'Sua conta não possui acesso para esta avaliação. Verifique permissões ou abra outro relatório.'
          }
          ctaLabel="Voltar ao painel"
          onCtaClick={() => navigate('/painel')}
        />
      </div>
    );
  }

  if (loadState.status === REPORT_LOAD_STATE.NOT_FOUND) {
    return (
      <div className="w-full min-w-0 max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <EmptyState
          icon={FileSearch}
          title="Relatório oficial não encontrado"
          description={
            loadState.message ||
            'Não localizamos dados suficientes para gerar o relatório desta avaliação. Verifique o ID e tente novamente.'
          }
          ctaLabel="Voltar ao painel"
          onCtaClick={() => navigate('/painel')}
          tone="soft"
        />
      </div>
    );
  }

  if (loadState.status === REPORT_LOAD_STATE.ERROR) {
    return (
      <div className="w-full min-w-0 max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <PanelState
          type="error"
          title="Falha ao carregar relatório"
          description={loadState.message || 'Tente novamente em alguns instantes.'}
          ctaLabel="Tentar novamente"
          onCtaClick={() => navigate(`/assessments/${encodeURIComponent(id || '')}/report`)}
        />
      </div>
    );
  }

  return (
    <div
      className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8"
      data-testid="assessment-report-page"
    >
      <ReportHeroSection
        identity={viewModel.identity}
        interpretation={viewModel.interpretation}
        resultHref={resultHref}
        compareHref={compareHref}
        onBack={() => navigate('/painel')}
        onExportPdf={() => void handleExportPdf()}
        isExportingPdf={isExportingPdf}
        exportDisabled={!apiBaseUrl}
        sectionLinks={SECTION_LINKS}
      />

      {exportError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {exportError}
        </p>
      ) : null}

      {!viewModel.discSnapshot?.hasValidScores ? (
        <PanelState
          title="Scores DISC incompletos"
          description="A leitura textual foi gerada com amostra reduzida. Novas avaliações refinam precisão e comparabilidade do relatório."
        />
      ) : null}

      <ReportOverviewSection
        interpretation={viewModel.interpretation}
        discSnapshot={viewModel.discSnapshot}
      />

      <ExecutiveSummarySection executiveSummary={viewModel.executiveSummary} />

      <StrengthsAttentionSection
        strengths={viewModel.strengths}
        attentionPoints={viewModel.attentionPoints}
        potentialChallenges={viewModel.potentialChallenges}
      />

      <BehavioralReadingsSection interpretation={viewModel.interpretation} />

      <LeadershipInsightsSection leadershipInsights={viewModel.leadershipInsights} />

      <FactorAnalysisSection factorAnalysis={viewModel.factorAnalysis} />

      <CombinationAnalysisSection
        interpretation={viewModel.interpretation}
        archetype={viewModel.archetype}
        strengths={viewModel.strengths}
        attentionPoints={viewModel.attentionPoints}
        potentialChallenges={viewModel.potentialChallenges}
      />

      <DevelopmentSection
        developmentRecommendations={viewModel.developmentRecommendations}
        attentionPoints={viewModel.attentionPoints}
        nextSteps={viewModel.nextSteps}
      />

      <TechnicalSummarySection
        technical={viewModel.technical}
        identity={viewModel.identity}
      />

      {!apiBaseUrl ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-sm text-amber-900">
          <p className="font-semibold">Exportação PDF indisponível neste ambiente</p>
          <p className="mt-1">
            Configure a API para habilitar a geração profissional de PDF via backend.
          </p>
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => navigate(resultHref)}
          className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-700"
        >
          <FileText className="mr-2 h-4 w-4" />
          Voltar ao resultado oficial
        </button>
      </div>
    </div>
  );
}
