import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { HOME_SECTION_LINKS, PRODUCT_TABS } from '@/modules/marketing/landingNavConfig';
import ProductVisualShowcase from '@/components/marketing/ProductVisualShowcase';
import '../styles/landing.css';

const LANDING_TITLE =
  'Dossiê InsightDISC: análise comportamental estruturada para atuação profissional';
const LANDING_DESCRIPTION =
  'Conheça o Dossiê InsightDISC: estrutura avançada de leitura DISC para profissionais de RH, consultoria, coaching e desenvolvimento humano.';

const ANALYTICAL_BLOCKS = Object.freeze([
  'Padrão predominante e combinações comportamentais',
  'Estilo de comunicação e resposta ao ambiente',
  'Tendências de tomada de decisão',
  'Nível de assertividade, ritmo e estabilidade',
  'Indicadores de adaptação e esforço comportamental',
  'Possíveis pontos de tensão e desalinhamento',
]);

const BENEFITS = Object.freeze([
  {
    title: 'Redução de viés interpretativo',
    description: 'A organização dos dados reduz leituras intuitivas e melhora a consistência entre análises.',
  },
  {
    title: 'Maior precisão diagnóstica',
    description: 'Permite identificar padrões com mais clareza e fundamentação.',
  },
  {
    title: 'Agilidade na preparação de devolutivas',
    description: 'Menos tempo organizando informação, mais tempo gerando valor.',
  },
  {
    title: 'Base sólida para entrevistas',
    description: 'Facilita perguntas estratégicas e validações comportamentais.',
  },
  {
    title: 'Apoio em recrutamento e seleção',
    description: 'Melhora a análise de aderência ao cargo e cultura.',
  },
  {
    title: 'Estrutura para desenvolvimento',
    description: 'Identifica pontos de evolução e riscos comportamentais.',
  },
  {
    title: 'Padronização em escala',
    description: 'Ideal para consultorias e equipes de RH.',
  },
]);

const APPLICATIONS = Object.freeze([
  'Recrutamento e seleção',
  'Devolutivas comportamentais',
  'Coaching e mentoria',
  'Desenvolvimento de liderança',
  'Assessment individual',
  'Mapeamento de equipes',
]);

const AUDIENCE = Object.freeze([
  'Analistas comportamentais',
  'Psicólogos organizacionais',
  'Profissionais de RH',
  'Consultores DISC',
  'Coaches e mentores',
  'Especialistas em desenvolvimento humano',
]);

const FLOW_STEPS = Object.freeze([
  {
    title: 'Cadastro do avaliado',
    description:
      'O profissional registra o cliente, candidato ou avaliado na plataforma, criando um histórico centralizado.',
  },
  {
    title: 'Envio da avaliação DISC',
    description: 'A avaliação é enviada por link, permitindo resposta rápida e organizada.',
  },
  {
    title: 'Coleta de anamnese',
    description: 'A análise pode ser complementada com dados contextuais relevantes.',
    bullets: [
      'Momento de carreira',
      'Desafios atuais',
      'Objetivos',
      'Contexto organizacional',
      'Histórico comportamental relevante',
    ],
  },
  {
    title: 'Geração do perfil DISC',
    description: 'Após a resposta, o sistema processa os principais indicadores.',
    bullets: [
      'Perfil predominante',
      'Combinações comportamentais',
      'Padrões de resposta',
      'Indicadores de adaptação',
    ],
  },
  {
    title: 'Acesso ao Dossiê estruturado',
    description: 'A leitura é organizada em blocos técnicos para interpretação profissional.',
    bullets: [
      'Padrão comportamental dominante',
      'Estilo de comunicação',
      'Tomada de decisão',
      'Ritmo e intensidade comportamental',
      'Indicadores de pressão e adaptação',
      'Possíveis pontos de tensão',
    ],
  },
  {
    title: 'Preparação da devolutiva',
    description:
      'Com base no Dossiê, o profissional estrutura sua análise com mais clareza, menos subjetividade e maior consistência.',
  },
  {
    title: 'Agendamento da sessão',
    description: 'O Dossiê pode ser integrado ao fluxo de atendimento.',
    bullets: [
      'Devolutivas individuais',
      'Sessões de coaching',
      'Entrevistas comportamentais',
      'Feedbacks estruturados',
    ],
  },
  {
    title: 'Aplicação prática na sessão',
    description:
      'Durante a sessão, o Dossiê funciona como base técnica para explicar o perfil, validar percepções e gerar insights aplicáveis.',
  },
  {
    title: 'Registro e acompanhamento',
    description: 'O histórico permanece salvo para continuidade e evolução.',
    bullets: ['Acompanhamento da evolução', 'Comparações futuras', 'Continuidade do desenvolvimento'],
  },
]);

