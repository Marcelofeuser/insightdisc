import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { HOME_SECTION_LINKS, PRODUCT_TABS } from '@/modules/marketing/landingNavConfig';
import { PLAN_ORDER, PLANS } from '@/modules/marketing/plansCatalog';
import '../styles/landing.css';

const LANDING_TITLE = 'Planos InsightDISC';
const LANDING_DESCRIPTION =
  'Escolha o plano ideal no InsightDISC: individual, personal, profissional, business ou diamond.';
const CREDIBILITY_ITEMS = Object.freeze([
  'Usado por profissionais',
  'Aplicado em empresas',
  'Baseado em DISC',
]);
const PLAN_PRESENTATION_OVERRIDES = Object.freeze({
  disc: Object.freeze({
    benefits: ['1 relatório DISC completo', 'Download em PDF', 'Sem acesso à plataforma'],
    href: '/checkout',
  }),
  personal: Object.freeze({
    benefits: ['Acesso à plataforma por 2 meses', '1 relatório por ciclo mensal', 'Histórico e evolução'],
    href: '/checkout',
  }),
  profissional: Object.freeze({
    price: 'R$ 298/mês',
    billingLabel: '',
    benefits: ['Tudo do Personal', '10 créditos/mês', 'Dossiê completo'],
    href: '/checkout',
  }),
  business: Object.freeze({
    price: 'R$ 598/mês',
    billingLabel: '',
    benefits: ['Tudo do Profissional', '25 créditos/mês', 'Team Map'],
    href: '/checkout',
  }),
  diamond: Object.freeze({
    price: 'R$ 998/mês',
    billingLabel: '',
    benefits: ['Tudo do Business', 'Uso ilimitado', 'Ideal para empresas acima de 50 funcionários'],
    href: '/checkout',
  }),
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

export default function PlanosPage() {
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

    upsertMetaTag('meta[name="description"]', { name: 'description' }, LANDING_DESCRIPTION, createdMetas, previousMetaContents);
    upsertMetaTag('meta[property="og:title"]', { property: 'og:title' }, LANDING_TITLE, createdMetas, previousMetaContents);
    upsertMetaTag('meta[property="og:description"]', { property: 'og:description' }, LANDING_DESCRIPTION, createdMetas, previousMetaContents);
    upsertMetaTag('meta[property="og:type"]', { property: 'og:type' }, 'website', createdMetas, previousMetaContents);
    upsertMetaTag('meta[property="og:image"]', { property: 'og:image' }, '/brand/og.svg', createdMetas, previousMetaContents);
    upsertMetaTag('meta[name="twitter:card"]', { name: 'twitter:card' }, 'summary_large_image', createdMetas, previousMetaContents);

    const revealTargets = root.querySelectorAll('.scroll-reveal');
    let observer;
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) entry.target.classList.add('visible');
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

    trackEvent('planos_landing_view', { path: '/planos' });

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

  const trackPlanClick = (planKey, source) => {
    trackEvent('planos_cta_click', { path: '/planos', planKey, source });
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
                    className={`transition-colors ${
                      item.label === 'Planos'
                        ? 'text-white bg-white/10 border border-white/15 rounded-lg px-3 py-1.5'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
                {PRODUCT_TABS.map((tab) => (
                  <Link key={tab.to} to={tab.to} className="text-slate-300 hover:text-white transition-colors">
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
                  className={`block py-2 transition-colors ${item.label === 'Planos' ? 'text-white font-semibold' : 'text-slate-300 hover:text-white'}`}
                >
                  {item.label}
                </Link>
              ))}
              {PRODUCT_TABS.map((tab) => (
                <Link
                  key={tab.to}
                  to={tab.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-slate-300 hover:text-white transition-colors"
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <section className="relative min-h-[72vh] flex items-center pt-28 px-6 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute top-36 right-16 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-12 left-1/3 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto relative z-10 w-full">
            <div className="max-w-4xl">
              <div className="fade-up inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full mb-8">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-sm text-slate-300">Fluxo completo de monetização InsightDISC</span>
              </div>
              <h1 className="fade-up hero-gradient-title text-4xl md:text-6xl font-extrabold leading-tight mb-6" style={{ animationDelay: '.1s' }}>
                Escolha o plano ideal para seu momento
              </h1>
              <p className="fade-up text-lg md:text-2xl text-slate-300 leading-relaxed mb-8" style={{ animationDelay: '.2s' }}>
                Do autoconhecimento ao uso profissional e empresarial
              </p>
              <div className="fade-up flex flex-col sm:flex-row gap-4 mb-8" style={{ animationDelay: '.3s' }}>
                <Link to="/checkout" className="btn-primary px-8 py-4 rounded-2xl font-bold text-lg" onClick={() => trackPlanClick('profissional', 'hero_profissional')}>
                  Começar com Profissional
                </Link>
                <Link to="/checkout" className="btn-secondary glass-card px-8 py-4 rounded-2xl font-bold text-lg text-slate-200 border border-white/10" onClick={() => trackPlanClick('disc', 'hero_disc')}>
                  Gerar meu relatório
                </Link>
              </div>
              <div className="fade-up flex flex-wrap gap-2" style={{ animationDelay: '.34s' }}>
                {CREDIBILITY_ITEMS.map((item) => (
                  <span key={item} className="credibility-chip rounded-full px-3 py-1 text-xs text-slate-200">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 px-6 bg-slate-900/35 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12 scroll-reveal">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Tabela de planos</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Escolha o nível de acesso ideal</h2>
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-5">
              {PLAN_ORDER.map((planKey, index) => {
                const plan = { ...PLANS[planKey], ...(PLAN_PRESENTATION_OVERRIDES[planKey] || {}) };
                const isHighlighted = planKey === 'profissional';
                return (
                  <article
                    key={plan.key}
                    className={`scroll-reveal dossie-card glass-card rounded-3xl p-6 flex flex-col ${isHighlighted ? 'border border-blue-400/45 shadow-[0_0_0_1px_rgba(59,130,246,0.16),0_22px_40px_rgba(2,6,23,0.24)]' : ''}`}
                    style={{ animationDelay: `${index * 0.06}s` }}
                  >
                    {plan.highlight ? (
                      <span className="inline-flex self-start px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 border border-blue-400/30 text-blue-100 mb-4">
                        {plan.highlight}
                      </span>
                    ) : (
                      <span className="h-7" aria-hidden="true"></span>
                    )}
                    <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                    <p className="text-3xl font-extrabold mb-1">{plan.price}</p>
                    {plan.billingLabel ? <p className="text-sm text-slate-400 mb-5">{plan.billingLabel}</p> : <div className="h-[1.5rem] mb-5" aria-hidden="true"></div>}
                    <ul className="space-y-2 text-sm text-slate-300 mb-6 flex-1">
                      {plan.benefits.map((benefit) => (
                        <li key={benefit} className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                          {benefit}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={plan.href || '/checkout'}
                      className={`${isHighlighted ? 'btn-primary' : 'btn-secondary glass-card border border-white/10'} px-4 py-3 rounded-xl font-semibold text-center`}
                      onClick={() => trackPlanClick(plan.key, 'plan_card')}
                    >
                      {plan.ctaLabel}
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-6">
            <div className="scroll-reveal dossie-card glass-card rounded-3xl p-8">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Créditos extras</p>
              <h3 className="text-2xl md:text-3xl font-extrabold mb-3">Créditos extras disponíveis por R$ 19,98 por crédito</h3>
              <p className="text-slate-300 mb-4">Disponíveis para ampliar capacidade conforme sua necessidade operacional.</p>
              <Link to="/checkout" className="btn-secondary glass-card border border-white/10 px-5 py-3 rounded-xl font-semibold inline-flex" onClick={() => trackPlanClick('creditos', 'credit_block')}>
                Adicionar créditos
              </Link>
            </div>
            <div className="scroll-reveal dossie-card glass-card rounded-3xl p-8">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Bloco de confiança</p>
              <h3 className="text-2xl md:text-3xl font-extrabold mb-3">Compra simples, acesso imediato e suporte contínuo</h3>
              <div className="grid gap-2 text-slate-300">
                <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">Ambiente seguro para pagamento</div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">Ativação rápida após confirmação</div>
                <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-2">Estrutura pronta para escalar</div>
              </div>
            </div>
          </div>
          <p className="scroll-reveal mt-6 text-sm text-slate-400 leading-relaxed">
            Créditos mensais incluídos no plano são renovados automaticamente a cada ciclo e não são acumulativos para o mês seguinte. Créditos adquiridos separadamente permanecem disponíveis enquanto o plano estiver ativo.
          </p>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="scroll-reveal dossie-cta-highlight rounded-[30px] glass-card border border-white/10 p-8 md:p-12 text-center">
              <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
                Ative seu plano e comece a monetizar com o InsightDISC hoje.
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                Estrutura completa de venda pronta para integração com gateway real de pagamento.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/checkout" className="btn-primary px-8 py-4 rounded-2xl font-bold text-lg" onClick={() => trackPlanClick('profissional', 'final_cta_profissional')}>
                  Adquirir acesso profissional
                </Link>
                <Link to="/checkout" className="btn-secondary glass-card px-8 py-4 rounded-2xl font-bold text-lg text-slate-200 border border-white/10" onClick={() => trackPlanClick('business', 'final_cta_business')}>
                  Adquirir plano business
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
