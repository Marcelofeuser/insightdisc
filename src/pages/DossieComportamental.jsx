import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';

const FEATURE_ITEMS = [
  'Notas privadas por avaliado',
  'Insights comportamentais por avaliação',
  'Histórico consolidado de testes DISC',
  'Plano de desenvolvimento individual',
  'Agendamento de reavaliações com lembrete',
  'Visão cronológica da evolução do perfil',
  'Ambiente ideal para RH, líderes e consultores',
  'Estrutura premium para operação recorrente',
];

const FLOW_STEPS = [
  'Avalie o profissional ou candidato',
  'Registre observações privadas e insights relevantes',
  'Crie plano de desenvolvimento e próximos passos',
  'Agende a próxima reavaliação com data e objetivo',
  'Construa um histórico vivo de evolução comportamental',
];

const PILLARS = [
  {
    title: 'Memória estratégica do avaliado',
    text: 'Centralize histórico comportamental, observações críticas, evolução de perfil e contexto de gestão em um único ambiente seguro.',
  },
  {
    title: 'Camada premium para RH e consultores',
    text: 'Um módulo pensado para operação corporativa, consultoria executiva e acompanhamento comportamental recorrente.',
  },
  {
    title: 'Estrutura para decisões contínuas',
    text: 'Transforme avaliações isoladas em um sistema de acompanhamento vivo, com reavaliações programadas e planos de desenvolvimento integrados.',
  },
];

const USE_CASES = [
  {
    title: 'RH Corporativo',
    text: 'Acompanhe admissões, promoções, sucessão, desempenho e reavaliações com rastreabilidade comportamental.',
  },
  {
    title: 'Consultorias',
    text: 'Documente sessões, feedbacks, hipóteses e recomendações, mantendo o histórico profissional do cliente vivo.',
  },
  {
    title: 'Liderança e Desenvolvimento',
    text: 'Converta relatórios em ações práticas com observações de campo, PDIs e agenda de acompanhamento.',
  },
];

function setSeoMeta() {
  if (typeof document === 'undefined') return;

  document.title = 'Dossiê Comportamental - InsightDISC';

  const description =
    'Crie histórico comportamental completo de avaliados com notas, insights, planos de desenvolvimento e reavaliações.';

  let descriptionTag = document.querySelector('meta[name="description"]');
  if (!descriptionTag) {
    descriptionTag = document.createElement('meta');
    descriptionTag.setAttribute('name', 'description');
    document.head.appendChild(descriptionTag);
  }
  descriptionTag.setAttribute('content', description);
}