const DOSSIE_VISUAL_SHOWCASE = Object.freeze({
  eyebrow: 'Visual técnico',
  title: 'Interpretação DISC apoiada por estrutura visual',
  description:
    'Um conjunto de painéis para transformar dados comportamentais em leitura profissional clara, consistente e aplicável.',
  variant: 'dossie',
  content: {
    radar: {
      title: 'Radar DISC',
      subtitle: 'Intensidade por fator para leitura inicial',
      values: { D: 72, I: 58, S: 47, C: 79 },
    },
    reportStructure: {
      title: 'Estrutura visual do relatório',
      bullets: [
        'Padrão predominante e combinações comportamentais.',
        'Estilo de comunicação e resposta ao ambiente.',
        'Tomada de decisão, ritmo e estabilidade.',
        'Indicadores de adaptação e possíveis pontos de tensão.',
      ],
    },
    flow: {
      title: 'Fluxo de leitura',
      stages: [
        {
          title: 'Entrada',
          description: 'Coleta de dados da avaliação e contexto do avaliado.',
        },
        {
          title: 'Análise',
          description: 'Processamento DISC com organização em blocos técnicos.',
        },
        {
          title: 'Saída',
          description: 'Dossiê estruturado para devolutiva e decisão profissional.',
        },
      ],
    },
  },
});

function upsertMetaTag(selector, attrs, content, createdMetas, previousMetaContents) {
  let tag = document.head.querySelector(selector);
  let created = false;

  if (!tag) {
    tag = document.createElement('meta');
    Object.entries(attrs).forEach(([key, value]) => {
      tag.setAttribute(key, value);
    });
    document.head.appendChild(tag);
    created = true;
  }

  previousMetaContents.push([tag, tag.getAttribute('content')]);
  tag.setAttribute('content', content);

  if (created) {
    createdMetas.push(tag);
  }
}

