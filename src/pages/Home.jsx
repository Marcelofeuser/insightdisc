import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/landing.css';

const LANDING_TITLE = 'InsightDISC - Plataforma de Inteligência Comportamental';
const LANDING_DESCRIPTION =
  'InsightDISC — Plataforma de Inteligência Comportamental para avaliação individual, comparação de perfis, recrutamento e inteligência de equipes.';
const HERO_HIGHLIGHTS = Object.freeze([
  {
    title: 'Perfil',
    description: 'Leitura individual detalhada',
  },
  {
    title: 'Comparação',
    description: 'Pessoa x pessoa e pessoa x cargo',
  },
  {
    title: 'Team Map',
    description: 'Distribuição e inteligência de equipe',
  },
  {
    title: 'PDF',
    description: 'Relatório premium exportável',
  },
]);

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

export default function Home() {
  const rootRef = useRef(null);

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
    upsertMetaTag(
      'meta[property="og:title"]',
      { property: 'og:title' },
      LANDING_TITLE,
      createdMetas,
      previousMetaContents
    );
    upsertMetaTag(
      'meta[property="og:description"]',
      { property: 'og:description' },
      LANDING_DESCRIPTION,
      createdMetas,
      previousMetaContents
    );
    upsertMetaTag(
      'meta[property="og:type"]',
      { property: 'og:type' },
      'website',
      createdMetas,
      previousMetaContents
    );
    upsertMetaTag(
      'meta[property="og:image"]',
      { property: 'og:image' },
      '/brand/og.svg',
      createdMetas,
      previousMetaContents
    );
    upsertMetaTag(
      'meta[name="twitter:card"]',
      { name: 'twitter:card' },
      'summary_large_image',
      createdMetas,
      previousMetaContents
    );

    const menuToggle = root.querySelector('#menu-toggle');
    const mobileMenu = root.querySelector('#mobile-menu');
    const navbar = root.querySelector('#navbar');
    const faqToggles = root.querySelectorAll('.faq-toggle');
    const anchorLinks = root.querySelectorAll('a[href^="#"]');
    const scrollRevealEls = root.querySelectorAll('.scroll-reveal');

    const cleanupFns = [];

    if (menuToggle && mobileMenu) {
      const handleMenuToggle = () => {
        mobileMenu.classList.toggle('hidden');
      };
      menuToggle.addEventListener('click', handleMenuToggle);
      cleanupFns.push(() => menuToggle.removeEventListener('click', handleMenuToggle));

      mobileMenu.querySelectorAll('a').forEach((link) => {
        const handleMobileMenuLinkClick = () => {
          mobileMenu.classList.add('hidden');
        };
        link.addEventListener('click', handleMobileMenuLinkClick);
        cleanupFns.push(() => link.removeEventListener('click', handleMobileMenuLinkClick));
      });
    }

    if (navbar) {
      const handleScroll = () => {
        if (window.scrollY > 50) {
          navbar.classList.add('nav-sticky');
        } else {
          navbar.classList.remove('nav-sticky');
        }
      };
      window.addEventListener('scroll', handleScroll, { passive: true });
      handleScroll();
      cleanupFns.push(() => window.removeEventListener('scroll', handleScroll));
    }

    faqToggles.forEach((toggle) => {
      const handleFaqToggle = () => {
        const container = toggle.parentElement;
        if (!container) return;

        const faqItem = container.querySelector('.faq-item');
        const icon = toggle.querySelector('.faq-icon');
        if (!faqItem || !icon) return;

        root.querySelectorAll('.faq-item').forEach((item) => {
          if (item !== faqItem) {
            item.classList.remove('active');
            const itemContainer = item.parentElement;
            const itemIcon = itemContainer ? itemContainer.querySelector('.faq-icon') : null;
            if (itemIcon) {
              itemIcon.textContent = '+';
            }
          }
        });

        faqItem.classList.toggle('active');
        icon.textContent = faqItem.classList.contains('active') ? '−' : '+';
      };

      toggle.addEventListener('click', handleFaqToggle);
      cleanupFns.push(() => toggle.removeEventListener('click', handleFaqToggle));
    });


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
        {
          threshold: 0.1,
          rootMargin: '0px 0px -100px 0px',
        }
      );

      scrollRevealEls.forEach((el) => observer.observe(el));
    } else {
      scrollRevealEls.forEach((el) => el.classList.add('visible'));
    }

    anchorLinks.forEach((anchor) => {
      const handleAnchorClick = (event) => {
        const href = anchor.getAttribute('href');
        if (!href || href === '#') return;

        const target = root.querySelector(href);
        if (!target) return;

        event.preventDefault();
        const offsetTop = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({
          top: offsetTop,
          behavior: 'smooth',
        });
      };

      anchor.addEventListener('click', handleAnchorClick);
      cleanupFns.push(() => anchor.removeEventListener('click', handleAnchorClick));
    });

    return () => {
      cleanupFns.forEach((cleanup) => cleanup());
      if (observer) {
        observer.disconnect();
      }

      previousMetaContents.forEach(([tag, previousContent]) => {
        if (!tag.isConnected) return;
        if (previousContent === null) {
          tag.removeAttribute('content');
        } else {
          tag.setAttribute('content', previousContent);
        }
      });
      createdMetas.forEach((tag) => {
        if (tag.isConnected) {
          tag.remove();
        }
      });

      document.title = previousTitle;
      htmlEl.lang = previousLang;
      htmlClassesToAdd.forEach((className) => htmlEl.classList.remove(className));
      bodyClassesToAdd.forEach((className) => bodyEl.classList.remove(className));
    };
  }, []);

  return (
    <div ref={rootRef} className="landing-page h-full gradient-bg text-white overflow-x-hidden overflow-y-auto">
<div className="min-h-full w-full">
   
   <nav id="navbar" className="fixed top-0 left-0 right-0 z-50 glass-card transition-all duration-300">
    <div className="max-w-7xl mx-auto px-6 py-4">
     <div className="flex items-center justify-between">
      <Link to="/" className="flex items-center gap-3">
       <div className="w-10 h-10 rounded-xl disc-gradient flex items-center justify-center">
        <span className="text-white text-lg font-extrabold">ID</span>
       </div>
       <span className="text-xl font-bold">InsightDISC</span>
      </Link>
      <div className="hidden lg:flex items-center gap-5 text-sm">
       <a href="#plataforma" className="text-slate-300 hover:text-white transition-colors">Plataforma</a>
       <a href="#publicos" className="text-slate-300 hover:text-white transition-colors">Para quem é</a>
       <a href="#recursos" className="text-slate-300 hover:text-white transition-colors">Recursos</a>
       <a href="#casos" className="text-slate-300 hover:text-white transition-colors">Casos de uso</a>
       <Link to="/planos" className="planos-nav-link">Planos</Link>
       <Link to="/dossie" className="text-slate-300 hover:text-white transition-colors">Dossiê</Link>
       <Link to="/personal" className="text-slate-300 hover:text-white transition-colors">Personal</Link>
       <Link to="/profissional" className="text-slate-300 hover:text-white transition-colors">Profissional</Link>
       <Link to="/business" className="text-slate-300 hover:text-white transition-colors">Business</Link>
      </div>
      <div className="flex items-center gap-3">
       <Link to="/Login" className="hidden sm:inline-flex text-slate-300 hover:text-white transition-colors font-medium">Entrar</Link>
       <Link to="/planos" className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm">Ver planos</Link>
      </div>
      <button id="menu-toggle" className="lg:hidden text-slate-300 hover:text-white">
       <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
       </svg>
      </button>
     </div>
     <div id="mobile-menu" className="hidden lg:hidden mt-4 pb-4 space-y-3 border-t border-slate-700 pt-4">
      <a href="#plataforma" className="block text-slate-300 hover:text-white transition-colors py-2">Plataforma</a>
      <a href="#publicos" className="block text-slate-300 hover:text-white transition-colors py-2">Para quem é</a>
      <a href="#recursos" className="block text-slate-300 hover:text-white transition-colors py-2">Recursos</a>
      <a href="#casos" className="block text-slate-300 hover:text-white transition-colors py-2">Casos de uso</a>
      <Link to="/planos" className="block py-2 planos-nav-link-mobile">Planos</Link>
      <Link to="/dossie" className="block text-slate-300 hover:text-white transition-colors py-2">Dossiê</Link>
      <Link to="/personal" className="block text-slate-300 hover:text-white transition-colors py-2">Personal</Link>
      <Link to="/profissional" className="block text-slate-300 hover:text-white transition-colors py-2">Profissional</Link>
      <Link to="/business" className="block text-slate-300 hover:text-white transition-colors py-2">Business</Link>
     </div>
    </div>
   </nav>
   <section className="relative min-h-screen flex items-center pt-24 px-6 overflow-hidden">
    <div className="absolute inset-0 pointer-events-none">
     <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
     <div className="absolute top-40 right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"></div>
     <div className="absolute bottom-16 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"></div>
    </div>
    <div className="max-w-7xl mx-auto relative z-10 w-full">
     <div className="grid lg:grid-cols-2 gap-14 xl:gap-16 items-center">
      <div className="lg:pr-3 xl:pr-6">
       <div className="fade-up inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full mb-8">
        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> <span className="text-sm text-slate-300">Plataforma premium para uso pessoal, profissional e empresarial</span>
       </div>
       <h1 className="fade-up text-5xl md:text-6xl xl:text-7xl font-extrabold leading-tight mb-6" style={{ animationDelay: '.1s' }}>Plataforma de <span className="block disc-gradient bg-clip-text text-transparent hero-gradient-text"> inteligência comportamental </span> com assinatura para pessoas, líderes e empresas</h1>
       <p className="fade-up text-xl md:text-2xl text-slate-400 leading-relaxed max-w-2xl mb-8" style={{ animationDelay: '.2s' }}>Análise DISC aprofundada, dossiê técnico, comparação de perfis e inteligência de equipe em um fluxo comercial claro e escalável.</p>
       <div className="fade-up flex flex-col sm:flex-row gap-4 mb-10" style={{ animationDelay: '.3s' }}>
        <Link to="/planos" className="btn-primary px-8 py-4 rounded-2xl font-bold text-lg hover:shadow-lg transition-all"> Escolher meu plano </Link> <a href="#plataforma" className="btn-secondary glass-card px-8 py-4 rounded-2xl font-bold text-lg text-slate-200 border border-white/10" data-testid="home-cta-secondary"> Ver demonstração </a>
       </div>
       <div className="fade-up hero-highlight-grid" style={{ animationDelay: '.4s' }}>
        {HERO_HIGHLIGHTS.map((item) => (
          <div key={item.title} className="glass-card hero-highlight-card hover:border-blue-500/30 transition-all">
           <p className="hero-highlight-title">
            {item.title}
           </p>
           <p className="hero-highlight-copy">
            {item.description}
           </p>
          </div>
        ))}
       </div>
      </div>
      <div className="fade-up" style={{ animationDelay: '.25s' }}>
       <div className="glass-card rounded-[28px] p-5">
        <div className="grid gap-4">
         <div className="mock-card rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
           <div>
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Dashboard</p>
            <h3 className="text-lg font-bold">Painel por persona</h3>
           </div><span className="px-3 py-1 rounded-full bg-blue-500/15 text-blue-300 text-xs font-semibold">Business</span>
          </div>
          <div className="grid grid-cols-4 gap-3">
           <div className="rounded-xl bg-white/5 p-3 hover:bg-white/10 transition-all">
            <div className="text-sm text-slate-400">
             Avaliações
            </div>
            <div className="text-2xl font-bold mt-1">
             124
            </div>
           </div>
           <div className="rounded-xl bg-white/5 p-3 hover:bg-white/10 transition-all">
            <div className="text-sm text-slate-400">
             Relatórios
            </div>
            <div className="text-2xl font-bold mt-1">
             98
            </div>
           </div>
           <div className="rounded-xl bg-white/5 p-3 hover:bg-white/10 transition-all">
            <div className="text-sm text-slate-400">
             Comparações
            </div>
            <div className="text-2xl font-bold mt-1">
             36
            </div>
           </div>
           <div className="rounded-xl bg-white/5 p-3 hover:bg-white/10 transition-all">
            <div className="text-sm text-slate-400">
             Times
            </div>
            <div className="text-2xl font-bold mt-1">
             12
            </div>
           </div>
          </div>
         </div>
         <div className="grid md:grid-cols-2 gap-4">
          <div className="mock-card rounded-2xl p-4">
           <p className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-2">Relatório premium</p>
           <h4 className="font-bold mb-3">Dossiê comportamental</h4>
           <div className="space-y-2 text-sm text-slate-400">
            <div className="h-3 rounded bg-white/10"></div>
            <div className="h-3 rounded bg-white/10 w-5/6"></div>
            <div className="h-3 rounded bg-white/10 w-4/6"></div>
            <div className="h-3 rounded bg-white/10 w-3/6"></div>
           </div>
          </div>
          <div className="mock-card rounded-2xl p-4">
           <p className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-2">Comparação</p>
           <h4 className="font-bold mb-3">Pessoa x cargo ideal</h4>
           <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-slate-400">Aderência</span><span className="font-bold text-green-400">82%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
             <div className="bg-green-400 h-2 rounded-full" style={{ width: '82%' }}></div>
            </div>
            <div className="text-xs text-slate-400">
             Leitura automática de fit comportamental para recrutamento e alocação.
            </div>
           </div>
          </div>
         </div>
         <div className="mock-card rounded-2xl p-4">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-2">Mapa organizacional</p>
          <h4 className="font-bold mb-3">Inteligência de equipe</h4>
          <div className="grid grid-cols-4 gap-2 text-center text-sm">
           <div className="rounded-xl bg-red-500/15 text-red-300 p-3 hover:bg-red-500/25 transition-all cursor-pointer">
            D<br /><strong>28%</strong>
           </div>
           <div className="rounded-xl bg-amber-500/15 text-amber-300 p-3 hover:bg-amber-500/25 transition-all cursor-pointer">
            I<br /><strong>22%</strong>
           </div>
           <div className="rounded-xl bg-green-500/15 text-green-300 p-3 hover:bg-green-500/25 transition-all cursor-pointer">
            S<br /><strong>31%</strong>
           </div>
           <div className="rounded-xl bg-blue-500/15 text-blue-300 p-3 hover:bg-blue-500/25 transition-all cursor-pointer">
            C<br /><strong>19%</strong>
           </div>
          </div>
         </div>
        </div>
       </div>
      </div>
     </div>
    </div>
   </section>
   <section id="plataforma" className="py-24 px-6">
    <div className="max-w-7xl mx-auto">
     <div className="text-center mb-14">
      <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Tudo o que você precisa para aplicar DISC na prática</h2>
      <p className="text-xl text-slate-400 max-w-3xl mx-auto">Da leitura individual ao recrutamento, da liderança à composição de equipes.</p>
     </div>
     <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-2xl font-bold mb-3">Perfil individual</h3>
       <p className="text-slate-400">Entenda forças, pontos de atenção, estilo de comunicação, ambiente ideal e desenvolvimento pessoal.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-2xl font-bold mb-3">Relatório premium</h3>
       <p className="text-slate-400">Gere dossiês comportamentais completos em HTML e PDF, com leitura técnica, executiva e prática.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-2xl font-bold mb-3">Comparação de perfis</h3>
       <p className="text-slate-400">Compare pessoas, líderes e liderados, candidato x cargo ideal e membro x equipe com leitura estratégica.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-2xl font-bold mb-3">Recrutamento inteligente</h3>
       <p className="text-slate-400">Analise aderência comportamental à vaga, reduza decisões subjetivas e aumente segurança na contratação.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-2xl font-bold mb-3">Mapa de equipe</h3>
       <p className="text-slate-400">Visualize distribuição DISC, lacunas, riscos de composição, perfis predominantes e equilíbrio organizacional.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-2xl font-bold mb-3">Liderança e desenvolvimento</h3>
       <p className="text-slate-400">Obtenha leituras automáticas de liderança, pressão, decisão, comunicação e gestão de conflitos.</p>
      </div>
     </div>
    </div>
   </section>
   <section id="publicos" className="py-24 px-6">
    <div className="max-w-7xl mx-auto">
     <div className="text-center mb-14">
      <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Uma plataforma, vários contextos de uso</h2>
      <p className="text-xl text-slate-400 max-w-3xl mx-auto">InsightDISC foi pensada para diferentes perfis de uso, sem perder profundidade.</p>
     </div>
     <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Empresas e RH</h3>
       <p className="text-slate-400">Use DISC para recrutamento, formação de equipes, liderança, cultura e desenvolvimento interno.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Consultores e analistas</h3>
       <p className="text-slate-400">Atenda clientes com relatórios premium, comparações e leitura profissional de perfis.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Líderes e gestores</h3>
       <p className="text-slate-400">Entenda como liderar melhor cada perfil e melhore a dinâmica do time com dados comportamentais.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Desenvolvimento pessoal</h3>
       <p className="text-slate-400">Descubra seu estilo, aprimore sua comunicação e crie um plano de desenvolvimento mais preciso.</p>
      </div>
     </div>
    </div>
   </section>
   <section id="recursos" className="py-24 px-6">
    <div className="max-w-7xl mx-auto">
     <div className="text-center mb-14">
      <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Por que a InsightDISC não é só mais um teste DISC</h2>
      <p className="text-xl text-slate-400 max-w-3xl mx-auto">Porque ela transforma perfil em decisão prática.</p>
     </div>
     <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Leitura aplicada</h3>
       <p className="text-slate-400">Não entregamos apenas pontuações. Entregamos contexto, interpretação e recomendação prática.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Comparação estratégica</h3>
       <p className="text-slate-400">Pessoa x pessoa, líder x liderado, candidato x vaga, membro x equipe.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Inteligência de equipe</h3>
       <p className="text-slate-400">Veja lacunas, excessos de perfil, riscos de composição e oportunidades de equilíbrio.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Recrutamento com aderência</h3>
       <p className="text-slate-400">Apoie decisões de contratação com base em fit comportamental para a função.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Relatório premium</h3>
       <p className="text-slate-400">Relatórios completos em tela e PDF para uso individual, corporativo e consultivo.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Plataforma SaaS</h3>
       <p className="text-slate-400">Painel por persona, créditos, planos, controle de uso e estrutura pronta para escalar.</p>
      </div>
     </div>
    </div>
   </section>
   <section id="casos" className="py-24 px-6">
    <div className="max-w-7xl mx-auto">
     <div className="text-center mb-14">
      <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Onde a plataforma gera valor de verdade</h2>
      <p className="text-xl text-slate-400 max-w-3xl mx-auto">Casos de uso reais para empresas, consultores e líderes.</p>
     </div>
     <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Contratação</h3>
       <p className="text-slate-400">Compare candidatos com o perfil ideal da vaga e aumente a consistência da escolha.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Desenvolvimento de líderes</h3>
       <p className="text-slate-400">Entenda como cada líder decide, reage à pressão e se comunica com diferentes perfis.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Composição de equipes</h3>
       <p className="text-slate-400">Veja o equilíbrio comportamental do time e identifique onde faltam repertórios.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Consultoria comportamental</h3>
       <p className="text-slate-400">Atenda clientes com uma entrega muito mais robusta do que um laudo DISC básico.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Autoconhecimento</h3>
       <p className="text-slate-400">Entenda seu estilo predominante e crie um plano claro de desenvolvimento.</p>
      </div>
      <div className="glass-card rounded-3xl p-8 feature-card scroll-reveal">
       <h3 className="text-xl font-bold mb-3">Cultura e performance</h3>
       <p className="text-slate-400">Use dados comportamentais para apoiar comunicação, engajamento e decisão organizacional.</p>
      </div>
     </div>
    </div>
   </section>
   <section id="planos" className="py-24 px-6 bg-gradient-to-b from-slate-900/50 to-transparent border-y border-white/5">
    <div className="max-w-7xl mx-auto">
     <div className="text-center mb-14">
      <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Compare o que você acessa em cada plano</h2>
      <p className="text-xl text-slate-400 max-w-3xl mx-auto">Do uso individual à gestão de equipes completas.</p>
     </div>
     <div className="scroll-reveal overflow-x-auto rounded-3xl glass-card border border-white/10">
      <table className="w-full text-left min-w-[980px]">
       <thead>
        <tr className="border-b border-slate-700/70">
         <th className="py-4 px-6 font-bold text-base md:text-lg text-slate-200">Acesso</th>
         <th className="py-4 px-6 font-bold text-base md:text-lg text-slate-200 text-center">Personal</th>
         <th className="py-4 px-6 font-bold text-base md:text-lg text-slate-200 text-center">Insider</th>
         <th className="py-4 px-6 font-bold text-base md:text-lg bg-blue-500/10 text-blue-300 text-center">Profissional</th>
         <th className="py-4 px-6 font-bold text-base md:text-lg text-slate-200 text-center">Business</th>
         <th className="py-4 px-6 font-bold text-base md:text-lg text-slate-200 text-center">Diamond</th>
        </tr>
       </thead>
       <tbody className="divide-y divide-slate-700/50">
        <tr className="hover:bg-white/5 transition-colors">
         <td className="py-4 px-6 text-slate-300">Acesso à plataforma</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center bg-blue-500/5 text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
        </tr>
        <tr className="hover:bg-white/5 transition-colors">
         <td className="py-4 px-6 text-slate-300">Relatórios DISC</td>
         <td className="py-4 px-6 text-center text-slate-200">1 relatório/mês</td>
         <td className="py-4 px-6 text-center text-slate-200">Acesso avançado mensal</td>
         <td className="py-4 px-6 text-center bg-blue-500/5 text-slate-100">10 créditos/mês</td>
         <td className="py-4 px-6 text-center text-slate-200">25 créditos/mês</td>
         <td className="py-4 px-6 text-center text-slate-100 font-semibold">Ilimitado</td>
        </tr>
        <tr className="hover:bg-white/5 transition-colors">
         <td className="py-4 px-6 text-slate-300">Dossiê comportamental</td>
         <td className="py-4 px-6 text-center text-slate-500">—</td>
         <td className="py-4 px-6 text-center text-slate-500">—</td>
         <td className="py-4 px-6 text-center bg-blue-500/5 text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
        </tr>
        <tr className="hover:bg-white/5 transition-colors">
         <td className="py-4 px-6 text-slate-300">Histórico de relatórios</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center bg-blue-500/5 text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
        </tr>
        <tr className="hover:bg-white/5 transition-colors">
         <td className="py-4 px-6 text-slate-300">Team Map</td>
         <td className="py-4 px-6 text-center text-slate-500">—</td>
         <td className="py-4 px-6 text-center text-slate-500">—</td>
         <td className="py-4 px-6 text-center bg-blue-500/5 text-slate-500">—</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
        </tr>
        <tr className="hover:bg-white/5 transition-colors">
         <td className="py-4 px-6 text-slate-300">Análise de equipe</td>
         <td className="py-4 px-6 text-center text-slate-500">—</td>
         <td className="py-4 px-6 text-center text-slate-500">—</td>
         <td className="py-4 px-6 text-center bg-blue-500/5 text-slate-500">—</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
        </tr>
        <tr className="hover:bg-white/5 transition-colors">
         <td className="py-4 px-6 text-slate-300">Uso profissional</td>
         <td className="py-4 px-6 text-center text-slate-500">—</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center bg-blue-500/5 text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
        </tr>
        <tr className="hover:bg-white/5 transition-colors">
         <td className="py-4 px-6 text-slate-300">Uso empresarial</td>
         <td className="py-4 px-6 text-center text-slate-500">—</td>
         <td className="py-4 px-6 text-center text-slate-500">—</td>
         <td className="py-4 px-6 text-center bg-blue-500/5 text-slate-500">—</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
         <td className="py-4 px-6 text-center text-green-300 font-semibold">✓</td>
        </tr>
        <tr className="hover:bg-white/5 transition-colors">
         <td className="py-4 px-6 text-slate-300">Créditos adicionais</td>
         <td className="py-4 px-6 text-center text-slate-200">No painel</td>
         <td className="py-4 px-6 text-center text-slate-200">No painel</td>
         <td className="py-4 px-6 text-center bg-blue-500/5 text-slate-100">No painel</td>
         <td className="py-4 px-6 text-center text-slate-200">No painel</td>
         <td className="py-4 px-6 text-center text-slate-100">No painel</td>
        </tr>
       </tbody>
      </table>
     </div>
     <p className="mt-4 text-sm text-slate-500">
      * Créditos mensais não acumulativos. Renovação automática a cada ciclo.
     </p>
     <div className="mt-9 flex justify-center">
      <Link to="/planos" className="btn-primary px-8 py-4 rounded-2xl font-bold text-lg">
       Ver todos os planos
      </Link>
     </div>
    </div>
   </section>
   <section className="py-24 px-6">
    <div className="max-w-5xl mx-auto">
     <div className="text-center mb-14">
      <h2 className="text-4xl md:text-5xl font-extrabold mb-4">Perguntas frequentes</h2>
      <p className="text-xl text-slate-400">As dúvidas mais comuns antes de começar.</p>
     </div>
     <div className="grid gap-4">
      <div className="faq-container glass-card rounded-2xl overflow-hidden scroll-reveal">
       <button className="faq-toggle w-full flex items-center justify-between p-6 hover:bg-white/5 transition-all"> <h3 className="font-bold text-lg text-left">A InsightDISC é só um teste DISC?</h3><span className="faq-icon text-2xl">+</span> </button>
       <div className="faq-item">
        <p className="text-slate-400 px-6 pb-6">Não. Ela é uma plataforma de inteligência comportamental que usa DISC para gerar leitura individual, comparação, recrutamento, liderança e análise de equipes.</p>
       </div>
      </div>
      <div className="faq-container glass-card rounded-2xl overflow-hidden scroll-reveal">
       <button className="faq-toggle w-full flex items-center justify-between p-6 hover:bg-white/5 transition-all"> <h3 className="font-bold text-lg text-left">Posso usar com equipes?</h3><span className="faq-icon text-2xl">+</span> </button>
       <div className="faq-item">
        <p className="text-slate-400 px-6 pb-6">Sim. A plataforma possui mapa comportamental organizacional, distribuição DISC, leitura de riscos de composição e inteligência de equilíbrio de time.</p>
       </div>
      </div>
      <div className="faq-container glass-card rounded-2xl overflow-hidden scroll-reveal">
       <button className="faq-toggle w-full flex items-center justify-between p-6 hover:bg-white/5 transition-all"> <h3 className="font-bold text-lg text-left">Existe relatório em PDF?</h3><span className="faq-icon text-2xl">+</span> </button>
       <div className="faq-item">
        <p className="text-slate-400 px-6 pb-6">Sim. Os relatórios podem ser visualizados na plataforma e exportados em PDF profissional.</p>
       </div>
      </div>
      <div className="faq-container glass-card rounded-2xl overflow-hidden scroll-reveal">
       <button className="faq-toggle w-full flex items-center justify-between p-6 hover:bg-white/5 transition-all"> <h3 className="font-bold text-lg text-left">Posso comparar candidatos com vagas?</h3><span className="faq-icon text-2xl">+</span> </button>
       <div className="faq-item">
        <p className="text-slate-400 px-6 pb-6">Sim. O módulo de aderência candidato x cargo permite analisar fit comportamental para recrutamento e alocação.</p>
       </div>
      </div>
      <div className="faq-container glass-card rounded-2xl overflow-hidden scroll-reveal">
       <button className="faq-toggle w-full flex items-center justify-between p-6 hover:bg-white/5 transition-all"> <h3 className="font-bold text-lg text-left">Qual é o tempo médio de avaliação?</h3><span className="faq-icon text-2xl">+</span> </button>
       <div className="faq-item">
        <p className="text-slate-400 px-6 pb-6">A avaliação leva aproximadamente 15 minutos. Você recebe o resultado instantaneamente após concluir o teste.</p>
       </div>
      </div>
     </div>
    </div>
   </section>
   <section className="py-24 px-6">
    <div className="max-w-5xl mx-auto">
     <div className="glass-card rounded-[32px] p-12 md:p-16 text-center relative overflow-hidden scroll-reveal">
      <div className="absolute inset-0 disc-gradient opacity-10"></div>
      <div className="relative">
       <h2 className="text-4xl md:text-5xl font-extrabold mb-6">Transforme perfil em decisão prática</h2>
       <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">Use a InsightDISC para desenvolver pessoas, apoiar líderes, contratar melhor e formar equipes mais inteligentes.</p>
       <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Link to="/planos" className="btn-primary cta-pulse px-10 py-5 rounded-2xl font-bold text-lg hover:shadow-lg transition-all"> Escolher plano ideal </Link> <Link to="/empresa" className="glass-card px-10 py-5 rounded-2xl font-bold text-lg text-slate-200 border border-white/10 hover:border-white/20 transition-all"> Agendar demonstração </Link>
       </div>
       <p className="mt-8 text-sm text-slate-500">Assinaturas por perfil de uso • Recursos progressivos • Evolução conforme a operação</p>
      </div>
     </div>
    </div>
   </section>
   <footer className="py-14 px-6 border-t border-slate-800">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
     <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl disc-gradient flex items-center justify-center">
       <span className="text-white text-lg font-extrabold">ID</span>
      </div><span className="text-xl font-bold">InsightDISC</span>
     </div>
     <p className="text-slate-500 text-sm text-center md:text-right">© 2024 InsightDISC. Plataforma de inteligência comportamental.</p>
    </div>
   </footer>
  </div>
    </div>
  );
}
