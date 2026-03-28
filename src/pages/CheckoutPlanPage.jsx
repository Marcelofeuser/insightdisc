import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest, getApiToken } from '@/lib/apiClient';
import { buildLoginRedirectUrl } from '@/modules/auth/next-path';
import { HOME_SECTION_LINKS, PRODUCT_TABS } from '@/modules/marketing/landingNavConfig';
import { resolveCheckoutPlan } from '@/modules/marketing/plansCatalog';
import '../styles/landing.css';

const PAYMENT_OPTIONS = Object.freeze([
  {
    key: 'pix',
    title: 'Pix',
    copy: 'Aprovação rápida e confirmação praticamente imediata.',
  },
  {
    key: 'card',
    title: 'Cartão',
    copy: 'Parcelamento e processamento seguro para compra recorrente.',
  },
]);

const TRUST_ITEMS = Object.freeze([
  'Ambiente seguro para pagamento',
  'Ativação imediata após confirmação',
  'Base pronta para gateway real',
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

export default function CheckoutPlanPage() {
  const rootRef = useRef(null);
  const confirmedSessionRef = useRef('');
  const navigate = useNavigate();
  const location = useLocation();
  const { access } = useAuth();
  const { planSlug } = useParams();
  const queryParams = new URLSearchParams(location.search);
  const tier = queryParams.get('tier') || '';
  const paymentStatus = String(queryParams.get('payment') || '').trim().toLowerCase();
  const sessionId = String(queryParams.get('session_id') || '').trim();
  const plan = resolveCheckoutPlan(planSlug, tier);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavSticky, setIsNavSticky] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('pix');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (!plan) return undefined;
    trackEvent('checkout_plan_view', {
      planKey: plan.key,
      path: location.pathname,
      tier: tier || undefined,
    });
    return undefined;
  }, [location.pathname, plan, tier]);

  useEffect(() => {
    if (!plan) return;
    if (paymentStatus === 'cancel') {
      setFeedback('Pagamento cancelado. Você pode tentar novamente quando quiser.');
      return;
    }
    if (paymentStatus !== 'success' || !sessionId) return;
    if (confirmedSessionRef.current === sessionId) return;

    const loginRedirectUrl = buildLoginRedirectUrl({
      pathname: location.pathname,
      search: location.search || '',
    });
    const isAuthenticated = Boolean(access?.userId) || Boolean(getApiToken());
    if (!isAuthenticated) {
      navigate(loginRedirectUrl, { replace: true });
      return;
    }

    confirmedSessionRef.current = sessionId;
    setIsSubmitting(true);
    setFeedback('');

    apiRequest('/billing/confirm-checkout-session', {
      method: 'POST',
      requireAuth: true,
      body: { sessionId },
    })
      .then((payload) => {
        const nextRenewalAt = payload?.summary?.nextRenewalAt
          ? new Date(payload.summary.nextRenewalAt).toLocaleDateString('pt-BR')
          : null;

        if ((plan.enginePlanCode || plan.key) === 'disc') {
          setFeedback('Pagamento confirmado. 1 relatório DISC individual foi liberado com sucesso.');
          return;
        }

        if (nextRenewalAt) {
          setFeedback(`Pagamento confirmado no Stripe. Plano ativado com renovação em ${nextRenewalAt}.`);
          return;
        }

        setFeedback('Pagamento confirmado no Stripe e plano ativado com sucesso.');
      })
      .catch((error) => {
        confirmedSessionRef.current = '';
        const status = Number(error?.status || 0);
        if (status === 401 || status === 403) {
          navigate(loginRedirectUrl, { replace: true });
          return;
        }
        setFeedback(error?.payload?.message || error?.message || 'Falha ao confirmar pagamento no Stripe.');
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }, [access?.userId, location.pathname, location.search, navigate, paymentStatus, plan, sessionId]);

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
    const checkoutTitle = `${plan.name} | Checkout InsightDISC`;
    const checkoutDescription = `Finalizar pagamento do plano ${plan.name} no InsightDISC com opção Pix ou Cartão.`;

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
    trackEvent('checkout_plan_payment_method_selected', {
      planKey: plan.key,
      paymentMethod: method,
      path: location.pathname,
      tier: tier || undefined,
    });
  };

  const handleFinalizePayment = () => {
    const loginRedirectUrl = buildLoginRedirectUrl({
      pathname: location.pathname,
      search: location.search || '',
    });
    const isAuthenticated = Boolean(access?.userId) || Boolean(getApiToken());
    if (!isAuthenticated) {
      navigate(loginRedirectUrl, { replace: true });
      return;
    }

    setIsSubmitting(true);
    setFeedback('');
    trackEvent('checkout_plan_finalize_click', {
      planKey: plan.key,
      paymentMethod: selectedMethod,
      path: location.pathname,
      tier: tier || undefined,
    });

    apiRequest('/billing/create-checkout-session', {
      method: 'POST',
      requireAuth: true,
      body: {
        planCode: plan.enginePlanCode || plan.key,
        paymentMethod: selectedMethod,
      },
    })
      .then((payload) => {
        const checkoutUrl = String(payload?.checkoutUrl || '').trim();
        if (!checkoutUrl) {
          setFeedback('Não foi possível iniciar checkout Stripe agora.');
          setIsSubmitting(false);
          return;
        }
        window.location.href = checkoutUrl;
      })
      .catch((error) => {
        const status = Number(error?.status || 0);
        if (status === 401 || status === 403) {
          navigate(loginRedirectUrl, { replace: true });
          return;
        }
        setFeedback(error?.payload?.message || error?.message || 'Falha ao finalizar pagamento.');
      })
      .finally(() => {
        if (document.visibilityState !== 'hidden') {
          setIsSubmitting(false);
        }
      });
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
                  className="block py-2 text-slate-300 hover:text-white transition-colors"
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
                <span className="text-sm text-slate-300">Checkout seguro InsightDISC</span>
              </div>
              <h1 className="fade-up hero-gradient-title text-4xl md:text-5xl xl:text-6xl font-extrabold leading-tight mb-5" style={{ animationDelay: '.1s' }}>
                Finalizar {plan.name}
              </h1>
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
              <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Escolha de pagamento</p>
              <h2 className="text-2xl md:text-3xl font-extrabold mb-6">Selecione como deseja pagar</h2>
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
                <p className="text-sm uppercase tracking-[0.14em] text-slate-400 mb-2">Benefícios inclusos</p>
                <ul className="grid gap-2 text-slate-200">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={handleFinalizePayment}
                className="btn-primary w-full px-6 py-4 rounded-2xl font-bold text-lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Processando...' : 'Finalizar pagamento'}
              </button>
              <p className="text-sm text-slate-400 mt-4">
                Checkout Stripe em ambiente de teste, com ativação automática do plano após confirmação.
              </p>
              {feedback ? <p className="text-sm text-blue-200 mt-2">{feedback}</p> : null}
            </article>

            <div className="grid gap-6">
              <article className="scroll-reveal dossie-card glass-card rounded-3xl p-7 md:p-8">
                <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Resumo</p>
                <h3 className="text-2xl font-extrabold mb-4">{plan.name}</h3>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400 mb-1">Valor do plano</p>
                  <p className="text-3xl font-extrabold mb-2">{plan.price}</p>
                  <p className="text-slate-400">{plan.billingLabel}</p>
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-sm text-slate-400 mb-2">Método selecionado</p>
                  <p className="text-lg font-semibold">
                    {selectedMethod === 'pix' ? 'Pix' : 'Cartão'}
                  </p>
                </div>
              </article>

              <article className="scroll-reveal dossie-card glass-card rounded-3xl p-7 md:p-8">
                <p className="text-xs uppercase tracking-[0.16em] text-blue-300 mb-3">Confiança</p>
                <h3 className="text-2xl font-extrabold mb-4">Compra segura e ativação rápida</h3>
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
