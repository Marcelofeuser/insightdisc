import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { apiRequest } from '@/lib/apiClient';
import { resolveCheckoutPlan } from '@/modules/marketing/plansCatalog';
import { buildLoginRedirectUrl } from '@/modules/auth/next-path';
import { useAuth } from '@/lib/AuthContext';
import { getCheckoutPreviewState, requiresCheckoutPreview } from '@/modules/checkout/funnel';
import '@/styles/checkout-approved.css';

const PLAN_UI = Object.freeze({
  personal: {
    badge: 'Plano individual',
    title: 'Personal',
    subtitle:
      'Acesso individual com recorrência leve, relatório completo e histórico pessoal para evolução contínua.',
    price: 'R$ 79,90',
    billing: 'mensal',
    summary:
      'Mais profundidade e acompanhamento contínuo em comparação ao DISC individual.',
    features: [
      {
        title: 'Relatório DISC completo',
        description: 'Leitura comportamental clara, direta e aplicada ao uso pessoal.',
      },
      {
        title: 'Histórico de acesso',
        description: 'Guarda seus relatórios e evolução no mesmo ambiente.',
      },
      {
        title: 'Direcionamentos de desenvolvimento',
        description: 'Sugestões práticas para autoconhecimento e crescimento.',
      },
      {
        title: 'Fluxo simples e rápido',
        description: 'Ideal para entrar com baixo atrito e começar logo.',
      },
    ],
  },
  professional: {
    badge: 'Plano mais escolhido',
    title: 'Professional',
    subtitle:
      'Plano principal para consultores, analistas e profissionais que precisam operar avaliações DISC com frequência e qualidade.',
    price: 'R$ 197',
    billing: 'mensal',
    summary:
      'Inclui dossiê técnico, comparador, IA e operação recorrente acima do Personal.',
    features: [
      {
        title: '10 avaliações por mês',
        description: 'Operação recorrente com volume inicial validado para profissionais.',
      },
      {
        title: 'Coach AI incluído',
        description: 'Orientação contextual por relatório real selecionado.',
      },
      {
        title: 'AI Lab incluído',
        description: 'Leituras avançadas e hipóteses mais estratégicas.',
      },
      {
        title: 'Comparador e arquétipos',
        description: 'Profundidade analítica para devolutivas e apresentações.',
      },
    ],
  },
  business: {
    badge: 'Para equipes e RH',
    title: 'Business',
    subtitle:
      'Solução para equipes e empresas que precisam de análise comportamental aplicada à gestão, liderança e decisões estratégicas.',
    price: 'R$ 397',
    billing: 'mensal',
    summary:
      'Adiciona Team Map e visão estratégica de equipe acima do Professional.',
    features: [
      {
        title: '25 avaliações por mês',
        description: 'Escala inicial para operação recorrente em equipe.',
      },
      {
        title: 'Tudo do Professional',
        description: 'Herda integralmente o plano profissional.',
      },
      {
        title: 'Team Map',
        description: 'Mapa comportamental de equipe com leitura consolidada.',
      },
      {
        title: 'Visão estratégica de gestão',
        description: 'Insights para liderança, RH e evolução organizacional.',
      },
    ],
  },
  diamond: {
    badge: 'Escala avançada',
    title: 'Diamond',
    subtitle:
      'Topo do SaaS automático para operações intensivas, consultorias em escala e times que precisam de uso contínuo com prioridade.',
    price: 'R$ 697',
    billing: 'mensal • uso justo',
    summary: 'Escala ilimitada e operação intensiva acima do Business.',
    features: [
      {
        title: 'Avaliações ilimitadas',
        description: 'Uso justo para operação contínua sem gargalo comercial.',
      },
      {
        title: 'Tudo do Business',
        description: 'Mantém todos os recursos de equipe e inteligência organizacional.',
      },
      {
        title: 'Prioridade de processamento',
        description: 'Experiência mais fluida em ambientes de alto volume.',
      },
      {
        title: 'Ideal para escala',
        description: 'Posicionamento acima do Business e abaixo do Enterprise consultivo.',
      },
    ],
  },
});

