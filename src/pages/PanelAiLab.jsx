import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/ui/EmptyState';
import PanelState from '@/components/ui/PanelState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { mapCandidateReports } from '@/modules/report/backendReports';
import {
  buildCoachReportContext,
  formatReportTypeLabel,
  normalizeCoachReportItem,
} from '@/modules/coach/reportContext';

const FOCUS_OPTIONS = [
  {
    key: 'leadership',
    label: 'Liderança e delegação',
    description: 'Entenda como conduzir decisões, prioridades e delegação para este perfil.',
  },
  {
    key: 'communication',
    label: 'Comunicação e feedback',
    description: 'Mapeie ajustes de linguagem, ritmo e estilo de feedback para melhor adesão.',
  },
  {
    key: 'development',
    label: 'Plano de desenvolvimento',
    description: 'Identifique ações práticas para evolução comportamental sustentável.',
  },
  {
    key: 'pressure',
    label: 'Risco sob pressão',
    description: 'Antecipe gatilhos de estresse e estratégias de prevenção no contexto real.',
  },
];

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
}

function normalizeList(value = []) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 6);
}

function buildFocusNote(focusKey = '') {
  if (focusKey === 'leadership') {
    return 'Enfoque aplicado em liderança, tomada de decisão e alinhamento de execução.';
  }
  if (focusKey === 'communication') {
    return 'Enfoque aplicado em comunicação, influência e qualidade de feedback.';
  }
  if (focusKey === 'development') {
    return 'Enfoque aplicado em desenvolvimento comportamental e ações de melhoria contínua.';
  }
  if (focusKey === 'pressure') {
    return 'Enfoque aplicado em riscos sob pressão, prevenção de ruído e estabilidade operacional.';
  }
  return '';
}

