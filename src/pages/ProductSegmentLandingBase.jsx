import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { HOME_SECTION_LINKS, PRODUCT_TABS } from '@/modules/marketing/landingNavConfig';
import '../styles/landing.css';

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

function CtaLink({ cta, className, onTrack }) {
  if (!cta) return null;
  const commonProps = {
    className,
    onClick: () => onTrack(cta.source || cta.label),
  };

  if (cta.to.startsWith('#')) {
    return (
      <a href={cta.to} {...commonProps}>
        {cta.label}
      </a>
    );
  }

  return (
    <Link to={cta.to} {...commonProps}>
      {cta.label}
    </Link>
  );
}

export default function ProductSegmentLandingBase({
  slug,
  metaTitle,
  metaDescription,
  hero,
  whatIs,
  audience,
  offers,
  differentials,
  workflow,
  benefits,
  finalCta,
}) {
  const rootRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavSticky, setIsNavSticky] = useState(false);
  const activePath = `/${slug}`;

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

    document.title = metaTitle;
    htmlEl.lang = 'pt-BR';
    htmlClassesToAdd.forEach((className) => htmlEl.classList.add(className));
    bodyClassesToAdd.forEach((className) => bodyEl.classList.add(className));

    upsertMetaTag(
      'meta[name="description"]',
      { name: 'description' },
      metaDescription,
      createdMetas,
      previousMetaContents
    );
    upsertMetaTag('meta[property="og:title"]', { property: 'og:title' }, metaTitle, createdMetas, previousMetaContents);
    upsertMetaTag(
      'meta[property="og:description"]',
      { property: 'og:description' },
      metaDescription,
      createdMetas,
      previousMetaContents
    );
    upsertMetaTag('meta[property="og:type"]', { property: 'og:type' }, 'website', createdMetas, previousMetaContents);
    upsertMetaTag('meta[property="og:image"]', { property: 'og:image' }, '/brand/og.svg', createdMetas, previousMetaContents);
    upsertMetaTag('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image', createdMetas, previousMetaContents);

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

    trackEvent(`${slug}_landing_view`, { path: activePath });

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
  }, [activePath, metaDescription, metaTitle, slug]);

  const trackCta = (source) => {
    trackEvent(`${slug}_landing_cta_click`, { path: activePath, source });
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
                  <Link key={item.label} to={item.href} className="text-slate-300 hover:text-white transition-colors">
                    {item.label}
                  </Link>
                ))}
                {PRODUCT_TABS.map((tab) => (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    aria-current={tab.to === activePath ? 'page' : undefined}
                    className={`transition-all ${
                      tab.to === activePath
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
                <Link to="/StartFree" className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm">Criar conta</Link>
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
                  className="block text-slate-300 hover:text-white transition-colors py-2"
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
                    tab.to === activePath ? 'text-white font-semibold' : 'text-slate-300 hover:text-white'
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
                  <span className="text-sm text-slate-300">{hero.badge}</span>
                </div>
                <h1 className="fade-up text-4xl md:text-5xl xl:text-6xl font-extrabold leading-tight mb-6" style={{ animationDelay: '.1s', animationDuration: '.55s' }}>
                  {hero.title}
                </h1>
                <p className="fade-up text-lg md:text-2xl text-slate-300 leading-relaxed max-w-3xl mb-8" style={{ animationDelay: '.2s', animationDuration: '.55s' }}>
                  {hero.subtitle}
                </p>

                <div className="fade-up flex flex-col sm:flex-row gap-4 mb-10" style={{ animationDelay: '.3s', animationDuration: '.55s' }}>
                  <CtaLink
                    cta={hero.primaryCta}
                    onTrack={trackCta}
                    className="btn-primary px-8 py-4 rounded-2xl font-bold text-lg"
                  />
                  <CtaLink
                    cta={hero.secondaryCta}
                    onTrack={trackCta}
                    className="btn-secondary glass-card px-8 py-4 rounded-2xl font-bold text-lg text-slate-200 border border-white/10"
                  />
                </div>
              </div>

              <div className="fade-up" style={{ animationDelay: '.25s', animationDuration: '.55s' }}>
                <div className="glass-card rounded-[28px] p-5">
                  <div className="grid gap-4">
                    <div className="mock-card rounded-2xl p-5">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-2">{hero.panel.eyebrow}</p>
                      <h3 className="text-xl font-bold mb-3">{hero.panel.title}</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {hero.panel.stats.map((item) => (
                          <div key={item.label} className="rounded-xl bg-white/5 p-3">
                            <p className="text-slate-400">{item.label}</p>
                            <p className="text-base font-bold mt-1">{item.value}</p>
                          </div>
                        ))}
                        <div className="rounded-xl bg-white/5 p-3 col-span-2">
                          <p className="text-slate-400">{hero.panel.highlight.label}</p>
                          <p className="text-base font-semibold mt-1">{hero.panel.highlight.value}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mock-card rounded-2xl p-5">
                      <p className="text-xs uppercase tracking-[0.14em] text-slate-500 mb-3">{hero.panel.secondaryEyebrow}</p>
                      <div className="grid sm:grid-cols-2 gap-3 text-sm text-slate-300">
                        {hero.panel.pillars.map((item) => (
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

        <section id="o-que-e" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-stretch">
              <div className="scroll-reveal glass-card rounded-3xl p-8 md:p-10">
                <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-4">O que é</p>
                <h2 className="text-3xl md:text-4xl font-extrabold leading-tight mb-5">{whatIs.title}</h2>
                <p className="text-slate-300 text-lg leading-relaxed mb-4">{whatIs.description}</p>
                <p className="text-slate-400 leading-relaxed mb-6">{whatIs.supportText}</p>
                <div className="rounded-2xl border border-blue-400/25 bg-blue-500/10 p-5 text-blue-100 font-semibold">
                  {whatIs.highlight}
                </div>
              </div>

              <div className="grid gap-4">
                {whatIs.bullets.map((item, index) => (
                  <div key={item} className="scroll-reveal dossie-card rounded-2xl glass-card p-6 flex items-start gap-3" style={{ animationDelay: `${index * 0.06}s` }}>
                    <span className="mt-1 w-2.5 h-2.5 bg-cyan-400 rounded-full shrink-0"></span>
                    <p className="text-slate-200 leading-relaxed">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="para-quem-e" className="py-24 px-6 bg-slate-900/35 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12 scroll-reveal">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Para quem é</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">{audience.title}</h2>
              <p className="text-lg text-slate-400 leading-relaxed">{audience.description}</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {audience.items.map((item, index) => (
                <div key={item} className="scroll-reveal dossie-card rounded-2xl glass-card p-5 border border-white/10" style={{ animationDelay: `${index * 0.06}s` }}>
                  <p className="font-semibold">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="o-que-oferece" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12 scroll-reveal">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">O que oferece</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">{offers.title}</h2>
              <p className="text-lg text-slate-400 leading-relaxed">{offers.description}</p>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {offers.items.map((item, index) => (
                <div key={item.title} className="scroll-reveal dossie-card rounded-2xl glass-card p-6" style={{ animationDelay: `${index * 0.07}s` }}>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="diferenciais" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="scroll-reveal rounded-[28px] glass-card p-8 md:p-12 border border-blue-500/20">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Diferenciais</p>
              <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-5">{differentials.title}</h2>
              <p className="text-lg text-slate-300 leading-relaxed mb-8 max-w-4xl">{differentials.description}</p>
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                {differentials.items.map((item, index) => (
                  <div key={item} className="scroll-reveal dossie-card rounded-2xl bg-white/5 border border-white/10 px-4 py-4 text-slate-200" style={{ animationDelay: `${index * 0.07}s` }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="py-24 px-6 bg-slate-900/35 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-14 scroll-reveal">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Como funciona</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">{workflow.title}</h2>
              <p className="text-lg text-slate-400 leading-relaxed">{workflow.description}</p>
            </div>

            <div className="grid gap-5">
              {workflow.steps.map((step, index) => (
                <article key={step.title} className="scroll-reveal dossie-card rounded-2xl glass-card p-6 md:p-7" style={{ animationDelay: `${index * 0.05}s` }}>
                  <div className="flex flex-col md:flex-row md:items-start gap-5">
                    <div className="h-11 w-11 rounded-full bg-blue-500/20 border border-blue-400/35 text-blue-200 font-extrabold flex items-center justify-center shrink-0">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold leading-tight mb-2">{step.title}</h3>
                      <p className="text-slate-300 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="beneficios" className="py-24 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12 scroll-reveal">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Benefícios</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">{benefits.title}</h2>
              <p className="text-lg text-slate-400 leading-relaxed">{benefits.description}</p>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {benefits.items.map((item, index) => (
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
            <div className="scroll-reveal dossie-cta-highlight rounded-[30px] glass-card border border-white/10 p-8 md:p-12">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-4">Pronto para começar</p>
              <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-5">{finalCta.title}</h2>
              <p className="text-lg text-slate-300 leading-relaxed max-w-3xl">{finalCta.description}</p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <CtaLink
                  cta={finalCta.primaryCta}
                  onTrack={trackCta}
                  className="btn-primary px-8 py-4 rounded-2xl font-bold text-lg"
                />
                <CtaLink
                  cta={finalCta.secondaryCta}
                  onTrack={trackCta}
                  className="btn-secondary glass-card px-8 py-4 rounded-2xl font-bold text-lg text-slate-200 border border-white/10"
                />
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