const PAYMENT_OPTIONS = Object.freeze([
  {
    key: 'pix',
    title: 'Pix',
    copy: 'Confirmação rápida e fluxo otimizado.',
    icon: '⚡',
  },
  {
    key: 'card',
    title: 'Cartão',
    copy: 'Pagamento seguro com possibilidade de parcelamento conforme emissor.',
    icon: '💳',
  },
]);

function resolveCheckoutPlanKey(planSlug = '', fallbackPlanKey = '') {
  const normalizedSlug = String(planSlug || '').trim().toLowerCase();
  if (normalizedSlug === 'professional' || normalizedSlug === 'profissional' || normalizedSlug === 'pro') {
    return 'professional';
  }
  if (normalizedSlug === 'business') return 'business';
  if (normalizedSlug === 'diamond') return 'diamond';
  if (normalizedSlug === 'personal') return 'personal';

  const normalizedPlanKey = String(fallbackPlanKey || '').trim().toLowerCase();
  if (normalizedPlanKey === 'profissional') return 'professional';
  if (normalizedPlanKey === 'professional') return 'professional';
  if (normalizedPlanKey === 'business') return 'business';
  if (normalizedPlanKey === 'diamond') return 'diamond';
  return 'personal';
}

export default function CheckoutPlanPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { planSlug } = useParams();
  const { access, user } = useAuth();
  const plan = resolveCheckoutPlan(planSlug);
  const checkoutPlanKey = useMemo(
    () => resolveCheckoutPlanKey(planSlug, plan?.key),
    [plan?.key, planSlug],
  );
  const planUi = useMemo(
    () => PLAN_UI[checkoutPlanKey] || PLAN_UI.personal,
    [checkoutPlanKey],
  );

  const [selectedMethod, setSelectedMethod] = useState('pix');
  const [orderBumpEnabled, setOrderBumpEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [previewState, setPreviewState] = useState(() => getCheckoutPreviewState());

  const previewRequired = requiresCheckoutPreview(access);
  const canProceedToPayment = !previewRequired || previewState.hasPreview;

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
    if (!planUi?.title) return;
    trackEvent('checkout_public_view', {
      planKey: checkoutPlanKey,
      path: location.pathname,
    });
  }, [checkoutPlanKey, location.pathname, planUi?.title]);

  useEffect(() => {
    if (!planUi?.title) return;
    trackEvent('checkout_started', {
      planKey: checkoutPlanKey,
      path: location.pathname,
      previewRequired,
      previewReady: canProceedToPayment,
    });
  }, [canProceedToPayment, checkoutPlanKey, location.pathname, planUi?.title, previewRequired]);

  if (!plan) {
    return <Navigate to="/planos" replace />;
  }

  const handleFinalizePayment = async () => {
    if (!user?.id) {
      const loginRedirectUrl = buildLoginRedirectUrl({
        pathname: location.pathname,
        search: location.search || '',
      });
      navigate(loginRedirectUrl);
      return;
    }

    if (!canProceedToPayment) {
      setFeedback('Antes de pagar, veja um preview do relatório para liberar o checkout.');
      return;
    }

    setIsSubmitting(true);
    setFeedback('');

    trackEvent('checkout_public_finalize_click', {
      planKey: checkoutPlanKey,
      paymentMethod: selectedMethod,
      orderBumpEnabled,
      path: location.pathname,
    });

    try {
      const response = await apiRequest('/payments/create-checkout', {
        method: 'POST',
        requireAuth: true,
        body: {
          plan: checkoutPlanKey,
          billing: 'monthly',
          provider: 'STRIPE',
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

      setFeedback(error?.message || 'Não foi possível iniciar o checkout agora.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkout-approved-page">
      <div className="container">
        <div className="header">
          <div className="brand">
            <div className="eyebrow">InsightDISC</div>
            <h1>Checkout do plano</h1>
            <p>Fluxo individual por plano, com login obrigatório e ativação automática via webhook.</p>
          </div>
          <div className="nav-pill">🔒 Checkout seguro com Stripe + Pix</div>
        </div>

        <div className="hero-card">
          <div className="checkout-grid">
            <section className="panel">
              <span className="badge primary">{planUi.badge}</span>
              <div className="plan-title">
                <div>
                  <h2>{planUi.title}</h2>
                  <p className="subcopy">{planUi.subtitle}</p>
                </div>
                <div className="price">
                  {planUi.price}
                  <br />
                  <small>{planUi.billing}</small>
                </div>
              </div>

              <label className="toggle">
                <input
                  type="checkbox"
                  checked={orderBumpEnabled}
                  onChange={(event) => setOrderBumpEnabled(event.target.checked)}
                  disabled={isSubmitting}
                />
                <div>
                  <strong>Adicionar análise avançada com IA por R$ 19,90</strong>
                  <div className="fine">
                    Order bump opcional para aprofundar insights, recomendações e leitura estratégica.
                  </div>
                </div>
              </label>

              <ul className="feature-list">
                {planUi.features.map((feature) => (
                  <li key={feature.title} className="feature-item">
                    <span className="check">✓</span>
                    <div>
                      <strong>{feature.title}</strong>
                      <div className="fine">{feature.description}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            <aside className="panel dark">
              <div className="sidebar-section">
                <div className="label">Resumo do pedido</div>
                <div style={{ marginTop: 12, fontSize: 18, fontWeight: 700 }}>{planUi.title}</div>
                <div className="fine" style={{ marginTop: 8 }}>{planUi.summary}</div>
              </div>

              <div className="sidebar-section">
                <div className="label">Método de pagamento</div>
                <div className="method-grid">
                  {PAYMENT_OPTIONS.map((method) => {
                    const selected = method.key === selectedMethod;
                    return (
                      <button
                        key={method.key}
                        type="button"
                        className={`method ${selected ? 'selected' : ''}`}
                        onClick={() => setSelectedMethod(method.key)}
                        disabled={isSubmitting}
                      >
                        <div>
                          <strong>{method.title}</strong>
                          <div className="fine">{method.copy}</div>
                        </div>
                        <div>{method.icon}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sidebar-section">
                <div className="label">Garantias e segurança</div>
                <div className="kpis">
                  <div className="kpi">
                    <strong>Webhook</strong>
                    <span className="fine">Ativação só após confirmação</span>
                  </div>
                  <div className="kpi">
                    <strong>Stripe</strong>
                    <span className="fine">Checkout protegido</span>
                  </div>
                  <div className="kpi">
                    <strong>Login</strong>
                    <span className="fine">Compra vinculada à conta</span>
                  </div>
                </div>
              </div>

              <div className="sidebar-section">
                {!canProceedToPayment ? (
                  <div className="checkout-preview-alert">
                    <strong>Prévia obrigatória antes do pagamento.</strong>
                    <div className="fine" style={{ color: '#fde68a', marginTop: 4 }}>
                      Para liberar o checkout, veja antes o preview do relatório comportamental.
                    </div>
                    <div className="cta-row" style={{ marginTop: 10 }}>
                      <Link
                        className="btn secondary"
                        style={{ width: 'auto', padding: '10px 14px' }}
                        to={previewState.assessmentId ? `/assessment/${encodeURIComponent(previewState.assessmentId)}/result` : '/StartFree'}
                      >
                        Ver preview agora
                      </Link>
                    </div>
                  </div>
                ) : null}

                <button
                  type="button"
                  className="btn primary"
                  onClick={handleFinalizePayment}
                  disabled={isSubmitting || !canProceedToPayment}
                >
                  {isSubmitting ? 'Processando...' : 'Finalizar pagamento'}
                </button>

                {feedback ? <div className="checkout-feedback-error">{feedback}</div> : null}

                <div className="footer-note">
                  Ao continuar, o usuário segue para o checkout Stripe. A página de sucesso não libera acesso sozinha.
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
