import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileBarChart2, RefreshCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import PanelState from '@/components/ui/PanelState';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest, getApiBaseUrl } from '@/lib/apiClient';
import { UpgradePrompt, useFeatureAccess } from '@/modules/billing';
import {
  BehaviorAnalyticsExecutivePanel,
  BenchmarkPanel,
  BehaviorHistoryPanel,
  buildBehaviorAnalytics,
} from '@/modules/behaviorAnalytics';
import { mapCandidateReports } from '@/modules/report/backendReports';
import { exportOrganizationReportPdf } from '@/modules/reportExport';
import {
  buildLocalTeamMapFromAssessments,
  buildTeamIntelligence,
} from '@/modules/teamIntelligence/engine';

function mapFallbackReport(item = {}) {
  const summary = item?.disc?.summary || item?.disc_results?.summary || item?.results?.summary_profile || {};
  return {
    assessmentId: String(item?.assessmentId || item?.id || item?.reportId || ''),
    candidateName: item?.candidateName || item?.respondent_name || item?.name || 'Participante',
    candidateEmail: item?.candidateEmail || item?.email || '',
    completedAt: item?.completedAt || item?.createdAt || item?.created_date || '',
    dominantFactor: item?.dominantFactor || item?.results?.dominant_factor || '',
    profileCode: item?.profileCode || item?.disc_profile?.profileKey || '',
    disc: summary,
  };
}

export default function OrganizationalReport() {
  const { toast } = useToast();
  const { checkFeature, featureKeys } = useFeatureAccess();
  const reportAccess = checkFeature(featureKeys.ORGANIZATIONAL_REPORT);
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setIsLoading(true);
      setError('');
      try {
        if (!getApiBaseUrl()) {
          const localRows = await base44.entities.Assessment.list('-created_date', 120);
          if (!mounted) return;
          const mapped = (Array.isArray(localRows) ? localRows : []).map(mapFallbackReport);
          setAssessments(mapped);
          return;
        }

        const payload = await apiRequest('/api/team-map/assessments', {
          method: 'GET',
          requireAuth: true,
        });
        if (!mounted) return;
        setAssessments(Array.isArray(payload?.assessments) ? payload.assessments : []);
      } catch (apiError) {
        try {
          const fallback = await apiRequest('/candidate/me/reports', {
            method: 'GET',
            requireAuth: true,
          });
          if (!mounted) return;
          const reports = mapCandidateReports(fallback?.reports || []).map(mapFallbackReport);
          setAssessments(reports);
        } catch (fallbackError) {
          const fallbackCode = String(
            fallbackError?.message || fallbackError?.payload?.error || '',
          ).toUpperCase();
          if (fallbackCode.includes('API_AUTH_MISSING') || fallbackCode.includes('API_BASE_URL_NOT_CONFIGURED')) {
            try {
              const localRows = await base44.entities.Assessment.list('-created_date', 120);
              if (!mounted) return;
              const mapped = (Array.isArray(localRows) ? localRows : []).map(mapFallbackReport);
              setAssessments(mapped);
              return;
            } catch {
              // ignore and keep error below
            }
          }

          if (!mounted) return;
          setError(fallbackError?.message || apiError?.message || 'Falha ao carregar base organizacional.');
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    run();
    return () => {
      mounted = false;
    };
  }, []);

  const selectedIds = useMemo(
    () => assessments.slice(0, 60).map((item) => String(item?.assessmentId || '').trim()).filter(Boolean),
    [assessments],
  );
  const teamMap = useMemo(
    () => buildLocalTeamMapFromAssessments(assessments, selectedIds),
    [assessments, selectedIds],
  );
  const intelligence = useMemo(
    () => buildTeamIntelligence(teamMap || {}),
    [teamMap],
  );
  const analytics = useMemo(() => {
    const history = (intelligence?.members || []).map((member) => ({
      id: member.assessmentId,
      date: member.createdAt,
      profileCode: member.profileCode,
      scores: member.scores,
    }));
    return buildBehaviorAnalytics({
      members: intelligence?.members || [],
      history,
    });
  }, [intelligence]);

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      await exportOrganizationReportPdf({
        title: 'InsightDISC • Relatório Executivo Organizacional',
        companyName: 'Organização',
        executiveSummary: analytics?.executiveSummary,
        distribution: analytics?.distribution,
        dimensions: analytics?.dimensions,
        insights: intelligence?.insights || [],
        risks: intelligence?.balanceIntelligence?.teamRisks || [],
        recommendations: [
          ...(intelligence?.gaps?.opportunities || []),
          ...(intelligence?.balanceIntelligence?.autoCompositionRecommendations || []),
        ],
      });
      toast({
        title: 'PDF executivo gerado',
        description: 'Download iniciado com sucesso.',
      });
    } catch (exportError) {
      toast({
        title: 'Falha ao exportar',
        description: exportError?.message || 'Não foi possível gerar o PDF executivo.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  if (!reportAccess.allowed) {
    return (
      <div className="w-full min-w-0 max-w-4xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8">
        <UpgradePrompt
          title="Relatório executivo organizacional bloqueado"
          description="Este recurso esta disponivel a partir do plano Business para operacoes de lideranca e RH."
          requiredPlanLabel="Business"
          ctaLabel="Desbloquear relatório"
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <PanelState
          type="loading"
          title="Carregando relatório organizacional"
          description="Consolidando indicadores comportamentais de equipe."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <PanelState
          type="error"
          title="Falha no relatório organizacional"
          description={error}
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-indigo-700">
              Relatório organizacional
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
              Relatório Executivo de Empresa
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Cultura comportamental, riscos de liderança, equilíbrio de equipe e recomendações estratégicas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.location.reload()}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => void handleExportPdf()}
              disabled={isExporting}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Gerando PDF...' : 'Exportar PDF executivo'}
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Amostra</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{analytics.sampleSize}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Predominância</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{intelligence.predominantFactor}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Equilíbrio</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{intelligence.balance?.level || '-'}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Riscos críticos</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {(intelligence.balanceIntelligence?.teamRisks || []).length}
          </p>
        </article>
      </section>

      <BehaviorAnalyticsExecutivePanel analytics={analytics} />
      <section className="grid gap-4 xl:grid-cols-2">
        <BenchmarkPanel benchmarkComparison={analytics.benchmarkComparison} />
        <BehaviorHistoryPanel evolution={analytics.evolution} />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
          <FileBarChart2 className="h-4 w-4 text-indigo-600" />
          Recomendações estratégicas
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {(intelligence.balanceIntelligence?.autoCompositionRecommendations || []).slice(0, 6).map((item) => (
            <article key={item} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-700">
              {item}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