export default function DossieComportamentalLandingPage() {
  const rootRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavSticky, setIsNavSticky] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const previousTitle = document.title;
    const previousLang = htmlEl.lang;
    const htmlClassesToAdd = ['h-full', 'scroll-smooth', 'landing-html'];
    const bodyClassesToAdd = ['h-full', 'gradient-bg', 'text-white', 'overflow-auto', 'landing-body'];
    const createdMetas = [];
    const previousMetaContents = [];

    document.title = LANDING_TITLE;
    htmlEl.lang = 'pt-BR';
    htmlClassesToAdd.forEach((className) => htmlEl.classList.add(className));
    bodyClassesToAdd.forEach((className) => bodyEl.classList.add(className));

    upsertMetaTag(
      'meta[name="description"]',
      { name: 'description' },
      LANDING_DESCRIPTION,
      createdMetas,
      previousMetaContents
    );
    upsertMetaTag('meta[property="og:title"]', { property: 'og:title' }, LANDING_TITLE, createdMetas, previousMetaContents);
    upsertMetaTag(
      'meta[property="og:description"]',
      { property: 'og:description' },
      LANDING_DESCRIPTION,
      createdMetas,
      previousMetaContents
    );
    upsertMetaTag('meta[property="og:type"]', { property: 'og:type' }, 'website', createdMetas, previousMetaContents);
    upsertMetaTag('meta[property="og:image"]', { property: 'og:image' }, '/brand/og.svg', createdMetas, previousMetaContents);
    upsertMetaTag(
      'meta[name="twitter:card"]',
      { name: 'twitter:card' },
      'summary_large_image',
      createdMetas,
      previousMetaContents
    );

    const revealTargets = root.querySelectorAll('.scroll-reveal');
    let observer;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -80px 0px' }
      );
      revealTargets.forEach((target) => observer.observe(target));
    } else {
      revealTargets.forEach((target) => target.classList.add('visible'));
    }

    const handleScroll = () => setIsNavSticky(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    trackEvent('dossier_landing_view', { path: '/dossie' });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (observer) observer.disconnect();

      previousMetaContents.forEach(([tag, previousContent]) => {
        if (!tag.isConnected) return;
        if (previousContent === null) {
          tag.removeAttribute('content');
        } else {
          tag.setAttribute('content', previousContent);
        }
      });
      createdMetas.forEach((tag) => {
        if (tag.isConnected) tag.remove();
      });

      document.title = previousTitle;
      htmlEl.lang = previousLang;
      htmlClassesToAdd.forEach((className) => htmlEl.classList.remove(className));
      bodyClassesToAdd.forEach((className) => bodyEl.classList.remove(className));
    };
  }, []);

  const trackCta = (source) => {
    trackEvent('dossier_cta_click', { path: '/dossie', source });
  };

  return (
    <div ref={rootRef} className="landing-page dossie-landing h-full gradient-bg text-white overflow-x-hidden overflow-y-auto">
      <div className="min-h-full w-full">
        <nav id="navbar" className={`fixed left-0 right-0 top-0 z-50 glass-card transition-all duration-300 ${isNavSticky ? 'nav-sticky' : ''}`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl disc-gradient flex items-center justify-center">
                  <span className="text-white text-lg font-extrabold">ID</span>
                </div>
                <span className="text-xl font-bold">InsightDISC</span>
              </Link>

              <div className="hidden lg:flex items-center gap-5 text-sm">
                {HOME_SECTION_LINKS.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className={item.featured ? 'planos-nav-link' : 'text-slate-300 hover:text-white transition-colors'}
                  >
                    {item.label}
                  </Link>
                ))}
                {PRODUCT_TABS.map((tab) => (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    aria-current={tab.to === '/dossie' ? 'page' : undefined}
                    className={`transition-all ${
                      tab.to === '/dossie'
                        ? 'text-white bg-white/10 border border-white/15 rounded-lg px-3 py-1.5'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </Link>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <Link to="/Login" className="hidden sm:inline-flex text-slate-300 hover:text-white transition-colors font-medium">Entrar</Link>
                <Link to="/planos" className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm">Ver planos</Link>
                <button
                  type="button"
                  className="lg:hidden text-slate-300 hover:text-white"
                  onClick={() => setMobileMenuOpen((prev) => !prev)}
                  aria-label="Abrir menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
                  </svg>
                </button>
              </div>
            </div>

            <div className={`${mobileMenuOpen ? 'block' : 'hidden'} lg:hidden mt-4 pb-4 space-y-3 border-t border-slate-700 pt-4`}>
              {HOME_SECTION_LINKS.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 transition-colors ${
                    item.featured
                      ? 'planos-nav-link-mobile'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {PRODUCT_TABS.map((tab) => (
                <Link
                  key={tab.to}
                  to={tab.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 transition-colors ${
                    tab.to === '/dossie' ? 'text-white font-semibold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <section className="relative min-h-screen flex items-center pt-28 px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute top-36 right-16 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto relative z-10 w-full">
            <div className="grid lg:grid-cols-2 gap-14 xl:gap-16 items-center">
              <div className="lg:pr-3 xl:pr-6">
                <div className="fade-up inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full mb-8" style={{ animationDuration: '.5s' }}>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-sm text-slate-300">Funcionalidade avançada para especialistas DISC</span>
                </div>
                <h1 className="fade-up hero-gradient-title text-4xl md:text-5xl xl:text-6xl font-extrabold leading-tight mb-6" style={{ animationDelay: '.1s', animationDuration: '.55s' }}>
                  Dossiê InsightDISC: análise comportamental estruturada para <span className="headline-accent">atuação profissional</span>
                </h1>
                <p className="fade-up text-lg md:text-2xl text-slate-300 leading-relaxed max-w-3xl mb-8" style={{ animationDelay: '.2s', animationDuration: '.55s' }}>
                  Uma camada avançada de interpretação DISC, organizada para profissionais que demandam precisão, profundidade e aplicabilidade prática no dia a dia.
                </p>

                <div className="fade-up flex flex-col sm:flex-row gap-4 mb-10" style={{ animationDelay: '.3s', animationDuration: '.55s' }}>
                  <a href="#como-funciona" className="btn-primary px-8 py-4 rounded-2xl font-bold text-lg" onClick={() => trackCta('hero_explorar')}>Explorar o Dossiê na prática</a>
                  <a href="#estrutura-analitica" className="btn-secondary glass-card px-8 py-4 rounded-2xl font-bold text-lg text-slate-200 border border-white/10" onClick={() => trackCta('hero_demo_tecnica')}>Ver demonstração técnica</a>
                </div>
              </div>

              <div className="fade-up" style={{ animationDelay: '.25s', animationDuration: '.55s' }}>
                <div className="glass-card rounded-[28px] p-5">
                  <div className="grid gap-4">
                    <div className="mock-card rounded-2xl p-5">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-2">Leitura técnica estruturada</p>
                      <h3 className="text-xl font-bold mb-3">Dashboard analítico do Dossiê</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-white/5 p-3">
                          <p className="text-slate-400">Padrão dominante</p>
                          <p className="text-lg font-bold mt-1">DI com adaptação S</p>
                        </div>
                        <div className="rounded-xl bg-white/5 p-3">
                          <p className="text-slate-400">Tomada de decisão</p>
                          <p className="text-lg font-bold mt-1">Rápida e orientada a meta</p>
                        </div>
                        <div className="rounded-xl bg-white/5 p-3 col-span-2">
                          <p className="text-slate-400">Ponto de atenção</p>
                          <p className="text-base font-semibold mt-1">Sob pressão, pode reduzir escuta e elevar reatividade.</p>
                        </div>
                      </div>
                    </div>

                    <div className="mock-card rounded-2xl p-5">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-3">Estrutura profissional</p>
                      <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-300">
                        {[
                          'Comunicação e interação',
                          'Ritmo e intensidade',
                          'Adaptação e esforço',
                          'Sinais de tensão e desalinhamento',
                        ].map((item) => (
                          <div key={item} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">{item}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <ProductVisualShowcase
          eyebrow={DOSSIE_VISUAL_SHOWCASE.eyebrow}
          title={DOSSIE_VISUAL_SHOWCASE.title}
          description={DOSSIE_VISUAL_SHOWCASE.description}
          variant={DOSSIE_VISUAL_SHOWCASE.variant}
          content={DOSSIE_VISUAL_SHOWCASE.content}
        />

        <section id="o-que-e" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-stretch">
              <div className="scroll-reveal glass-card rounded-3xl p-8 md:p-10">
                <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-4">O que é o Dossiê</p>
                <h2 className="text-3xl md:text-4xl font-extrabold leading-tight mb-5">Uma estrutura técnica para leitura DISC com rigor profissional</h2>
                <p className="text-slate-300 text-lg leading-relaxed mb-4">
                  A aba Dossiê do InsightDISC foi concebida para suportar uma leitura técnica e sistematizada do perfil comportamental, indo além da apresentação tradicional de fatores DISC.
                </p>
                <p className="text-slate-400 leading-relaxed mb-6">
                  Ela consolida variáveis relevantes do comportamento em uma estrutura analítica organizada, permitindo ao profissional interpretar padrões com maior consistência, reduzir subjetividade e apoiar decisões com base em evidências comportamentais.
                </p>
                <div className="rounded-2xl border border-blue-400/25 bg-blue-500/10 p-5 text-blue-100 font-semibold">
                  Não é apenas um relatório. É uma ferramenta de análise profissional.
                </div>
              </div>

              <div className="scroll-reveal grid gap-4">
                {[
                  'Interpretar padrões com maior consistência',
                  'Reduzir subjetividade na leitura',
                  'Estruturar hipóteses comportamentais mais assertivas',
                  'Apoiar decisões com base em evidências comportamentais',
                ].map((item, index) => (
                  <div key={item} className="dossie-card rounded-2xl glass-card p-6 flex items-start gap-3" style={{ animationDelay: `${index * 0.06}s` }}>
                    <span className="mt-1 w-2.5 h-2.5 bg-cyan-400 rounded-full shrink-0"></span>
                    <p className="text-slate-200 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="py-24 px-6 bg-slate-900/35 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-14 scroll-reveal">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Fluxo operacional</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Como funciona na prática</h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                Um fluxo completo e rastreável, da coleta inicial ao acompanhamento contínuo, com excelente escaneabilidade para uso diário.
              </p>
            </div>

            <div className="grid gap-5">
              {FLOW_STEPS.map((step, index) => (
                <article key={step.title} className="scroll-reveal dossie-card rounded-2xl glass-card p-6 md:p-7" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="flex flex-col md:flex-row md:items-start gap-5">
                    <div className="h-11 w-11 rounded-full bg-blue-500/20 border border-blue-400/35 text-blue-200 font-extrabold flex items-center justify-center shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold leading-tight mb-2">{step.title}</h3>
                      <p className="text-slate-300 leading-relaxed">{step.description}</p>
                      {step.bullets ? (
                        <div className="mt-4 grid sm:grid-cols-2 gap-2">
                          {step.bullets.map((bullet) => (
                            <div key={bullet} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-slate-300">
                              {bullet}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="estrutura-analitica" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12 scroll-reveal">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Estrutura analítica</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Blocos de leitura profissional</h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                Essa estrutura facilita a leitura cruzada dos fatores DISC, permitindo uma análise mais refinada do comportamento.
              </p>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {ANALYTICAL_BLOCKS.map((item, index) => (
                <div key={item} className="scroll-reveal dossie-card rounded-2xl glass-card p-6" style={{ animationDelay: `${index * 0.07}s` }}>
                  <p className="text-lg font-semibold leading-snug">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6 bg-slate-900/35 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12 scroll-reveal">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Benefícios para o profissional</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Mais consistência técnica, mais segurança na decisão</h2>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {BENEFITS.map((item, index) => (
                <div key={item.title} className="scroll-reveal dossie-card rounded-2xl glass-card p-6" style={{ animationDelay: `${index * 0.07}s` }}>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12 scroll-reveal">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Aplicações profissionais</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Onde o Dossiê gera valor na prática</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {APPLICATIONS.map((item, index) => (
                <div key={item} className="scroll-reveal dossie-card rounded-2xl glass-card px-5 py-4 font-semibold text-slate-200 border border-white/10" style={{ animationDelay: `${index * 0.07}s` }}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="scroll-reveal rounded-[28px] glass-card p-8 md:p-12 border border-blue-500/20">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Diferencial técnico</p>
              <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-6">
                Diferente de relatórios tradicionais, o Dossiê não apenas descreve o perfil, ele organiza o raciocínio analítico do profissional.
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed max-w-4xl">
                Funciona como uma camada entre o dado bruto e a decisão, reduzindo ruído interpretativo e aumentando a confiabilidade da análise.
              </p>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 bg-slate-900/35 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12 scroll-reveal">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Para quem é</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Perfis ideais de uso profissional</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {AUDIENCE.map((item, index) => (
                <div key={item} className="scroll-reveal dossie-card rounded-2xl glass-card p-5 border border-white/10" style={{ animationDelay: `${index * 0.06}s` }}>
                  <p className="font-semibold">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="scroll-reveal cta-focus dossie-cta-highlight rounded-[30px] glass-card border border-white/10 p-8 md:p-12 text-center">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-4">Pronto para aplicar</p>
              <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-5">
                Transforme leitura comportamental em decisão profissional com a base certa de plano e operação.
              </h2>
              <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mx-auto">
                Escolha o plano ideal para aplicar o Dossiê com consistência técnica no seu fluxo de atendimento.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/planos" className="btn-primary px-8 py-4 rounded-2xl font-bold text-lg mx-auto" onClick={() => trackCta('cta_ir_para_planos')}>
                  Ver planos para aplicar o Dossiê
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-14 px-6 border-t border-slate-800">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="disc-gradient w-10 h-10 rounded-xl flex items-center justify-center">
                <span className="text-lg font-extrabold text-white">ID</span>
              </div>
              <span className="text-xl font-bold text-white">InsightDISC</span>
            </div>
            <p className="text-sm text-slate-500 text-center md:text-right">
              © {new Date().getFullYear()} InsightDISC. Plataforma de inteligência comportamental.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