export default function DossieComportamentalLandingPage() {
  useEffect(() => {
    setSeoMeta();
    trackEvent('dossier_landing_view', {
      path: '/dossie-comportamental',
    });
  }, []);

  const handleCtaClick = (source) => {
    trackEvent('dossier_cta_click', {
      source,
      path: '/dossie-comportamental',
    });
  };

  return (
    <div className="h-full w-full bg-slate-950 text-white overflow-auto">
      <style>{`
        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(168, 85, 247, 0.3) transparent;
        }

        html, body {
          height: 100%;
        }

        .gradient-hero {
          background: radial-gradient(circle at top right, rgba(96, 165, 250, 0.18), transparent 28%),
                      radial-gradient(circle at top left, rgba(168, 85, 247, 0.18), transparent 25%),
                      linear-gradient(180deg, #020617 0%, #0f172a 45%, #111827 100%);
        }

        .gradient-cta {
          background: radial-gradient(circle at top left, rgba(168, 85, 247, 0.28), transparent 24%),
                      radial-gradient(circle at bottom right, rgba(59, 130, 246, 0.28), transparent 28%),
                      linear-gradient(135deg, #1e1b4b 0%, #4f46e5 45%, #7c3aed 100%);
        }

        .blur-glow {
          animation: glow-pulse 6s ease-in-out infinite;
        }

        @keyframes glow-pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }

        .timeline-dot {
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }

        .fade-in {
          animation: fadeIn 0.8s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .hover-lift {
          transition: all 0.3s ease;
        }

        .hover-lift:hover {
          transform: translateY(-2px);
        }
      `}</style>

      <section className="relative overflow-hidden border-b border-white/10 gradient-hero">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-violet-500 blur-3xl blur-glow" />
          <div
            className="absolute right-0 top-24 h-80 w-80 rounded-full bg-sky-500 blur-3xl blur-glow"
            style={{ animationDelay: '2s' }}
          />
        </div>

        <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 md:px-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:px-12 lg:py-28">
          <div className="fade-in">
            <div className="mb-5 inline-flex items-center rounded-full border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-sm font-semibold tracking-[0.18em] text-violet-200 uppercase hover-lift cursor-default">
              Novo módulo premium • InsightDISC
            </div>

            <h1
              id="hero-title"
              className="max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl"
            >
              Dossiê Comportamental
            </h1>
            <p
              id="hero-subtitle"
              className="mt-6 max-w-3xl text-xl leading-9 text-slate-300 md:text-2xl"
            >
              O espaço corporativo para transformar cada avaliação DISC em memória estratégica,
              acompanhamento profissional e decisão recorrente.
            </p>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-400">
              Mais do que um relatório: um ambiente permanente para registrar observações,
              consolidar insights, acompanhar evolução e estruturar o desenvolvimento de cada
              avaliado com profundidade institucional.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link
                id="cta-primary"
                to="/Dossier"
                onClick={() => handleCtaClick('hero_acessar_modulo')}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 px-7 py-4 text-base font-bold text-white shadow-2xl shadow-violet-900/30 transition hover:scale-[1.01] hover-lift"
              >
                Acessar módulo
              </Link>
              <Link
                id="cta-secondary"
                to="/Pricing"
                onClick={() => handleCtaClick('hero_ver_planos_premium')}
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-7 py-4 text-base font-semibold text-slate-100 backdrop-blur transition hover:bg-white/10 hover-lift"
              >
                Ver planos premium
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm hover-lift">
                <div className="text-sm font-bold uppercase tracking-[0.18em] text-violet-200">
                  Histórico vivo
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Cada avaliação deixa contexto útil para o futuro.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm hover-lift">
                <div className="text-sm font-bold uppercase tracking-[0.18em] text-violet-200">
                  Governança
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Notas, insights e evolução em uma camada estruturada.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm hover-lift">
                <div className="text-sm font-bold uppercase tracking-[0.18em] text-violet-200">
                  Reavaliação
                </div>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Agenda comportamental com visão de continuidade.
                </p>
              </div>
            </div>
          </div>

          <div
            className="rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl hover-lift fade-in"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="rounded-[24px] border border-white/10 bg-slate-900/90 p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.2em] text-violet-200">
                    Preview executivo
                  </div>
                  <div className="mt-1 text-2xl font-bold text-white">Dossiê de João Martins</div>
                </div>
                <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Perfil DI
                </div>
              </div>
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-slate-800/70 p-4">
                  <div className="text-sm font-semibold text-slate-300">
                    Último insight registrado
                  </div>
                  <p className="mt-2 text-base leading-7 text-white">
                    Apresenta alta tração para liderança comercial, mas exige acompanhamento de
                    escuta ativa em contextos de pressão.
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-800/70 p-4">
                    <div className="text-sm font-semibold text-slate-300">Próxima reavaliação</div>
                    <div className="mt-2 text-lg font-bold text-white">16/10/2026 • 09:00</div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Objetivo: medir evolução após transição para posição de liderança.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-800/70 p-4">
                    <div className="text-sm font-semibold text-slate-300">Plano atual</div>
                    <div className="mt-2 text-lg font-bold text-white">
                      Comunicação e delegação
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Acompanhamento quinzenal com foco em feedback, autonomia e alinhamento de
                      equipe.
                    </p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-violet-600/20 to-sky-500/20 p-4">
                  <div className="text-sm font-semibold text-violet-100">
                    Linha do tempo comportamental
                  </div>
                  <div className="mt-4 space-y-3">
                    {[
                      'Mar/2026 • Avaliação inicial DISC',
                      'Abr/2026 • Nota estratégica do RH',
                      'Jun/2026 • Plano de desenvolvimento aberto',
                      'Out/2026 • Reavaliação programada',
                    ].map((timelineItem, index) => (
                      <div
                        key={timelineItem}
                        className="flex items-center gap-3 text-sm text-slate-200"
                      >
                        <span
                          className="h-2.5 w-2.5 rounded-full bg-violet-300 timeline-dot"
                          style={{ animationDelay: `${index * 0.3}s` }}
                        />
                        {timelineItem}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:px-12">
        <div className="grid gap-6 lg:grid-cols-3">
          {PILLARS.map((pillar, index) => (
            <div
              key={pillar.title}
              className="rounded-[24px] border border-white/10 bg-slate-900 p-7 shadow-xl shadow-black/20 hover-lift fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-violet-300">
                Pilar estratégico
              </div>
              <h3 className="mt-4 text-2xl font-bold text-white">{pillar.title}</h3>
              <p className="mt-4 text-base leading-8 text-slate-400">{pillar.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-slate-900/70">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:px-10 lg:grid-cols-[0.95fr_1.05fr] lg:px-12">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-violet-300">
              O que está incluído
            </div>
            <h2 className="mt-4 text-3xl font-black text-white md:text-5xl">
              Um ambiente para documentar o comportamento, não apenas medi-lo.
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-400">
              O Dossiê Comportamental foi desenhado para organizações e profissionais que precisam
              dar continuidade às avaliações com inteligência de contexto, memória institucional e
              acompanhamento ativo.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {FEATURE_ITEMS.map((feature) => (
              <div
                key={feature}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 text-base font-medium text-slate-100 backdrop-blur-sm hover-lift"
              >
                ✓ {feature}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:px-12">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-bold uppercase tracking-[0.18em] text-violet-300">
              Casos de uso
            </div>
            <h2 className="mt-4 text-3xl font-black text-white md:text-5xl">
              Feito para decisões que continuam depois do teste.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-8 text-slate-400">
            De consultorias executivas a RHs estruturados, o módulo organiza a dimensão
            comportamental como um ativo recorrente da operação.
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {USE_CASES.map((item, index) => (
            <div
              key={item.title}
              className="rounded-[24px] border border-white/10 bg-slate-900 p-7 hover-lift fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <h3 className="text-2xl font-bold text-white">{item.title}</h3>
              <p className="mt-4 text-base leading-8 text-slate-400">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:px-12">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-violet-300">
                Fluxo do produto
              </div>
              <h2 className="mt-4 text-3xl font-black text-white md:text-5xl">
                Como o Dossiê Comportamental opera.
              </h2>
            </div>
            <div className="space-y-4">
              {FLOW_STEPS.map((step, index) => (
                <div
                  key={step}
                  className="flex gap-4 rounded-2xl border border-white/10 bg-white/5 p-5 hover-lift fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 text-sm font-black text-white">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-base leading-7 text-slate-200">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 md:px-10 lg:px-12">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-sm md:p-12">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <div className="text-sm font-bold uppercase tracking-[0.18em] text-violet-300">
                Monetização inteligente
              </div>
              <h2 className="mt-4 text-3xl font-black text-white md:text-5xl">
                Camada premium para receita recorrente.
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-400">
                O Dossiê Comportamental foi concebido para ampliar ticket médio, retenção e valor
                estratégico da assinatura, posicionando o InsightDISC em uma categoria superior.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-[24px] border border-white/10 bg-slate-900/80 p-6 hover-lift fade-in">
                <div className="text-sm font-bold uppercase tracking-[0.16em] text-violet-300">
                  Professional
                </div>
                <div className="mt-3 text-xl font-bold text-white">
                  Consultores e operações enxutas
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-400">
                  Dossiê comportamental por avaliado, notas privadas, insights e histórico contínuo.
                </p>
              </div>
              <div
                className="rounded-[24px] border border-violet-400/50 bg-gradient-to-b from-violet-600/20 to-slate-900 p-6 shadow-xl shadow-violet-900/20 hover-lift fade-in"
                style={{ animationDelay: '0.1s' }}
              >
                <div className="text-sm font-bold uppercase tracking-[0.16em] text-violet-300">
                  Business
                </div>
                <div className="mt-3 text-xl font-bold text-white">
                  RHs e empresas em escala
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-400">
                  Dossiê completo com agenda de reavaliação, visão gerencial e operação recorrente.
                </p>
                <div className="mt-5 inline-flex rounded-full border border-violet-300/40 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-200">
                  Melhor ajuste para operação recorrente
                </div>
              </div>
              <div
                className="rounded-[24px] border border-white/10 bg-slate-900/80 p-6 hover-lift fade-in"
                style={{ animationDelay: '0.2s' }}
              >
                <div className="text-sm font-bold uppercase tracking-[0.16em] text-violet-300">
                  Enterprise
                </div>
                <div className="mt-3 text-xl font-bold text-white">
                  Estruturas corporativas avançadas
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-400">
                  Governança ampliada, alta escala, fluxos estratégicos e personalização
                  institucional.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10 lg:px-12">
        <div className="rounded-[36px] gradient-cta p-8 shadow-2xl shadow-violet-950/30 md:p-12">
          <div className="max-w-4xl">
            <div className="text-sm font-bold uppercase tracking-[0.2em] text-violet-100">
              Dossiê Comportamental
            </div>
            <h2 className="mt-4 text-3xl font-black text-white md:text-6xl">
              Leve o InsightDISC do relatório para a gestão comportamental contínua.
            </h2>
            <p className="mt-6 text-lg leading-8 text-violet-50/90 md:text-xl">
              Uma camada premium para profissionais, consultorias e empresas que precisam registrar,
              interpretar e acompanhar comportamento com padrão corporativo.
            </p>
          </div>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              to="/Dossier"
              onClick={() => handleCtaClick('final_acessar_modulo')}
              className="inline-flex items-center justify-center rounded-2xl bg-white px-7 py-4 text-base font-bold text-slate-950 transition hover:scale-[1.01] hover-lift"
            >
              Acessar módulo
            </Link>
            <Link
              to="/Pricing"
              onClick={() => handleCtaClick('final_ver_planos')}
              className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-7 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/15 hover-lift"
            >
              Ver planos
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
