import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { apiRequest } from '@/lib/apiClient';
import { HOME_SECTION_LINKS, PRODUCT_TABS } from '@/modules/marketing/landingNavConfig';
import { resolveCheckoutPlan } from '@/modules/marketing/plansCatalog';
import { buildLoginRedirectUrl } from '@/modules/auth/next-path';
import { useAuth } from '@/lib/AuthContext';
import {
  getCheckoutPreviewState,
  requiresCheckoutPreview,
} from '@/modules/checkout/funnel';
import '../styles/landing.css';

const PAYMENT_OPTIONS = Object.freeze([
  {
    key: 'pix',
    title: 'Pix',
    copy: 'Confirmação rápida e fluxo otimizado para compra direta.',
  },
  {
    key: 'card',
    title: 'Cartão',
    copy: 'Pagamento seguro com opção de parcelamento conforme emissor.',
  },
]);

const TRUST_ITEMS = Object.freeze([
  'Checkout seguro com Stripe + Pix',
  'Ativação automática somente via webhook confirmado',
  'Pagamento vinculado à sua conta InsightDISC',
]);

const PLAN_CONTEXT_NOTES = Object.freeze({
  disc: 'Entrega pontual com acesso imediato ao relatório completo, sem assinatura da plataforma.',
  personal: 'Inclui direcionamentos de desenvolvimento e acompanhamento de evolução para uso pessoal com recorrência leve.',
  profissional:
    'Inclui dossiê técnico, comparador avançado, arquétipos por relatório e 10 créditos mensais.',
  business:
    'Herda integralmente o Profissional e adiciona Team Map, visão estratégica de equipe e recursos para gestão de pessoas.',
  diamond:
    'Herda integralmente o Business com uso ilimitado para operação em escala empresarial.',
});

const ORDER_BUMP_PRICE_LABEL = 'R$ 19';

const PLAN_VALUE_COMPARISON = Object.freeze({
  personal: 'Mais profundidade e histórico contínuo versus o DISC avulso.',
  profissional: 'Inclui dossiê, comparador e operação recorrente acima do Personal.',
  business: 'Adiciona Team Map e visão estratégica de equipe acima do Profissional.',
  diamond: 'Escala ilimitada e operação enterprise acima do Business.',
});