async function loadLocalReports(access = {}) {
  if (access?.tenantId) {
    const items = await base44.entities.Assessment.filter({ workspace_id: access.tenantId }, '-created_date', 240);
    return items
      .filter((item) => String(item?.status || '').toLowerCase() === 'completed' || item?.report_id || item?.hasReport)
      .map(normalizeCoachReportItem);
  }

  const byUserId = access?.userId
    ? await base44.entities.Assessment.filter({ user_id: access.userId }, '-created_date', 240)
    : [];
  const byEmail = access?.email
    ? await base44.entities.Assessment.filter({ user_id: access.email }, '-created_date', 240)
    : [];

  const merged = [...byUserId, ...byEmail].map(normalizeCoachReportItem);
  const seen = new Set();
  return merged.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default function PanelAiLab() {
  const { access } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [selectedReportId, setSelectedReportId] = useState('');
  const [focusKey, setFocusKey] = useState(FOCUS_OPTIONS[0].key);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [analysis, setAnalysis] = useState(null);

  const reportsQuery = useQuery({
    queryKey: ['panel-ai-lab-reports', apiBaseUrl, access?.tenantId, access?.userId, access?.email],
    enabled: Boolean(access?.userId || access?.email),
    queryFn: async () => {
      if (apiBaseUrl && getApiToken()) {
        const payload = await apiRequest('/candidate/me/reports', {
          method: 'GET',
          requireAuth: true,
        });
        return mapCandidateReports(payload?.reports || []).map(normalizeCoachReportItem);
      }

      if (base44?.__isMock) {
        return loadLocalReports(access);
      }

      return [];
    },
  });

  const reports = useMemo(() => {
    return [...(reportsQuery.data || [])]
      .filter((item) => Boolean(item?.assessmentId || item?.id))
      .sort((left, right) => new Date(right?.completedAt || 0).getTime() - new Date(left?.completedAt || 0).getTime());
  }, [reportsQuery.data]);

  useEffect(() => {
    if (selectedReportId || !reports.length) return;
    setSelectedReportId(reports[0].id);
  }, [reports, selectedReportId]);

  const selectedReport = useMemo(
    () => reports.find((item) => item.id === selectedReportId) || null,
    [reports, selectedReportId],
  );

  const selectedContext = useMemo(
    () => (selectedReport ? buildCoachReportContext(selectedReport) : null),
    [selectedReport],
  );

  const currentFocus = useMemo(
    () => FOCUS_OPTIONS.find((item) => item.key === focusKey) || FOCUS_OPTIONS[0],
    [focusKey],
  );

  const handleGenerate = async () => {
    if (!selectedContext || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage('');

    try {
      const payload = await apiRequest('/ai/report-preview', {
        method: 'POST',
        requireAuth: true,
        body: {
          mode: selectedContext.reportType,
          nome: selectedContext.respondentName,
          cargo: '',
          empresa: '',
          D: selectedContext.scores.D,
          I: selectedContext.scores.I,
          S: selectedContext.scores.S,
          C: selectedContext.scores.C,
          includeMeta: true,
        },
      });

      const preview = payload?.preview || payload?.content || {};
      setAnalysis({
        generatedAt: new Date().toISOString(),
        provider: String(payload?.provider || '').trim(),
        model: String(payload?.model || '').trim(),
        source: String(payload?.source || '').trim(),
        focus: currentFocus,
        focusNote: buildFocusNote(currentFocus.key),
        summary: String(preview?.summary || preview?.executiveSummary || '').trim(),
        strengths: normalizeList(preview?.strengths),
        limitations: normalizeList(preview?.limitations),
        developmentRecommendations: normalizeList(preview?.developmentRecommendations),
      });
    } catch (error) {
      setErrorMessage(error?.message || 'Não foi possível gerar análise no AI Lab agora.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8" data-testid="panel-ai-lab-page">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">AI Lab</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Laboratório aplicado aos relatórios</h1>
        <p className="mt-2 text-sm text-slate-600">
          Selecione um relatório concluído e gere leituras de IA orientadas por contexto real do perfil DISC.
        </p>
      </section>

      {reportsQuery.isLoading ? (
        <PanelState title="Carregando relatórios" description="Buscando base para o AI Lab." />
      ) : reportsQuery.isError ? (
        <PanelState
          type="error"
          title="Falha ao carregar relatórios"
          description="Não foi possível carregar relatórios para o AI Lab neste momento."
        />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Sem relatórios disponíveis"
          description="Conclua avaliações para liberar análises contextuais no AI Lab."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">1. Relatório base</h2>
            <p className="mt-1 text-xs text-slate-500">Escolha o relatório que será usado como referência da análise.</p>

            <div className="mt-3 space-y-2">
              {reports.map((report) => {
                const isSelected = report.id === selectedReportId;
                return (
                  <button
                    key={report.id}
                    type="button"
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? 'border-indigo-300 bg-indigo-50/70'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                    onClick={() => setSelectedReportId(report.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{report.respondentName}</p>
                      <Badge variant="outline">Perfil {report.profileCode || report.dominantFactor}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">
                      {report.candidateEmail || '-'} • {formatDate(report.completedAt)} • {formatReportTypeLabel(report.reportType)}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {selectedContext ? (
              <>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">2. Objetivo da análise</p>
                  <p className="mt-2 text-sm text-slate-700">
                    Base atual: <strong>{selectedContext.respondentName}</strong> • {formatReportTypeLabel(selectedContext.reportType)} • Perfil{' '}
                    <strong>{selectedContext.profileCode || selectedContext.dominantFactor}</strong>
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Fatores DISC: D {selectedContext.scores.D} | I {selectedContext.scores.I} | S {selectedContext.scores.S} | C {selectedContext.scores.C}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <select
                    value={focusKey}
                    onChange={(event) => setFocusKey(event.target.value)}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  >
                    {FOCUS_OPTIONS.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? 'Gerando...' : 'Gerar análise'}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-slate-500">{currentFocus.description}</p>

                {errorMessage ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                ) : null}

                {analysis ? (
                  <div className="mt-5 space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{analysis.focus.label}</Badge>
                        {analysis.provider ? <Badge variant="outline">Provider: {analysis.provider}</Badge> : null}
                        {analysis.model ? <Badge variant="outline">Modelo: {analysis.model}</Badge> : null}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {analysis.focusNote} {analysis.source ? `• Fonte: ${analysis.source}` : ''}
                      </p>
                    </div>

                    <article className="rounded-xl border border-slate-200 bg-white p-4">
                      <h3 className="text-sm font-semibold text-slate-900">Resumo executivo</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {analysis.summary || 'Sem resumo disponível para este contexto.'}
                      </p>
                    </article>

                    <div className="grid gap-3 md:grid-cols-3">
                      <article className="rounded-xl border border-slate-200 bg-white p-4">
                        <h4 className="text-sm font-semibold text-slate-900">Pontos fortes</h4>
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {analysis.strengths.length ? analysis.strengths.map((item) => <li key={item}>• {item}</li>) : <li>• Sem dados</li>}
                        </ul>
                      </article>

                      <article className="rounded-xl border border-slate-200 bg-white p-4">
                        <h4 className="text-sm font-semibold text-slate-900">Pontos de atenção</h4>
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {analysis.limitations.length ? analysis.limitations.map((item) => <li key={item}>• {item}</li>) : <li>• Sem dados</li>}
                        </ul>
                      </article>

                      <article className="rounded-xl border border-slate-200 bg-white p-4">
                        <h4 className="text-sm font-semibold text-slate-900">Recomendações</h4>
                        <ul className="mt-2 space-y-1 text-sm text-slate-700">
                          {analysis.developmentRecommendations.length
                            ? analysis.developmentRecommendations.map((item) => <li key={item}>• {item}</li>)
                            : <li>• Sem dados</li>}
                        </ul>
                      </article>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    Gere a primeira análise para visualizar leitura contextual do AI Lab.
                  </div>
                )}
              </>
            ) : (
              <PanelState title="Selecione um relatório" description="Escolha um relatório na coluna ao lado para iniciar o AI Lab." />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
