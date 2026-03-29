import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Loader2, Send, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/ui/EmptyState';
import PanelState from '@/components/ui/PanelState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { mapCandidateReports } from '@/modules/report/backendReports';
import {
  buildCoachReportContext,
  formatReportTypeLabel,
  normalizeCoachReportItem,
} from '@/modules/coach/reportContext';

const EXAMPLE_QUESTIONS = [
  'Como desenvolver melhor esse perfil?',
  'Quais riscos de comunicação esse perfil pode ter?',
  'Como liderar essa pessoa no dia a dia?',
  'Quais pontos devo observar em feedback?',
  'Como esse perfil tende a reagir sob pressão?',
];

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
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

export default function PanelCoach() {
  const { access } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [selectedReportId, setSelectedReportId] = useState('');
  const [question, setQuestion] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [history, setHistory] = useState([]);

  const reportsQuery = useQuery({
    queryKey: ['panel-coach-reports', apiBaseUrl, access?.tenantId, access?.userId, access?.email],
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
    if (selectedReportId) return;
    if (!reports.length) return;
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

  const handleAsk = async () => {
    const prompt = String(question || '').trim();
    if (!prompt || !selectedContext || isSending) return;

    setIsSending(true);
    setErrorMessage('');

    try {
      const payload = await apiRequest('/ai/coach-answer', {
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
          question: prompt,
          context: {
            reportId: selectedContext.reportId,
            assessmentId: selectedContext.assessmentId,
            reportType: selectedContext.reportType,
            profileCode: selectedContext.profileCode,
            dominantFactor: selectedContext.dominantFactor,
            summary: selectedContext.summary,
            strengths: selectedContext.strengths,
            limitations: selectedContext.limitations,
            developmentRecommendations: selectedContext.developmentRecommendations,
          },
        },
      });

      setHistory((current) => [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          question: prompt,
          answer: String(payload?.answer || '').trim(),
          source: String(payload?.source || '').trim() || 'ai_provider',
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);
      setQuestion('');
    } catch (error) {
      setErrorMessage(error?.message || 'Não foi possível gerar a resposta contextual do Coach agora.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8" data-testid="panel-coach-page">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Coach DISC com IA</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Coach contextual por relatório</h1>
        <p className="mt-2 text-sm text-slate-600">
          Primeiro selecione um relatório concluído. Depois faça perguntas para receber insights
          contextualizados no perfil real da pessoa avaliada.
        </p>
      </section>

      {reportsQuery.isLoading ? (
        <PanelState title="Carregando relatórios" description="Buscando base para o Coach contextual." />
      ) : reportsQuery.isError ? (
        <PanelState
          type="error"
          title="Falha ao carregar relatórios"
          description="Não foi possível carregar os relatórios para o Coach neste momento."
        />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="Sem relatórios para o Coach"
          description="Conclua avaliações para liberar o Coach com contexto real."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">1. Selecione o relatório base</h2>
            <p className="mt-1 text-xs text-slate-500">
              O Coach vai usar os dados deste relatório como contexto obrigatório.
            </p>

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
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">2. Pergunte ao Coach</p>
                  <p className="mt-2 text-sm text-slate-700">
                    Base atual: <strong>{selectedContext.respondentName}</strong> •{' '}
                    {formatReportTypeLabel(selectedContext.reportType)} • Perfil{' '}
                    <strong>{selectedContext.profileCode || selectedContext.dominantFactor}</strong>
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    Fatores DISC: D {selectedContext.scores.D} | I {selectedContext.scores.I} | S {selectedContext.scores.S} | C {selectedContext.scores.C}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {EXAMPLE_QUESTIONS.map((item) => (
                    <Button key={item} type="button" size="sm" variant="outline" onClick={() => setQuestion(item)}>
                      {item}
                    </Button>
                  ))}
                </div>

                <div className="mt-4 space-y-3">
                  <Textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Digite sua pergunta sobre este perfil..."
                    className="min-h-[120px]"
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-slate-500">
                      O Coach responde usando o relatório selecionado como contexto principal.
                    </p>
                    <Button
                      type="button"
                      className="bg-indigo-600 hover:bg-indigo-700"
                      onClick={handleAsk}
                      disabled={isSending || !String(question || '').trim()}
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Perguntar ao Coach
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {errorMessage ? (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                    {errorMessage}
                  </div>
                ) : null}

                <div className="mt-5 space-y-3">
                  {history.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                      Faça a primeira pergunta para gerar insights contextualizados com IA.
                    </div>
                  ) : (
                    history.map((item) => (
                      <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Pergunta</p>
                        <p className="mt-1 text-sm text-slate-900">{item.question}</p>
                        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                          Resposta do Coach
                        </p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-700">{item.answer}</p>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Fonte: {item.source === 'deterministic_fallback' ? 'Fallback estruturado' : 'AI Provider'}</span>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </>
            ) : (
              <PanelState title="Selecione um relatório" description="Escolha um relatório na coluna ao lado para iniciar o Coach." />
            )}
          </section>
        </div>
      )}
    </div>
  );
}
