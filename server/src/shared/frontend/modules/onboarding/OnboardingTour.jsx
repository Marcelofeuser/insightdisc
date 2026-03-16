import React, { useMemo, useState } from 'react';
import { CheckCircle2, Compass, Rocket, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useFeatureAccess } from '@/modules/billing';

const STORAGE_KEY = 'insightdisc:onboarding:v1';

const BASE_STEPS = Object.freeze([
  { id: 'create-account', label: 'Conta criada', href: '/painel', description: 'Acesso inicial ao painel V2.' },
  { id: 'first-assessment', label: 'Primeira avaliação', href: '/PremiumAssessment', description: 'Inicie sua primeira avaliação DISC.' },
  { id: 'view-result', label: 'Ver resultado', href: '/MyAssessments', description: 'Abra um resultado individual oficial.' },
  { id: 'try-comparison', label: 'Testar comparação', href: '/compare-profiles', description: 'Compare dois perfis comportamentais.' },
  { id: 'try-team-map', label: 'Testar team map', href: '/team-map', description: 'Explore inteligência de equipe e gaps.' },
]);

function readState() {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function persistState(nextState = {}) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

export default function OnboardingTour() {
  const { hasFeature, featureKeys } = useFeatureAccess();
  const [state, setState] = useState(() => readState());
  const [isDismissed, setIsDismissed] = useState(() => Boolean(readState()?.dismissed));

  const steps = useMemo(() => {
    const canUseTeamMap = hasFeature(featureKeys.TEAM_MAP);
    const canUseComparison = hasFeature(featureKeys.ADVANCED_COMPARISON);
    return BASE_STEPS.filter((step) => {
      if (step.id === 'try-team-map') return canUseTeamMap;
      if (step.id === 'try-comparison') return canUseComparison;
      return true;
    });
  }, [featureKeys.ADVANCED_COMPARISON, featureKeys.TEAM_MAP, hasFeature]);

  const completedCount = steps.filter((step) => Boolean(state?.[step.id])).length;
  const isComplete = completedCount >= steps.length && steps.length > 0;

  const markStep = (stepId) => {
    const next = { ...state, [stepId]: true };
    setState(next);
    persistState(next);
  };

  const dismiss = () => {
    const next = { ...state, dismissed: true };
    setState(next);
    setIsDismissed(true);
    persistState(next);
  };

  if (isDismissed || isComplete || !steps.length) return null;

  return (
    <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center rounded-full border border-indigo-200 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
            <Compass className="mr-1.5 h-3.5 w-3.5" />
            Onboarding guiado
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Configure sua jornada inicial no InsightDISC
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Complete os próximos passos para liberar valor rápido da plataforma.
          </p>
        </div>

        <button
          type="button"
          onClick={dismiss}
          className="inline-flex rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-800"
          aria-label="Dispensar onboarding"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {steps.map((step, index) => {
          const done = Boolean(state?.[step.id]);
          return (
            <article
              key={step.id}
              className={`rounded-xl border p-3 ${
                done ? 'border-emerald-200 bg-emerald-50/60' : 'border-slate-200 bg-white'
              }`}
            >
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Passo {index + 1}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{step.label}</p>
              <p className="mt-1 text-xs text-slate-600">{step.description}</p>
              <div className="mt-3 flex items-center gap-2">
                <Link to={step.href}>
                  <Button size="sm" variant={done ? 'outline' : 'default'}>
                    {done ? 'Revisar' : 'Executar'}
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="ghost"
                  className={done ? 'text-emerald-700' : 'text-slate-600'}
                  onClick={() => markStep(step.id)}
                >
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  {done ? 'Concluído' : 'Marcar concluído'}
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
        <Rocket className="mr-2 inline h-4 w-4 text-indigo-600" />
        Progresso: {completedCount}/{steps.length} etapas concluídas.
      </div>
    </section>
  );
}
