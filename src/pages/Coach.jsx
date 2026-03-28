import React, { useEffect, useState } from 'react';
import { MessageSquareText, SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UpgradePrompt, useFeatureAccess } from '@/modules/billing';
import { answerDiscCoachQuestion } from '@/modules/coach';

const PRESET_REPORTS = Object.freeze([
  {
    id: 'report-ana-di',
    title: 'Relatório #001 • Ana Martins',
    context: 'Devolutiva individual',
    profileCode: 'DI',
    styleLabel: 'Direta e influente',
    collectedAt: '24 mar 2026',
    scores: { D: 42, I: 30, S: 16, C: 12 },
  },
  {
    id: 'report-carlos-sc',
    title: 'Relatório #014 • Carlos Souza',
    context: 'Coaching de liderança',
    profileCode: 'SC',
    styleLabel: 'Estável e analítico',
    collectedAt: '21 mar 2026',
    scores: { D: 14, I: 18, S: 40, C: 28 },
  },
  {
    id: 'report-bianca-cd',
    title: 'Relatório #022 • Bianca Lima',
    context: 'Entrevista comportamental',
    profileCode: 'CD',
    styleLabel: 'Analítica e orientada a resultado',
    collectedAt: '17 mar 2026',
    scores: { D: 32, I: 12, S: 21, C: 35 },
  },
  {
    id: 'report-pedro-is',
    title: 'Relatório #031 • Pedro Rocha',
    context: 'Acompanhamento de desenvolvimento',
    profileCode: 'IS',
    styleLabel: 'Comunicativo e colaborativo',
    collectedAt: '12 mar 2026',
    scores: { D: 15, I: 38, S: 31, C: 16 },
  },
]);

const QUICK_QUESTIONS = Object.freeze([
  'Quais perguntas técnicas devo usar na devolutiva?',
  'Como conduzir esse perfil sob pressão?',
  'Que recomendações práticas priorizar na próxima sessão?',
]);

export default function Coach() {
  const { checkFeature, featureKeys } = useFeatureAccess();
  const coachAccess = checkFeature(featureKeys.COACH);
  const [selectedReportId, setSelectedReportId] = useState(PRESET_REPORTS[0].id);
  const [question, setQuestion] = useState(QUICK_QUESTIONS[0]);
  const [submittedQuestion, setSubmittedQuestion] = useState(QUICK_QUESTIONS[0]);
  const [answer, setAnswer] = useState({ response: '', recommendedActions: [], profileCode: '', styleLabel: '' });
  const [loading, setLoading] = useState(false);

  const selectedReport = PRESET_REPORTS.find((item) => item.id === selectedReportId) || PRESET_REPORTS[0];

  useEffect(() => {
    let cancelled = false;
    async function fetchAnswer() {
      setLoading(true);
      try {
        const result = await answerDiscCoachQuestion({
          question: submittedQuestion,
          scores: selectedReport?.scores || {},
          detailLevel: 'medium',
          profile: selectedReport?.profileCode,
        });
        if (!cancelled) setAnswer(result);
      } catch {
        if (!cancelled) {
          setAnswer({ response: 'Erro ao gerar resposta.', recommendedActions: [], profileCode: '', styleLabel: '' });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAnswer();
    return () => {
      cancelled = true;
    };
  }, [selectedReport, submittedQuestion]);

  if (!coachAccess.allowed) {
    return (
      <div
        className="w-full min-w-0 max-w-4xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8"
        data-testid="coach-gated-state"
      >
        <UpgradePrompt
          title="Coach DISC bloqueado no plano atual"
          description="O Coach DISC está disponível nos planos Personal, Profissional e Business com recomendações práticas baseadas em perfis analisados."
          requiredPlanLabel="Personal"
          ctaLabel="Ativar coach"
        />
      </div>
    );
  }

  return (
    <div
      className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8"
      data-testid="coach-page"
    >
      <section
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        data-testid="coach-unlocked-state"
      >
        <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
          Coach DISC
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Assistente comportamental contextual por relatório
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Selecione um relatório já analisado e receba recomendações práticas com base no perfil DISC contextualizado.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Relatório base</p>
          <div className="mt-2 grid gap-2">
            {PRESET_REPORTS.map((report) => {
              const active = report.id === selectedReportId;
              return (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedReportId(report.id)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{report.title}</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {report.context} • Perfil {report.profileCode} • {report.collectedAt}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-600">
            <p className="font-semibold text-slate-700">Contexto atual: {selectedReport.title}</p>
            <p className="mt-1">
              Perfil {selectedReport.profileCode} • {selectedReport.styleLabel}
            </p>
            <p className="mt-1">
              D {selectedReport.scores.D}% • I {selectedReport.scores.I}% • S {selectedReport.scores.S}% • C {selectedReport.scores.C}%
            </p>
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pergunta técnica</p>
          <div className="mt-2 flex gap-2">
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ex.: Como conduzir a devolutiva deste perfil em contexto de liderança?"
            />
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setSubmittedQuestion(question)}>
              <SendHorizonal className="mr-2 h-4 w-4" />
              Perguntar
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {QUICK_QUESTIONS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setQuestion(item);
                  setSubmittedQuestion(item);
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 hover:border-indigo-200 hover:text-indigo-700"
              >
                {item}
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-slate-900">
            <MessageSquareText className="h-4 w-4 text-indigo-600" />
            Resposta orientada pelo relatório
          </h2>
          <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-600">
            Base atual: {selectedReport.title} • Perfil {answer.profileCode || selectedReport.profileCode} • {answer.styleLabel || selectedReport.styleLabel}
          </p>
          <p className="mt-3 text-sm text-slate-700">
            {loading ? 'Gerando resposta contextual...' : answer.response}
          </p>
          <ul className="mt-3 space-y-2">
            {(answer.recommendedActions || []).map((item) => (
              <li key={item} className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-700">
                {item}
              </li>
            ))}
          </ul>
          {!loading && (!answer.recommendedActions || answer.recommendedActions.length === 0) ? (
            <p className="mt-3 text-xs text-slate-500">
              Sem ações adicionais no momento. Ajuste a pergunta para aprofundar a devolutiva.
            </p>
          ) : null}
        </article>
      </section>
    </div>
  );
}
