import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, FileText, Radar, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiscRadarChart } from '@/modules/analytics/components';
import { compareDiscProfiles, normalizeComparableProfile } from '@/modules/discComparison';
import { buildDiscInterpretation } from '@/modules/discEngine';
import { calculateJobFit } from '@/modules/jobFit';
import { ReportValueLadderCard } from '@/modules/reports';
import { buildTeamIntelligence } from '@/modules/teamIntelligence/engine';
import {
  DEMO_COMPARISON,
  DEMO_JOB_PROFILE,
  DEMO_PROFILES,
  DEMO_TEAM,
} from '@/modules/demo/demoDataset.js';

function toComparable(profile = {}) {
  return normalizeComparableProfile(
    {
      id: profile.id,
      assessmentId: profile.id,
      name: profile.name,
      scores: profile.scores,
    },
    {
      context: 'demo_mode',
      detailLevel: 'short',
      fallbackId: profile.id || 'demo-profile',
    },
  );
}

export default function DemoMode() {
  const teamIntelligence = useMemo(
    () => buildTeamIntelligence(DEMO_TEAM),
    [],
  );
  const profileA = useMemo(
    () => DEMO_PROFILES.find((item) => item.id === DEMO_COMPARISON.leftId) || DEMO_PROFILES[0],
    [],
  );
  const profileB = useMemo(
    () => DEMO_PROFILES.find((item) => item.id === DEMO_COMPARISON.rightId) || DEMO_PROFILES[1],
    [],
  );

  const comparison = useMemo(() => {
    return compareDiscProfiles(
      toComparable(profileA),
      toComparable(profileB),
      {
        mode: 'person_to_person',
        detailLevel: 'medium',
      },
    );
  }, [profileA, profileB]);

  const jobFit = useMemo(() => {
    return calculateJobFit(
      {
        id: profileA.id,
        assessmentId: profileA.id,
        name: profileA.name,
        profileCode: profileA.profileCode,
        scores: profileA.scores,
      },
      DEMO_JOB_PROFILE,
      { context: 'demo_mode_job_fit' },
    );
  }, [profileA]);

  const profileInterpretation = useMemo(
    () =>
      buildDiscInterpretation(profileA.scores, {
        context: 'demo_mode_result',
        detailLevel: 'medium',
      }),
    [profileA.scores],
  );

  const demoActions = [
    {
      title: 'Fazer avaliacao',
      description: 'Inicie o fluxo de avaliacao real com onboarding e resultado oficial.',
      to: '/avaliacoes',
    },
    {
      title: 'Ver resultado oficial',
      description: 'Abra o resultado DISC estruturado com resumo e leituras comportamentais.',
      to: '/assessments/assessment-1/result',
    },
    {
      title: 'Gerar relatorio',
      description: 'Visualize o relatorio HTML premium com secoes executivas.',
      to: '/assessments/assessment-1/report',
    },
    {
      title: 'Comparar perfis',
      description: 'Veja sinergias e tensoes entre dois perfis de forma pratica.',
      to: '/compare-profiles',
    },
    {
      title: 'Pessoa x cargo',
      description: 'Analise aderencia comportamental entre candidato e vaga.',
      to: '/JobMatching',
    },
    {
      title: 'Team intelligence',
      description: 'Mapeie composicao da equipe e riscos organizacionais.',
      to: '/team-map',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-[linear-gradient(135deg,#ffffff_0%,#eef4ff_58%,#ffffff_100%)] p-6 shadow-sm sm:p-8">
          <p className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.13em] text-indigo-700">
            Modo Demo
          </p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            Demo comercial da InsightDISC
          </h1>
          <p className="mt-2 max-w-4xl text-base text-slate-600">
            Veja em poucos minutos como a plataforma entrega valor real: avaliacao individual, resultado oficial,
            relatorio premium, comparacao avancada, aderencia candidato x cargo e team intelligence.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/StartFree">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                Comecar avaliacao agora
              </Button>
            </Link>
            <Link to="/compare-profiles">
              <Button variant="outline">
                Abrir comparador
              </Button>
            </Link>
            <Link to="/Pricing">
              <Button variant="outline">
                Conhecer planos
              </Button>
            </Link>
          </div>
        </section>

        <ReportValueLadderCard
          currentTier="standard"
          title="Escada de valor dos relatorios"
          description="Na demo voce visualiza a progressao de valor: Standard Report, Premium Report e Professional Report."
        />

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Fluxos principais da plataforma</h2>
          <p className="mt-1 text-sm text-slate-600">
            Navegue pelos fluxos criticos de aquisicao e entrega de valor para entender a jornada completa do produto.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {demoActions.map((action, index) => (
              <Link
                key={action.title}
                to={action.to}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition-all hover:border-indigo-200 hover:bg-indigo-50/40"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Passo {index + 1}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{action.title}</p>
                <p className="mt-1 text-sm text-slate-600">{action.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Equipe demo</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{teamIntelligence.totalMembers} perfis</p>
            <p className="mt-1 text-sm text-slate-600">{teamIntelligence.executiveSummary}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Compatibilidade demo</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{comparison.compatibilityScore.toFixed(1)}%</p>
            <p className="mt-1 text-sm text-slate-600">{comparison.summaryShort}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Job Fit demo</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{jobFit.jobFitScore.toFixed(1)}%</p>
            <p className="mt-1 text-sm text-slate-600">{jobFit.summaryShort}</p>
          </article>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <DiscRadarChart
            title={`Radar demo • ${profileA.name}`}
            subtitle={profileInterpretation.summaryShort}
            profile={profileA.scores}
          />
          <DiscRadarChart
            title="Radar coletivo demo"
            subtitle="Leitura média da equipe de demonstração."
            profile={teamIntelligence.distribution}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2">
              <Radar className="h-4 w-4 text-indigo-600" />
              Comparação demo ({profileA.profileCode} × {profileB.profileCode})
            </h2>
            <p className="mt-2 text-sm text-slate-700">{comparison.summaryMedium}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <article className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                <p className="text-sm font-semibold text-emerald-900">Sinergias</p>
                <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                  {(comparison.synergyPoints || []).slice(0, 3).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </article>
              <article className="rounded-xl border border-rose-200 bg-rose-50/70 p-3">
                <p className="text-sm font-semibold text-rose-900">Tensões</p>
                <ul className="mt-2 space-y-1 text-sm text-rose-900">
                  {(comparison.tensionPoints || []).slice(0, 3).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </article>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-indigo-600" />
              Pessoa × Cargo
            </h2>
            <p className="mt-2 text-sm text-slate-700">
              {profileA.name} comparado ao perfil ideal de {DEMO_JOB_PROFILE.label}.
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              Recomendação: {jobFit.hiringRecommendationLabel}
            </p>
            <ul className="mt-3 space-y-1 text-sm text-slate-700">
              {(jobFit.strengths || []).slice(0, 2).map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <Link to="/JobMatching" className="mt-4 inline-flex">
              <Button variant="outline">
                Ver módulo completo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </article>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            Resultado, relatorio e exportacao
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            A jornada oficial inclui resultado estruturado, relatorio premium e exportacao PDF para operacao comercial.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/assessments/assessment-1/result">
              <Button variant="outline">Abrir resultado oficial</Button>
            </Link>
            <Link to="/assessments/assessment-1/report">
              <Button variant="outline">Abrir relatorio premium</Button>
            </Link>
            <Link to="/assessments/assessment-1/report">
              <Button className="bg-indigo-600 hover:bg-indigo-700">Testar exportacao PDF</Button>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 inline-flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-600" />
            Perfis do dataset demo
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {DEMO_PROFILES.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-sm font-semibold text-slate-900">{item.name}</p>
                <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">Perfil {item.profileCode}</p>
                <p className="mt-1 text-xs text-slate-600">
                  D {item.scores.D}% • I {item.scores.I}% • S {item.scores.S}% • C {item.scores.C}%
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
