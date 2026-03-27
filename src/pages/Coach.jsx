import React, { useEffect, useState } from 'react';
import { MessageSquareText, SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UpgradePrompt, useFeatureAccess } from '@/modules/billing';
import { answerDiscCoachQuestion } from '@/modules/coach';

const PRESET_PROFILES = Object.freeze([
  { key: 'DI', label: 'Perfil DI', scores: { D: 42, I: 30, S: 16, C: 12 } },
  { key: 'SC', label: 'Perfil SC', scores: { D: 14, I: 18, S: 40, C: 28 } },
  { key: 'CD', label: 'Perfil CD', scores: { D: 32, I: 12, S: 21, C: 35 } },
  { key: 'IS', label: 'Perfil IS', scores: { D: 15, I: 38, S: 31, C: 16 } },
]);

const QUICK_QUESTIONS = Object.freeze([
  'Como liderar um perfil SC?',
  'Como motivar um perfil C alto?',
  'Como lidar com conflito D x S?',
]);

export default function Coach() {
  const { checkFeature, featureKeys } = useFeatureAccess();
  const coachAccess = checkFeature(featureKeys.COACH);
  const [selectedProfileKey, setSelectedProfileKey] = useState(PRESET_PROFILES[0].key);
  const [question, setQuestion] = useState(QUICK_QUESTIONS[0]);
  const [submittedQuestion, setSubmittedQuestion] = useState(QUICK_QUESTIONS[0]);
  const [answer, setAnswer] = useState({ response: '', recommendedActions: [], profileCode: '', styleLabel: '' });
  const [loading, setLoading] = useState(false);

  const selectedProfile = PRESET_PROFILES.find((item) => item.key === selectedProfileKey) || PRESET_PROFILES[0];

  useEffect(() => {
    let cancelled = false;
    async function fetchAnswer() {
      setLoading(true);
      try {
        const result = await answerDiscCoachQuestion({
          question: submittedQuestion,
          scores: selectedProfile?.scores || {},
          detailLevel: 'medium',
          profile: selectedProfile?.key,
        });
        if (!cancelled) setAnswer(result);
      } catch {
        if (!cancelled) setAnswer({ response: 'Erro ao gerar resposta.', recommendedActions: [], profileCode: '', styleLabel: '' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAnswer();
    return () => { cancelled = true; };
  }, [selectedProfileKey, submittedQuestion]);

  if (!coachAccess.allowed) {
    return (
      <div className="w-full min-w-0 max-w-4xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8">
        <UpgradePrompt
          title="Coach DISC bloqueado no plano atual"
          description="Faça upgrade para desbloquear o coach comportamental com recomendações práticas baseadas no discEngine."
          requiredPlanLabel="Professional"
          ctaLabel="Ativar coach"
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
          Coach DISC
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Assistente comportamental estratégico
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Faça perguntas sobre liderança, motivação e conflitos para receber respostas práticas baseadas no perfil DISC.
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Perfil de referência</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {PRESET_PROFILES.map((profile) => {
              const active = profile.key === selectedProfileKey;
              return (
                <button
                  key={profile.key}
                  type="button"
                  onClick={() => setSelectedProfileKey(profile.key)}
                  className={`rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold">{profile.label}</p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    D {profile.scores.D}% • I {profile.scores.I}% • S {profile.scores.S}% • C {profile.scores.C}%
                  </p>
                </button>
              );
            })}
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pergunta</p>
          <div className="mt-2 flex gap-2">
            <Input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ex.: Como lidar com conflito D x S?"
            />
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => setSubmittedQuestion(question)}
            >
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
            Resposta do coach
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            {loading ? 'Gerando resposta...' : answer.response}
          </p>
          <p className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-600">
            Perfil: {answer.profileCode || '-'} • {answer.styleLabel || 'Leitura semântica DISC'}
          </p>
          <ul className="mt-3 space-y-2">
            {(answer.recommendedActions || []).map((item) => (
              <li key={item} className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm text-slate-700">
                {item}
              </li>
            ))}
          </ul>
        </article>
      </section>
    </div>
  );
}
