import React from 'react';
import { ArrowRight, CheckCircle2, Radar, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DISCRadarChart from '@/components/disc/DISCRadarChart';

const SAMPLE_PROFILE = Object.freeze({ D: 68, I: 44, S: 36, C: 62 });

const QUICK_PREVIEWS = Object.freeze([
  { title: 'Resultado individual', caption: 'Perfil + resumo executivo' },
  { title: 'Comparacao avancada', caption: 'Sinergias e tensoes comportamentais' },
  { title: 'Team map', caption: 'Composicao e equilibrio da equipe' },
  { title: 'Job matching', caption: 'Aderencia candidato x cargo' },
]);

export default function LandingHero({ content }) {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_68%)] pb-20 pt-28 sm:pt-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.16)_0%,rgba(37,99,235,0)_72%)]" />
        <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.12)_0%,rgba(14,165,233,0)_72%)]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1.08fr,0.92fr] lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
            <Sparkles className="h-3.5 w-3.5" />
            {content.badge}
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            {content.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">{content.subtitle}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={content.primaryCta.to}>
              <Button size="lg" className="h-12 rounded-xl bg-indigo-600 px-6 font-semibold hover:bg-indigo-700">
                {content.primaryCta.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to={content.secondaryCta.to}>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border-indigo-200 bg-white px-6 font-semibold text-indigo-700 hover:bg-indigo-50"
                data-testid="home-cta-secondary"
              >
                {content.secondaryCta.label}
              </Button>
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {content.quickActions?.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-700"
              >
                {action.label}
              </Link>
            ))}
          </div>

          <ul className="mt-7 grid gap-2 sm:grid-cols-2">
            {content.trustPoints?.map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_30px_80px_rgba(15,23,42,0.09)] sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Visao da plataforma</p>
              <p className="text-lg font-bold text-slate-900">Muito alem de um teste DISC</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              <Radar className="h-3.5 w-3.5" />
              InsightDISC
            </span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <DISCRadarChart naturalProfile={SAMPLE_PROFILE} showAdapted={false} size={220} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {QUICK_PREVIEWS.map((item) => (
              <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

