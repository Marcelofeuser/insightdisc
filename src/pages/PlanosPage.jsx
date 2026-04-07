import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { HOME_SECTION_LINKS, PRODUCT_TABS } from '@/modules/marketing/landingNavConfig';
import { PLANS } from '@/modules/marketing/plansCatalog';
import '../styles/landing.css';

const LANDING_TITLE = 'Planos InsightDISC';
const LANDING_DESCRIPTION =
  'Escolha o plano ideal no InsightDISC: individual, personal, insider, profissional, business ou diamond.';
const CREDIBILITY_ITEMS = Object.freeze([
  'Usado por profissionais',
  'Aplicado em empresas',
  'Baseado em DISC',
]);

const PLAN_DISPLAY_NAMES = Object.freeze({
  disc: 'DISC Individual',
  personal: 'Personal',
  insider: 'Insider',
  profissional: 'Professional',
  business: 'Business',
  business_corporation: 'Business Corporation',
  diamond_consulting: 'Diamond Consulting',
});

const PLAN_SEALS = Object.freeze({
  disc: 'Entrada',
  personal: 'Individual',
  insider: 'Profundidade',
  profissional: 'Profissional',
  business: 'Empresarial',
  business_corporation: 'Corporativo',
  diamond_consulting: 'Premium estratégico',
});

const PLAN_TAGLINES = Object.freeze({
  disc: 'Avaliação pontual com relatório completo',
  personal: 'Autoconhecimento com continuidade',
  insider: 'Mais profundidade, IA e comparação de perfis',
  profissional: 'Uso profissional individual com 10 créditos/mês',
  business: 'Equipes e operação empresarial com 25 créditos/mês',
  business_corporation: 'Escala corporativa com uso ilimitado e White Label incluso',
  diamond_consulting: 'Consultoria executiva com acompanhamento especializado',
});

const PLAN_DIFFERENTIALS = Object.freeze({
  disc: 'Relatório completo instantâneo (tela + PDF)',
  personal: 'Evolução e histórico do perfil',
  insider: 'IA + comparação + leitura avançada',
  profissional: 'Relatórios profissionais + comparação avançada',
  business: 'Team Map + gestão de equipe',
  business_corporation: 'Uso ilimitado + White Label incluso',
  diamond_consulting: 'Psicanalista + devolutiva estratégica + White Label',
});

const HERO_BULLETS = Object.freeze([
  'Comece no plano ideal para sua realidade',
  'Evolua conforme sua necessidade operacional',
  'Tenha clareza sobre recursos, escala e posicionamento',
]);

const PLAN_GUIDE_ITEMS = Object.freeze([
  {
    key: 'disc',
    title: 'DISC Individual',
    description: 'Para quem quer uma avaliação imediata e objetiva.',
  },
  {
    key: 'personal',
    title: 'Personal',
    description: 'Para quem deseja autoconhecimento com continuidade.',
  },
  {
    key: 'insider',
    title: 'Insider',
    description: 'Para quem quer mais profundidade, comparação e análise avançada.',
  },
  {
    key: 'profissional',
    title: 'Professional',
    description: 'Para consultores, profissionais e especialistas que atuam individualmente.',
  },
  {
    key: 'business',
    title: 'Business',
    description: 'Para empresas e operações com equipes, RH e contexto organizacional.',
  },
  {
    key: 'business_corporation',
    title: 'Business Corporation',
    description: 'Para estruturas corporativas e operação em escala com White Label incluso.',
  },
  {
    key: 'diamond_consulting',
    title: 'Diamond Consulting',
    description:
      'Para consultoria premium com acompanhamento estratégico (psicanalista), devolutiva executiva e posicionamento superior.',
  },
]);
const SUMMARY_COMPARISON_ROWS = Object.freeze([
  {
    feature: 'Preço',
    disc: PLANS.disc.price,
    personal: PLANS.personal.price,
    insider: `${PLANS.insider.price}${PLANS.insider.billingLabel}`,
    profissional: `${PLANS.profissional.price}${PLANS.profissional.billingLabel}`,
    business: `${PLANS.business.price}${PLANS.business.billingLabel}`,
    business_corporation: `${PLANS.business_corporation.price}${PLANS.business_corporation.billingLabel}`,
    diamond_consulting: `${PLANS.diamond_consulting.price}${PLANS.diamond_consulting.billingLabel}`,
  },
  {
    feature: 'Recorrência',
    disc: 'Pagamento único',
    personal: 'Assinatura mensal',
    insider: 'Assinatura mensal',
    profissional: 'Assinatura mensal',
    business: 'Assinatura mensal',
    business_corporation: 'Assinatura mensal',
    diamond_consulting: 'Assinatura mensal',
  },
  {
    feature: 'Indicação principal',
    disc: PLANS.disc.indication,
    personal: PLANS.personal.indication,
    insider: PLANS.insider.indication,
    profissional: PLANS.profissional.indication,
    business: PLANS.business.indication,
    business_corporation: PLANS.business_corporation.indication,
    diamond_consulting: PLANS.diamond_consulting.indication,
  },
  {
    feature: 'Capacidade mensal',
    disc: '1 relatório',
    personal: 'Uso individual',
    insider: 'Uso individual avançado',
    profissional: '10 créditos/mês',
    business: '25 créditos/mês',
    business_corporation: 'Ilimitado (uso justo)',
    diamond_consulting: 'Ilimitado (uso justo)',
  },
  {
    feature: 'Diferencial',
    disc: 'Relatório completo imediato em PDF',
    personal: 'Direcionamento prático e evolução pessoal guiada',
    insider: 'Leitura aprofundada com IA e comparação de evolução',
    profissional: 'Dossiê técnico e comparador avançado para análise',
    business: 'Team Map com gestão comportamental de equipe',
    business_corporation: 'Uso ilimitado + White Label incluso',
    diamond_consulting: 'Psicanalista + estratégia executiva',
  },
]);