function resolveBillingPlanId(planKey = '') {
  const normalized = String(planKey || '').trim().toLowerCase();
  if (normalized === 'profissional') return 'professional';
  if (normalized === 'business') return 'business';
  if (normalized === 'personal') return 'personal';
  if (normalized === 'disc') return 'disc';
  if (normalized === 'diamond') return 'business';
  return normalized;
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

export default function CheckoutPlanPage() {
  const rootRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { planSlug } = useParams();
  const { access } = useAuth();
  const plan = resolveCheckoutPlan(planSlug);
  const startTrackRef = useRef('');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavSticky, setIsNavSticky] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('pix');
  const [orderBumpEnabled, setOrderBumpEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [previewState, setPreviewState] = useState(() => getCheckoutPreviewState());

  const previewRequired = requiresCheckoutPreview(access);
  const canProceedToPayment = !previewRequired || previewState.hasPreview;
  const planComparisonText = useMemo(() => PLAN_VALUE_COMPARISON[plan?.key] || '', [plan?.key]);

  useEffect(() => {
    const refreshPreviewState = () => setPreviewState(getCheckoutPreviewState());
    window.addEventListener('focus', refreshPreviewState);
    window.addEventListener('visibilitychange', refreshPreviewState);
    return () => {
      window.removeEventListener('focus', refreshPreviewState);
      window.removeEventListener('visibilitychange', refreshPreviewState);
    };
  }, []);

  useEffect(() => {
    if (!plan) return undefined;
    trackEvent('checkout_public_view', {
      planKey: plan.key,
      path: location.pathname,
    });
    return undefined;
  }, [location.pathname, plan]);

  useEffect(() => {
    if (!plan) return;

    const trackKey = [
      plan.key,
      previewRequired ? 'preview-required' : 'preview-not-required',
      canProceedToPayment ? 'preview-ok' : 'preview-missing',
    ].join(':');

    if (startTrackRef.current === trackKey) return;
    startTrackRef.current = trackKey;

    trackEvent('checkout_started', {
      planKey: plan.key,
      path: location.pathname,
      previewRequired,
      previewReady: canProceedToPayment,
    });
  }, [canProceedToPayment, location.pathname, plan, previewRequired]);

  useEffect(() => {
    if (!plan) return undefined;

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
    const checkoutTitle = `${plan.name} | Checkout Público InsightDISC`;
    const checkoutDescription = `Página pública de checkout para o plano ${plan.name} no InsightDISC.`;

    document.title = checkoutTitle;
    htmlEl.lang = 'pt-BR';
    htmlClassesToAdd.forEach((className) => htmlEl.classList.add(className));
    bodyClassesToAdd.forEach((className) => bodyEl.classList.add(className));

    upsertMetaTag('meta[name="description"]', { name: 'description' }, checkoutDescription, createdMetas, previousMetaContents);
    upsertMetaTag('meta[property="og:title"]', { property: 'og:title' }, checkoutTitle, createdMetas, previousMetaContents);
    upsertMetaTag('meta[property="og:description"]', { property: 'og:description' }, checkoutDescription, createdMetas, previousMetaContents);
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
  }, [plan]);

  if (!plan) {
    return <Navigate to="/planos" replace />;
  }

  const handleSelectMethod = (method) => {
    setSelectedMethod(method);
    trackEvent('checkout_public_payment_method_selected', {
      planKey: plan.key,
      paymentMethod: method,
      path: location.pathname,
    });
  };

  const handleToggleOrderBump = () => {
    setOrderBumpEnabled((prev) => {
      const nextValue = !prev;
      if (nextValue) {
        trackEvent('order_bump_added', {
          planKey: plan?.key,
          bumpType: 'advanced_analysis',
          amount: 19,
          currency: 'BRL',
          path: location.pathname,
        });
      }
      return nextValue;
    });
  };

  const handleFinalizePayment = async () => {
    if (!canProceedToPayment) {
      setFeedback('Antes de pagar, veja um preview do relatório para liberar o checkout.');
      return;
    }

    setIsSubmitting(true);
    setFeedback('');

    trackEvent('checkout_public_finalize_click', {
      planKey: plan.key,
      paymentMethod: selectedMethod,
      orderBumpEnabled,
      path: location.pathname,
    });

    try {
      const planId = resolveBillingPlanId(plan.key);
      const mode = planId === 'professional' || planId === 'business' ? 'subscription' : 'payment';

      const response = await apiRequest('/billing/create-checkout-session', {
        method: 'POST',
        requireAuth: true,
        body: {
          planId,
          mode,
          orderBumpAdvancedAnalysis: orderBumpEnabled,
        },
      });

      const checkoutUrl = String(response?.checkoutUrl || response?.url || '').trim();
      if (!checkoutUrl) {
        throw new Error('CHECKOUT_URL_NOT_FOUND');
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      if (error?.message === 'API_AUTH_MISSING') {
        const loginRedirectUrl = buildLoginRedirectUrl({
          pathname: location.pathname,
          search: location.search || '',
        });
        navigate(loginRedirectUrl);
        return;
      }

      const message = error?.message || 'Não foi possível iniciar o checkout agora.';
      setFeedback(message);
    } finally {
      setIsSubmitting(false);
    }
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
                  <Link key={tab.to} to={tab.to} className="text-slate-300 hover:text-white transition-colors">
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
                  className="block py-2 text-slate-300 hover:text-white transition-colors"
                >
                  {tab.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>

        <section className="relative pt-28 px-6 pb-14 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl"></div>
            <div className="absolute top-36 right-16 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl"></div>
          </div>
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="max-w-4xl">
              <div className="fade-up inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full mb-7">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-sm text-slate-300">Checkout público InsightDISC</span>
              </div>
              <h1 className="fade-up hero-gradient-title text-4xl md:text-5xl xl:text-6xl font-extrabold leading-tight mb-5" style={{ animationDelay: '.1s' }}>
                Finalizar <span className="headline-accent">{plan.name}</span>
              </h1>
              {plan.highlight ? (
                <div className="fade-up inline-flex items-center rounded-full border border-amber-300/40 bg-amber-400/10 px-3 py-1 mb-4 text-xs font-semibold uppercase tracking-[0.12em] text-amber-200" style={{ animationDelay: '.18s' }}>
                  {plan.highlight}
                </div>
              ) : null}
              <p className="fade-up text-lg md:text-2xl text-slate-300 leading-relaxed mb-4" style={{ animationDelay: '.2s' }}>
                {plan.description}
              </p>
              <div className="fade-up inline-flex items-end gap-3" style={{ animationDelay: '.28s' }}>
                <p className="text-4xl md:text-5xl font-extrabold">{plan.price}</p>
                <p className="text-slate-400 pb-2">{plan.billingLabel}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="pb-24 px-6">
          <div className="max-w-7xl mx-auto grid xl:grid-cols-[1.1fr_0.9fr] gap-6 items-start">
            <article className="scroll-reveal dossie-card glass-card rounded-3xl p-7 md:p-8">
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Forma de pagamento</p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-6">Escolha Pix ou Cartão</h2>
              {!canProceedToPayment ? (
                <div className="rounded-2xl border border-amber-300/30 bg-amber-500/10 p-4 mb-6">
                  <p className="text-sm text-amber-100 font-semibold mb-2">Etapa obrigatória antes do pagamento</p>
                  <p className="text-sm text-slate-200">
                    Para manter o checkout orientado a valor, veja primeiro um preview do relatório comportamental.
                  </p>
                  <div className="flex flex-wrap gap-3 mt-4">
                    <Link to={previewState.assessmentId ? `/assessment/${encodeURIComponent(previewState.assessmentId)}/result` : '/StartFree'} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold">
                      Ver preview agora
                    </Link>
                    <Link to="/avaliacoes" className="btn-secondary glass-card border border-white/10 px-4 py-2 rounded-xl text-sm font-semibold">
                      Ir para avaliações
                    </Link>
                  </div>
                </div>
              ) : null}
              <div className="grid sm:grid-cols-2 gap-4 mb-7">
                {PAYMENT_OPTIONS.map((method) => {
                  const isActive = selectedMethod === method.key;
                  return (
                    <button
                      key={method.key}
                      type="button"
                      onClick={() => handleSelectMethod(method.key)}
                      className={`text-left rounded-2xl border px-4 py-4 transition-all ${
                        isActive
                          ? 'border-blue-400/55 bg-blue-500/15 shadow-[0_0_0_1px_rgba(96,165,250,0.2)]'
                          : 'border-white/10 bg-white/5 hover:border-white/25'
                      }`}
                    >
                      <p className="font-bold mb-1">{method.title}</p>
                      <p className="text-sm text-slate-300">{method.copy}</p>
                    </button>
                  );
                })}
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-6">
                <p className="text-sm uppercase tracking-[0.14em] text-slate-400 mb-2">O que você recebe</p>
                <ul className="grid gap-2 text-slate-200">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      <span className="inline-flex items-start gap-2">
                        <span className="mt-[2px] inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300 text-[11px] font-bold">
                          ✓
                        </span>
                        <span>{benefit}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-violet-300/35 bg-violet-500/10 p-4 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-white/20 bg-transparent"
                  checked={orderBumpEnabled}
                  onChange={handleToggleOrderBump}
                  disabled={isSubmitting}
                />
                <span>
                  <span className="block text-sm font-semibold text-violet-100">
                    Adicionar análise avançada por {ORDER_BUMP_PRICE_LABEL}
                  </span>
                  <span className="block text-sm text-slate-300 mt-1">
                    Inclui leitura estratégica extra para liderança, comunicação e decisões críticas.
                  </span>
                </span>
              </label>

              <button
                type="button"
                onClick={handleFinalizePayment}
                className="btn-primary w-full px-6 py-4 rounded-2xl font-bold text-lg"
                disabled={isSubmitting || !canProceedToPayment}
              >
                {isSubmitting ? 'Processando...' : canProceedToPayment ? 'Finalizar pagamento' : 'Veja o preview para liberar'}
              </button>
              {feedback ? <p className="text-sm text-blue-200 mt-3">{feedback}</p> : null}
            </article>

            <div className="grid gap-6">
              <article className="scroll-reveal dossie-card glass-card rounded-3xl p-7 md:p-8">
                <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Resumo</p>
                <h3 className="text-2xl font-extrabold mb-4">{plan.name}</h3>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400 mb-1">Valor do plano</p>
                  <p className="text-3xl font-extrabold mb-2">{plan.price}</p>
                  <p className="text-slate-400">{plan.billingLabel}</p>
                  {PLAN_CONTEXT_NOTES[plan.key] ? (
                    <p className="mt-3 text-sm text-slate-300 leading-relaxed">{PLAN_CONTEXT_NOTES[plan.key]}</p>
                  ) : null}
                  {planComparisonText ? (
                    <p className="mt-3 text-sm text-emerald-200 leading-relaxed">
                      {planComparisonText}
                    </p>
                  ) : null}
                </div>
              </article>

              <article className="scroll-reveal dossie-card glass-card rounded-3xl p-7 md:p-8">
                <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Confiança</p>
                <h3 className="text-2xl font-extrabold mb-4">Fluxo público pronto para venda</h3>
                <div className="grid gap-2 text-slate-300">
                  {TRUST_ITEMS.map((item) => (
                    <div key={item} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      {item}
                    </div>
                  ))}
                </div>
                <Link to="/planos" className="btn-secondary glass-card border border-white/10 rounded-xl px-4 py-3 font-semibold text-center mt-5">
                  Voltar para planos
                </Link>
              </article>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
