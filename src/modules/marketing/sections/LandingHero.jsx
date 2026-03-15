import React, { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import '../../../styles/landingDark.css';

const HERO_CAPABILITIES = Object.freeze([
  {
    title: 'Perfil',
    caption: 'Leitura individual detalhada',
  },
  {
    title: 'Comparação',
    caption: 'Pessoa x pessoa e pessoa x cargo',
  },
  {
    title: 'Team Map',
    caption: 'Distribuição e inteligência de equipe',
  },
  {
    title: 'PDF',
    caption: 'Relatório premium exportável',
  },
]);

export default function LandingHero({ content }) {
  useEffect(() => {
    document.body.classList.add('landing-dark');

    return () => {
      document.body.classList.remove('landing-dark');
    };
  }, []);

  return (
    <section className="relative min-h-screen overflow-hidden px-6 pt-24">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute right-20 top-40 h-96 w-96 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-16 left-1/3 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <span className="hero-badge fade-up glass-card mb-8 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-slate-300">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              {content.badge}
            </span>
            <h1
              className="hero-title fade-up mb-6 text-5xl font-extrabold leading-tight md:text-6xl xl:text-7xl"
              style={{ animationDelay: '.1s' }}
            >
              {content.title}
            </h1>
            <p
              className="hero-subtitle fade-up mb-8 max-w-2xl text-xl leading-relaxed md:text-2xl"
              style={{ animationDelay: '.2s' }}
            >
              {content.subtitle}
            </p>

            <div className="fade-up mb-10 flex flex-col gap-4 sm:flex-row" style={{ animationDelay: '.3s' }}>
              <Link to={content.primaryCta.to}>
                <Button size="lg" className="btn-primary cta-primary h-auto rounded-2xl px-8 py-4 text-lg font-bold">
                  {content.primaryCta.label}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to={content.secondaryCta.to}>
                <Button
                  size="lg"
                  variant="outline"
                  className="btn-secondary cta-secondary glass-card h-auto rounded-2xl border border-white/10 px-8 py-4 text-lg font-bold text-slate-200"
                  data-testid="home-cta-secondary"
                >
                  {content.secondaryCta.label}
                </Button>
              </Link>
            </div>

            <div className="fade-up grid grid-cols-2 gap-4 md:grid-cols-4" style={{ animationDelay: '.4s' }}>
              {HERO_CAPABILITIES.map((item) => (
                <div key={item.title} className="glass-card rounded-2xl p-5 transition-all hover:border-blue-500/30">
                  <p className="text-2xl font-extrabold">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{item.caption}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="fade-up" style={{ animationDelay: '.25s' }}>
            <div className="glass-card rounded-[28px] p-5">
              <div className="grid gap-4">
                <div className="mock-card rounded-2xl p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Dashboard</p>
                      <h3 className="text-lg font-bold">Painel por persona</h3>
                    </div>
                    <span className="rounded-full bg-blue-500/15 px-3 py-1 text-xs font-semibold text-blue-300">Business</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Avaliações', value: '124' },
                      { label: 'Relatórios', value: '98' },
                      { label: 'Comparações', value: '36' },
                      { label: 'Times', value: '12' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-white/5 p-3 transition-all hover:bg-white/10">
                        <p className="text-sm text-slate-400">{item.label}</p>
                        <p className="mt-1 text-2xl font-bold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="mock-card rounded-2xl p-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-500">Relatório premium</p>
                    <h4 className="mb-3 font-bold">Dossiê comportamental</h4>
                    <div className="space-y-2 text-sm text-slate-400">
                      <div className="h-3 rounded bg-white/10" />
                      <div className="h-3 w-5/6 rounded bg-white/10" />
                      <div className="h-3 w-4/6 rounded bg-white/10" />
                      <div className="h-3 w-3/6 rounded bg-white/10" />
                    </div>
                  </div>
                  <div className="mock-card rounded-2xl p-4">
                    <p className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-500">Comparação</p>
                    <h4 className="mb-3 font-bold">Pessoa x cargo ideal</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Aderência</span>
                        <span className="font-bold text-green-400">82%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-green-400" style={{ width: '82%' }} />
                      </div>
                      <p className="text-xs text-slate-400">
                        Leitura automática de fit comportamental para recrutamento e alocação.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mock-card rounded-2xl p-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.14em] text-slate-500">Mapa organizacional</p>
                  <h4 className="mb-3 font-bold">Inteligência de equipe</h4>
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div className="cursor-pointer rounded-xl bg-red-500/15 p-3 text-red-300 transition-all hover:bg-red-500/25">
                      D
                      <br />
                      <strong>28%</strong>
                    </div>
                    <div className="cursor-pointer rounded-xl bg-amber-500/15 p-3 text-amber-300 transition-all hover:bg-amber-500/25">
                      I
                      <br />
                      <strong>22%</strong>
                    </div>
                    <div className="cursor-pointer rounded-xl bg-green-500/15 p-3 text-green-300 transition-all hover:bg-green-500/25">
                      S
                      <br />
                      <strong>31%</strong>
                    </div>
                    <div className="cursor-pointer rounded-xl bg-blue-500/15 p-3 text-blue-300 transition-all hover:bg-blue-500/25">
                      C
                      <br />
                      <strong>19%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