const DETAILED_COMPARISON_ROWS = Object.freeze([
  { feature: 'Recorrência / acesso', disc: 'Pagamento único', personal: 'Mensal', insider: 'Mensal', profissional: 'Mensal', business: 'Mensal', business_corporation: 'Mensal', diamond_consulting: 'Mensal' },
  { feature: 'Capacidade mensal (relatórios / créditos)', disc: '1 relatório', personal: 'Uso individual', insider: 'Uso individual avançado', profissional: '10 créditos/mês', business: '25 créditos/mês', business_corporation: 'Ilimitado', diamond_consulting: 'Ilimitado' },
  { feature: 'Acompanhamento contínuo do perfil', disc: '—', personal: '✓', insider: '✓', profissional: '✓', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Gestão completa de avaliações DISC', disc: '—', personal: '✓', insider: '✓', profissional: '✓', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Comparação inteligente de perfis comportamentais', disc: '—', personal: '—', insider: '✓', profissional: '✓', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Uso com IA (insights e recomendações)', disc: '—', personal: '—', insider: '✓', profissional: '✓', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Dossiê comportamental completo', disc: '—', personal: '—', insider: '—', profissional: '✓', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Relatórios avançados', disc: '—', personal: '—', insider: '✓', profissional: '✓', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Direcionamentos de desenvolvimento por relatório', disc: '—', personal: '✓', insider: '✓', profissional: '✓', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Leitura por arquétipos vinculada ao relatório', disc: '—', personal: '—', insider: '✓', profissional: '✓', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Histórico operacional + histórico de entregas finais', disc: '—', personal: '✓', insider: '✓', profissional: '✓', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Arquétipos comportamentais (evolução contínua)', disc: '—', personal: '—', insider: '✓', profissional: '✓', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Exportação profissional em PDF', disc: '✓', personal: '✓', insider: '✓', profissional: '✓', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Download em PDF', disc: '✓', personal: '✓', insider: '✓', profissional: '✓', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Histórico e evolução', disc: '—', personal: '✓', insider: '✓', profissional: '✓', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'White Label (marca no relatório)', disc: '—', personal: '—', insider: '—', profissional: 'Opcional', business: 'Opcional', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Herança completa do Professional', disc: '—', personal: '—', insider: '—', profissional: '—', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Team Map', disc: '—', personal: '—', insider: '—', profissional: '—', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Análise de perfis em grupo', disc: '—', personal: '—', insider: '—', profissional: '—', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Comparação entre colaboradores', disc: '—', personal: '—', insider: '—', profissional: '—', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Apoio à liderança e tomada de decisão', disc: '—', personal: '—', insider: '—', profissional: '—', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Visão estratégica para equipes e cultura', disc: '—', personal: '—', insider: '—', profissional: '—', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Aplicação DISC em processos internos', disc: '—', personal: '—', insider: '—', profissional: '—', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Estrutura para RH e gestão de pessoas', disc: '—', personal: '—', insider: '—', profissional: '—', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Gestão de múltiplos usuários', disc: '—', personal: '—', insider: '—', profissional: '—', business: '✓', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Operação em escala', disc: '—', personal: '—', insider: '—', profissional: '—', business: '—', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Uso ilimitado', disc: '—', personal: '—', insider: '—', profissional: '—', business: '—', business_corporation: '✓', diamond_consulting: '✓' },
  { feature: 'Acompanhamento especializado (psicanalista)', disc: '—', personal: '—', insider: '—', profissional: '—', business: '—', business_corporation: '—', diamond_consulting: '✓' },
  { feature: 'Devolutiva executiva para empresa', disc: '—', personal: '—', insider: '—', profissional: '—', business: '—', business_corporation: '—', diamond_consulting: '✓' },
]);

function renderComparisonCell(value, isHighlightedColumn) {
  const toneClass = isHighlightedColumn ? 'bg-blue-500/5' : '';
  if (value === '✓') {
    return (
      <td className={`py-4 px-5 text-center ${toneClass}`}>
        <span className="text-emerald-300 font-bold">✓</span>
      </td>
    );
  }
  if (value === '—') {
    return <td className={`py-4 px-5 text-center text-slate-500 ${toneClass}`}>—</td>;
  }
  return <td className={`py-4 px-5 text-center text-slate-200 ${toneClass}`}>{value}</td>;
}

const PLAN_CAROUSEL_KEYS = Object.freeze([
  'disc',
  'personal',
  'insider',
  'profissional',
  'business',
  'business_corporation',
  'diamond_consulting',
]);

function resolvePlanDetailsPath(planKey) {
  if (planKey === 'disc') return '/dossie';
  if (planKey === 'profissional') return '/profissional';
  if (planKey === 'business_corporation') return '/business-corporation';
  if (planKey === 'diamond_consulting') return '/diamond-consulting';
  return `/${planKey}`;
}

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
  const carouselRef = useRef(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavSticky, setIsNavSticky] = useState(false);
  const [showFullComparison, setShowFullComparison] = useState(false);
  const [selectedPlanKey, setSelectedPlanKey] = useState('profissional');

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

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel) return undefined;

    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const handleMouseDown = (event) => {
      isDown = true;
      carousel.classList.add('is-dragging');
      startX = event.pageX - carousel.offsetLeft;
      scrollLeft = carousel.scrollLeft;
    };

    const handleMouseLeave = () => {
      isDown = false;
      carousel.classList.remove('is-dragging');
    };

    const handleMouseUp = () => {
      isDown = false;
      carousel.classList.remove('is-dragging');
    };

    const handleMouseMove = (event) => {
      if (!isDown) return;
      event.preventDefault();
      const x = event.pageX - carousel.offsetLeft;
      const walk = (x - startX) * 1.15;
      carousel.scrollLeft = scrollLeft - walk;
    };

    carousel.addEventListener('mousedown', handleMouseDown);
    carousel.addEventListener('mouseleave', handleMouseLeave);
    carousel.addEventListener('mouseup', handleMouseUp);
    carousel.addEventListener('mousemove', handleMouseMove);

    return () => {
      carousel.removeEventListener('mousedown', handleMouseDown);
      carousel.removeEventListener('mouseleave', handleMouseLeave);
      carousel.removeEventListener('mouseup', handleMouseUp);
      carousel.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const trackPlanClick = (planKey, source) => {
    trackEvent('planos_cta_click', { path: '/planos', planKey, source });
  };

  const toggleComparisonDetails = () => {
    const nextState = !showFullComparison;
    setShowFullComparison(nextState);
    trackEvent('planos_comparison_toggle', {
      path: '/planos',
      expanded: nextState,
    });
  };

  const comparisonPlans = PLAN_CAROUSEL_KEYS.map((key) => ({ key, plan: PLANS[key] })).filter((item) => item.plan);
  const selectedPlan = PLANS[selectedPlanKey] || comparisonPlans[0]?.plan;
  const selectedPlanPriceLabel = selectedPlan
    ? selectedPlanKey === 'disc'
      ? selectedPlan.price
      : `${selectedPlan.price}${selectedPlan.billingLabel}`
    : '';

  return (
    <div ref={rootRef} className="landing-page dossie-landing h-full gradient-bg text-white overflow-x-hidden overflow-y-auto">
      <div className="min-h-full w-full">
        <nav id="navbar" className={`fixed left-0 right-0 top-0 z-50 glass-card transition-all duration-300 ${isNavSticky ? 'nav-sticky' : ''}`}>
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-3">
                <img
                  src="/logos/insightDISC_logo4_transp.png"
                  alt="InsightDISC"
                  className="h-10 w-10 rounded-xl object-contain"
                />
                <span className="text-xl font-bold">InsightDISC</span>
              </Link>

              <div className="hidden lg:flex items-center gap-5 text-sm">
                {HOME_SECTION_LINKS.map((item) => (
                  <Link
                    key={item.label}
                    to={item.href}
                    className={
                      item.featured
                        ? 'planos-nav-link planos-nav-link-active'
                        : 'text-slate-300 hover:text-white transition-colors'
                    }
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
                <Link to="/checkout/plan/professional" className="btn-primary px-5 py-2.5 rounded-xl font-semibold text-sm">Assinar agora</Link>
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
                <span className="text-sm text-slate-300">Planos oficiais InsightDISC para uso individual, profissional e empresarial</span>
              </div>
              <h1 className="fade-up hero-gradient-title text-4xl md:text-6xl font-extrabold leading-tight mb-6" style={{ animationDelay: '.1s' }}>
                Escolha o plano ideal para o seu <span className="headline-accent">nível de operação</span>
              </h1>
              <p className="fade-up text-lg md:text-2xl text-slate-300 leading-relaxed mb-6" style={{ animationDelay: '.2s' }}>
                Do uso individual ao nível corporativo e consultivo premium, o InsightDISC oferece uma estrutura escalável para autoconhecimento, atuação profissional, equipes e operação estratégica.
              </p>
              <ul className="fade-up mb-10 space-y-2 text-base md:text-lg text-slate-200" style={{ animationDelay: '.25s' }}>
                {HERO_BULLETS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-[0.6em] h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400/80" aria-hidden="true" />
                    <span className="min-w-0">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="fade-up flex flex-col sm:flex-row gap-4 mb-8" style={{ animationDelay: '.3s' }}>
                <a
                  href="#resumo-planos"
                  className="btn-primary px-8 py-4 rounded-2xl font-bold text-lg text-center"
                  onClick={() => trackPlanClick('planos', 'hero_view_plans')}
                >
                  Ver planos
                </a>
                <Link
                  to="/empresa"
                  className="btn-secondary glass-card px-8 py-4 rounded-2xl font-bold text-lg text-slate-200 border border-white/10 text-center"
                  onClick={() => trackPlanClick('empresa', 'hero_talk_to_specialist')}
                >
                  Falar com especialista
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

        <section id="resumo-planos" className="py-24 px-6 bg-slate-900/35 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12 scroll-reveal">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Resumo dos planos</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Escolha o nível de acesso ideal</h2>
              <p className="text-lg text-slate-400">
                Compare rapidamente preço, indicação e diferenciais. Selecione um plano para ver o resumo e seguir para o checkout seguro.
              </p>
            </div>
            <div className="scroll-reveal rounded-3xl glass-card border border-white/10 p-5 md:p-6">
              <div
                ref={carouselRef}
                className="planos-carousel flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory"
                aria-label="Carrossel de planos"
              >
                {comparisonPlans.map(({ key, plan }) => {
                  const isSelected = selectedPlanKey === key;
                  const displayName = PLAN_DISPLAY_NAMES[key] || plan.name;
                  const tagline = PLAN_TAGLINES[key] || plan.indication;
                  const differential = PLAN_DIFFERENTIALS[key] || '';
                  const badges = [];

                  if (PLAN_SEALS[key]) badges.push(PLAN_SEALS[key]);
                  if (key === 'profissional') badges.push('Mais escolhido');
                  if (key === 'insider') badges.push('IA + análise');
                  if (key === 'business_corporation') badges.push('Uso ilimitado');
                  if (key === 'diamond_consulting') badges.push('Psicanalista');

                  if (key === 'profissional' || key === 'business') badges.push('White Label opcional');
                  if (key === 'business_corporation' || key === 'diamond_consulting') badges.push('White Label incluso');

                  return (
                    <article
                      key={key}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setSelectedPlanKey(key);
                        trackEvent('planos_carousel_select', { path: '/planos', planKey: key });
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelectedPlanKey(key);
                          trackEvent('planos_carousel_select', { path: '/planos', planKey: key });
                        }
                      }}
                      className={`snap-start shrink-0 w-[86vw] sm:w-[520px] lg:w-[560px] rounded-3xl border p-6 md:p-7 transition-all ${
                        isSelected
                          ? 'border-blue-400/45 bg-blue-500/10 shadow-[0_18px_60px_rgba(59,130,246,0.12)]'
                          : key === 'diamond_consulting'
                            ? 'border-violet-400/25 bg-violet-500/10 hover:bg-violet-500/12'
                            : 'border-white/10 bg-white/5 hover:bg-white/7'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2">
                            {badges.slice(0, 4).map((badge) => (
                              <span
                                key={badge}
                                className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-200"
                              >
                                {badge}
                              </span>
                            ))}
                          </div>
                          <h3 className="mt-4 text-2xl font-extrabold leading-tight text-slate-100">{displayName}</h3>
                          <p className="mt-3 text-base md:text-lg text-slate-200 font-semibold leading-relaxed">{tagline}</p>
                          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                            Indicação: <span className="text-slate-200">{plan.indication}</span>
                          </p>
                          {differential ? (
                            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                              Diferencial: <span className="text-slate-200">{differential}</span>
                            </p>
                          ) : null}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-2xl font-black text-slate-50">{plan.price}</div>
                          <div className="text-sm text-slate-400">{key === 'disc' ? 'Pagamento único' : 'Assinatura mensal'}</div>
                        </div>
                      </div>

                      <div className="mt-6 grid gap-2 text-sm text-slate-300">
                        {(plan.benefits || []).slice(0, 5).map((benefit) => (
                          <div key={benefit} className="flex gap-2">
                            <span className="text-emerald-300 font-bold">✓</span>
                            <span className="min-w-0">{benefit}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-7 flex flex-col sm:flex-row gap-3">
                        <Link
                          to={plan.checkoutPath}
                          className="btn-primary px-6 py-3 rounded-2xl font-bold text-base text-center"
                          onClick={() => trackPlanClick(key, 'carousel_cta_primary')}
                        >
                          {plan.ctaLabel}
                        </Link>
                        <Link
                          to={resolvePlanDetailsPath(key)}
                          className="btn-secondary glass-card px-6 py-3 rounded-2xl font-bold text-base text-slate-200 border border-white/10 text-center"
                          onClick={() => trackPlanClick(key, 'carousel_cta_secondary')}
                        >
                          Ver detalhes
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>

              {selectedPlan ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-[0.16em] text-blue-200 mb-2">Plano selecionado</div>
                      <div className="text-xl md:text-2xl font-extrabold text-slate-50">{selectedPlan.name}</div>
                      <div className="mt-2 text-slate-300">{selectedPlan.indication}</div>
                    </div>
                    <div className="shrink-0">
                      <div className="text-sm text-slate-400">Resumo financeiro</div>
                      <div className="mt-1 text-lg font-bold text-slate-100">{selectedPlanPriceLabel}</div>
                    </div>
                  </div>

                  {selectedPlanKey === 'diamond_consulting' ? (
                    <div className="mt-5 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-5 py-4 text-slate-100">
                      <div className="font-semibold">Acompanhamento estratégico com psicanalista</div>
                      <div className="mt-1 text-sm text-slate-300">
                        Entrevista inicial, leitura interpretativa, devolutiva executiva para a empresa e suporte consultivo contínuo.
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 grid sm:grid-cols-2 gap-3 text-sm text-slate-300">
                    {(selectedPlan.benefits || []).slice(0, 6).map((benefit) => (
                      <div key={benefit} className="flex gap-2">
                        <span className="text-emerald-300 font-bold">✓</span>
                        <span className="min-w-0">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section id="comparativo-planos" className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-4xl mb-10 scroll-reveal">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Comparativo detalhado</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Comparativo completo: recursos, escala e diferenciais</h2>
              <p className="text-lg text-slate-400">
                Compare recursos, capacidade mensal e posicionamento de cada assinatura. No mobile, arraste a tabela para o lado para ver todos os planos.
              </p>
            </div>

            <div className="scroll-reveal planos-compare-scroll rounded-3xl glass-card border border-white/10">
              <table className="planos-compare-table w-full min-w-[1180px] text-left">
                <thead>
                  <tr className="border-b border-slate-700/70">
                    <th className="planos-compare-head-cell planos-compare-sticky-col py-4 px-5 font-bold text-slate-200">Recurso</th>
                    <th className="planos-compare-head-cell py-4 px-5 text-center font-bold text-slate-200">DISC Individual</th>
                    <th className="planos-compare-head-cell py-4 px-5 text-center font-bold text-slate-200">Personal</th>
                    <th className="planos-compare-head-cell py-4 px-5 text-center font-bold text-slate-200">Insider</th>
                    <th className="planos-compare-head-cell planos-compare-head-prof py-4 px-5 text-center font-bold text-blue-200">Professional</th>
                    <th className="planos-compare-head-cell py-4 px-5 text-center font-bold text-slate-200">Business</th>
                    <th className="planos-compare-head-cell py-4 px-5 text-center font-bold text-slate-200">Business Corporation</th>
                    <th className="planos-compare-head-cell py-4 px-5 text-center font-bold text-slate-200">Diamond Consulting</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {SUMMARY_COMPARISON_ROWS.map((row, index) => (
                    <tr
                      key={row.feature}
                      className={`group planos-compare-summary-row transition-colors hover:bg-white/7 ${index % 2 === 0 ? 'bg-white/3' : 'bg-white/5'}`}
                    >
                      <td className="planos-compare-sticky-col planos-compare-feature-cell py-4 px-5 text-slate-300">{row.feature}</td>
                      {renderComparisonCell(row.disc, false)}
                      {renderComparisonCell(row.personal, false)}
                      {renderComparisonCell(row.insider, false)}
                      {renderComparisonCell(row.profissional, true)}
                      {renderComparisonCell(row.business, false)}
                      {renderComparisonCell(row.business_corporation, false)}
                      {renderComparisonCell(row.diamond_consulting, false)}
                    </tr>
                  ))}
                  <tr className="group planos-compare-toggle-row border-t border-white/10">
                    <td className="planos-compare-sticky-col planos-compare-feature-cell py-4 px-5 text-slate-200 font-semibold">
                      Comparação completa
                    </td>
                    <td colSpan={7} className="planos-compare-toggle-cell py-4 px-5 text-center">
                      <button
                        type="button"
                        onClick={toggleComparisonDetails}
                        className="planos-compare-toggle-btn inline-flex items-center justify-center rounded-xl border border-blue-400/35 bg-blue-500/12 px-4 py-2 text-sm font-semibold text-blue-100 transition-all hover:border-blue-300/55 hover:bg-blue-500/20"
                      >
                        {showFullComparison ? 'Ocultar comparação completa' : 'Mostrar todos os recursos'}
                      </button>
                    </td>
                  </tr>
                </tbody>
                {showFullComparison ? (
                  <tbody className="divide-y divide-slate-700/45 planos-compare-details">
                    {DETAILED_COMPARISON_ROWS.map((row, index) => (
                      <tr
                        key={row.feature}
                        className={`group planos-compare-detail-row transition-colors hover:bg-white/7 ${index % 2 === 0 ? 'bg-white/2' : 'bg-white/4'}`}
                        style={{ animationDelay: `${index * 0.016}s` }}
                      >
                        <td className="planos-compare-sticky-col planos-compare-feature-cell py-4 px-5 text-slate-300">{row.feature}</td>
                        {renderComparisonCell(row.disc, false)}
                        {renderComparisonCell(row.personal, false)}
                        {renderComparisonCell(row.insider, false)}
                        {renderComparisonCell(row.profissional, true)}
                        {renderComparisonCell(row.business, false)}
                        {renderComparisonCell(row.business_corporation, false)}
                        {renderComparisonCell(row.diamond_consulting, false)}
                      </tr>
                    ))}
                  </tbody>
                ) : null}
              </table>
            </div>
            <p className="scroll-reveal mt-3 text-sm text-slate-400">
              Tabela inicial com critérios essenciais. Use “Mostrar todos os recursos” para abrir o detalhamento completo sem sair da página.
            </p>

            <div className="scroll-reveal mt-7 grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-amber-500/10 border border-amber-400/25 px-5 py-4 text-amber-100">
                Créditos extras disponíveis por R$ 19,98 por crédito, com contratação somente dentro da plataforma para usuários logados.
              </div>
              <div className="rounded-2xl bg-white/5 border border-white/10 px-5 py-4 text-slate-300">
                Créditos mensais incluídos no plano são renovados automaticamente a cada ciclo e não são acumulativos para o mês seguinte.
              </div>
            </div>
            <p className="scroll-reveal mt-4 text-sm text-slate-400">
              No modelo comercial atual, o plano Business herda integralmente os recursos do Profissional, com camadas adicionais para operação em equipe.
            </p>
          </div>
        </section>

        <section className="py-20 px-6 bg-slate-900/35 border-y border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="max-w-3xl mb-12 scroll-reveal">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Orientação rápida</p>
              <h2 className="text-3xl md:text-5xl font-extrabold mb-4">Qual plano faz mais sentido para você?</h2>
              <p className="text-lg text-slate-400">
                Use este guia para se encontrar pela sua fase de uso. Se estiver em dúvida, comece no plano mais adequado hoje e evolua conforme sua operação cresce.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PLAN_GUIDE_ITEMS.map((item) => {
                const plan = PLANS[item.key];
                const isDiamond = item.key === 'diamond_consulting';
                const isCorporation = item.key === 'business_corporation';
                const displayName = PLAN_DISPLAY_NAMES[item.key] || item.title;

                return (
                  <div
                    key={item.key}
                    className={`scroll-reveal rounded-3xl glass-card border p-6 ${isDiamond ? 'border-violet-400/25 bg-violet-500/10' : isCorporation ? 'border-blue-400/18 bg-blue-500/8' : 'border-white/10 bg-white/5'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs uppercase tracking-[0.16em] text-slate-400">{PLAN_SEALS[item.key] || 'Plano'}</div>
                        <div className="mt-2 text-xl font-extrabold text-slate-100">{displayName}</div>
                      </div>
                      {plan?.price ? (
                        <div className="text-right shrink-0">
                          <div className="text-lg font-black text-slate-50">{plan.price}</div>
                          <div className="text-xs text-slate-400">{item.key === 'disc' ? 'Pagamento único' : 'Assinatura mensal'}</div>
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-4 text-slate-300 leading-relaxed">{item.description}</p>
                    {plan?.checkoutPath ? (
                      <div className="mt-6">
                        <Link
                          to={plan.checkoutPath}
                          className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-bold text-slate-100 hover:bg-white/10 transition-colors w-full"
                          onClick={() => trackPlanClick(item.key, 'plan_guide_cta')}
                        >
                          Ver este plano
                        </Link>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="scroll-reveal cta-focus dossie-cta-highlight rounded-[30px] glass-card border border-white/10 p-8 md:p-12 text-center">
              <h2 className="text-3xl md:text-5xl font-extrabold leading-tight mb-4">
                Comece no plano certo e evolua com segurança
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                O InsightDISC acompanha desde a análise individual até estruturas corporativas e consultivas de alto nível. Escolha o plano que melhor representa sua fase atual e evolua com mais clareza, profundidade e posicionamento.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <a
                  href="#resumo-planos"
                  className="btn-primary px-8 py-4 rounded-2xl font-bold text-lg text-center"
                  onClick={() => trackPlanClick('planos', 'final_cta_choose_plan')}
                >
                  Escolher meu plano
                </a>
                <Link
                  to="/empresa"
                  className="btn-secondary glass-card px-8 py-4 rounded-2xl font-bold text-lg text-slate-200 border border-white/10 text-center"
                  onClick={() => trackPlanClick('empresa', 'final_cta_talk_to_specialist')}
                >
                  Falar com especialista
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-14 px-6 border-t border-slate-800">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img
                src="/logos/insightDISC_logo4_transp.png"
                alt="InsightDISC"
                className="h-10 w-10 rounded-xl object-contain"
              />
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
