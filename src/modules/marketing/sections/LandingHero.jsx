import React, { useEffect } from 'react';
import { ArrowRight, CheckCircle2, Radar, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import DISCRadarChart from '@/components/disc/DISCRadarChart';
import '../../../styles/landingDark.css';

const SAMPLE_PROFILE = Object.freeze({ D: 68, I: 44, S: 36, C: 62 });

const QUICK_PREVIEWS = Object.freeze([
  { title: 'Relatório premium', caption: 'Dossiê comportamental completo' },
  { title: 'Comparação', caption: 'Pessoa x cargo ideal com score de aderência' },
  { title: 'Team map', caption: 'Distribuição DISC e leitura de equilíbrio' },
  { title: 'Job matching', caption: 'Fit comportamental para recrutamento' },
]);

export default function LandingHero({ content }) {
  useEffect(() => {
    document.body.classList.add('landing-dark');

    return () => {
      document.body.classList.remove('landing-dark');
    };
  }, []);

  return (
    <section className="relative overflow-hidden pb-20 pt-28 sm:pt-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-72 w-[60rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.16)_0%,rgba(37,99,235,0)_72%)]" />
        <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.12)_0%,rgba(14,165,233,0)_72%)]" />
      </div>

      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 lg:grid-cols-[1.08fr,0.92fr] lg:items-center">
        <div>
          <span className="hero-badge inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
            <Sparkles className="h-3.5 w-3.5" />
            {content.badge}
          </span>
          <h1 className="hero-title mt-6 max-w-3xl text-5xl font-bold leading-tight tracking-tight">
            {content.title}
          </h1>
          <p className="hero-subtitle mt-4 max-w-2xl text-lg leading-relaxed">{content.subtitle}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={content.primaryCta.to}>
              <Button size="lg" className="cta-primary h-12 rounded-xl px-6 font-semibold">
                {content.primaryCta.label}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link to={content.secondaryCta.to}>
              <Button
                size="lg"
                variant="outline"
                className="cta-secondary h-12 rounded-xl px-6 font-semibold"
                data-testid="home-cta-secondary"
              >
                {content.secondaryCta.label}
              </Button>
            </Link>
            {content.compatibilityCta ? (
              <Link to={content.compatibilityCta.to}>
                <Button
                  size="lg"
                  variant="outline"
                  className="cta-secondary h-12 rounded-xl px-6 font-semibold"
                >
                  {content.compatibilityCta.label}
                </Button>
              </Link>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {content.quickActions?.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="hero-pill rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-indigo-200 hover:text-indigo-700"
              >
                {action.label}
              </Link>
            ))}
          </div>

          <ul className="mt-7 grid gap-2 sm:grid-cols-2">
            {content.trustPoints?.map((item) => (
              <li key={item} className="hero-trust-point flex items-start gap-2 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="hero hero-surface rounded-2xl p-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Dashboard</p>
              <p className="text-lg font-bold text-slate-900">Painel por persona</p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              <Radar className="h-3.5 w-3.5" />
              Business
            </span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <DISCRadarChart naturalProfile={SAMPLE_PROFILE} showAdapted={false} size={220} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {QUICK_PREVIEWS.map((item) => (
              <div key={item.title} className="landing-card rounded-xl border border-slate-200 bg-white p-3">
                <p className="landing-card-title text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="landing-card-text mt-1 text-xs leading-relaxed text-slate-500">{item.caption}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
