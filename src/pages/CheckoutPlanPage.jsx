import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { trackEvent } from '@/lib/analytics';
import { apiRequest, getApiToken, getApiUserEmail } from '@/lib/apiClient';
import { resolveCheckoutPlan } from '@/modules/marketing/plansCatalog';
import { useAuth } from '@/lib/AuthContext';
import { getCheckoutPreviewState, requiresCheckoutPreview } from '@/modules/checkout/funnel';
import '@/styles/checkout-approved.css';

const CHECKOUT_INTENT_STORAGE_KEY = 'insightdisc_checkout_intent_v21';
const ORDER_BUMP_PRICE_BRL = 19.9;
const WHITE_LABEL_ADDON_PRICE_BRL = 299;

const WHITE_LABEL_INCLUDED_BADGE = '✔ White Label já incluso neste plano';

const PLAN_PRICE_BY_KEY_BRL = Object.freeze({
  disc_individual: 59.9,
  personal: 99.9,
  insider: 129.9,
  professional: 199.9,
  business: 399.9,
  business_corporation: 999.9,
  diamond_consulting: 9990,
});

function formatPriceBRL(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function persistCheckoutIntent(intent = {}) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(
      CHECKOUT_INTENT_STORAGE_KEY,
      JSON.stringify({
        ...intent,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // ignore
  }
}

const PLAN_UI = Object.freeze({
  disc_individual: {
    badge: 'Pagamento único',
    title: 'DISC Individual — Relatório Completo',
    subtitle:
      'Avaliação comportamental DISC com entrega imediata de um relatório detalhado, ideal para autoconhecimento e tomada de decisão.',
    price: 'R$ 59,90',
    billing: 'pagamento único',
    summary:
      'Entrega imediata do relatório premium, sem assinatura e sem cobranças futuras.',
    features: [
      {
        title: 'Relatório completo instantâneo',
        description: 'Entrega imediata em tela e PDF após a conclusão.',
      },
      {
        title: 'Análise comportamental detalhada',
        description: 'Leitura aplicada para autoconhecimento e decisões mais conscientes.',
      },
      {
        title: 'Perfil predominante e secundário',
        description: 'Entenda intensidade e combinações comportamentais com clareza.',
      },
      {
        title: 'Pontos fortes e de atenção',
        description: 'Mapeamento objetivo de forças naturais e riscos recorrentes.',
      },
      {
        title: 'Aplicação pessoal e profissional',
        description: 'Direcionamentos práticos para rotina, relações e contexto de trabalho.',
      },
    ],
  },
  personal: {
    badge: 'Plano individual',
    title: 'Plano Personal — Uso contínuo individual',
    subtitle:
      'Ideal para quem deseja acompanhar evolução comportamental e utilizar o DISC de forma recorrente no dia a dia.',
    price: 'R$ 99,90',
    billing: 'mensal',
    summary:
      'Acesso contínuo individual para acompanhar histórico e evolução comportamental ao longo do tempo.',
    features: [
      {
        title: 'Acesso contínuo à plataforma',
        description: 'Acompanhe sua leitura e evolução de forma recorrente.',
      },
      {
        title: 'Geração de relatórios individuais',
        description: 'Leituras claras e aplicáveis para o uso no dia a dia.',
      },
      {
        title: 'Histórico de avaliações',
        description: 'Revisite entregas e acompanhe mudanças de padrão ao longo do tempo.',
      },
      {
        title: 'Evolução comportamental',
        description: 'Use o DISC como referência contínua para decisões e ajustes práticos.',
      },
    ],
  },
  insider: {
    badge: 'Personal Pro',
    title: 'Plano Insider — Mais recursos e profundidade',
    subtitle:
      'Para usuários que desejam mais controle, análise e profundidade na utilização do DISC.',
    price: 'R$ 129,90',
    billing: 'mensal',
    summary:
      'Camada individual avançada para uso mais estratégico e interpretação com mais contexto.',
    features: [
      {
        title: 'Recursos avançados de análise',
        description: 'Mais camadas de leitura e interpretação do perfil.',
      },
      {
        title: 'Melhor visualização de dados',
        description: 'Entenda padrões com mais profundidade e consistência.',
      },
      {
        title: 'Uso mais estratégico da plataforma',
        description: 'Aplicação prática para quem já utiliza DISC com frequência.',
      },
      {
        title: 'Ideal para uso recorrente',
        description: 'Mais controle e clareza para decisões, comunicação e rotina.',
      },
    ],
  },
  professional: {
    badge: 'Plano mais escolhido',
    title: 'Plano Professional — Aplicação profissional',
    subtitle:
      'Plano ideal para uso individual com aplicação profissional, relatórios e 10 créditos mensais.',
    price: 'R$ 199,90',
    billing: 'mensal',
    summary:
      'Aplicação profissional com relatórios premium e créditos mensais para operação recorrente.',
    features: [
      {
        title: 'Inclui 10 créditos por mês',
        description: 'Operação recorrente com volume ideal para consultores e profissionais.',
      },
      {
        title: 'Relatórios profissionais',
        description: 'Entregáveis premium (tela + PDF) para uso com clientes e atendimentos.',
      },
      {
        title: 'Aplicação em clientes e atendimentos',
        description: 'Leitura estruturada para devolutiva e tomada de decisão.',
      },
      {
        title: 'Uso estratégico do DISC',
        description: 'Estrutura e consistência para uso profissional recorrente.',
      },
      {
        title: 'White Label opcional',
        description: 'Adicione sua marca nos relatórios como add-on (pagamento único).',
      },
    ],
  },
  business: {
    badge: 'Para equipes e RH',
    title: 'Plano Business — Uso empresarial',
    subtitle:
      'Plano voltado para empresas e profissionais que atuam com equipes, clientes e contexto corporativo.',
    price: 'R$ 399,90',
    billing: 'mensal',
    summary:
      'Operação empresarial com créditos mensais, visão de equipe e recursos para RH.',
    features: [
      {
        title: 'Inclui 25 créditos por mês',
        description: 'Escala para operar com equipes, clientes e contexto corporativo.',
      },
      {
        title: 'Gestão de múltiplos usuários',
        description: 'Estrutura escalável para operação empresarial.',
      },
      {
        title: 'Aplicação em equipes e RH',
        description: 'Leitura organizacional e suporte a decisões de pessoas.',
      },
      {
        title: 'Análises organizacionais',
        description: 'Base para decisões mais seguras em cultura, liderança e performance.',
      },
      {
        title: 'White Label opcional',
        description: 'Adicione sua marca nos relatórios como add-on (pagamento único).',
      },
    ],
  },
  business_corporation: {
    badge: 'Corporativo',
    title: 'Business Corporation — Estrutura corporativa completa',
    subtitle:
      'Solução corporativa com uso ilimitado, recursos avançados e White Label incluso.',
    price: 'R$ 999,90',
    billing: 'mensal • uso ilimitado',
    summary:
      'Camada corporativa para operar em escala com uso ilimitado (uso justo) e identidade de marca inclusa.',
    features: [
      {
        title: 'Uso ilimitado',
        description: 'Operação em larga escala sob política de uso justo.',
      },
      {
        title: 'Operação em larga escala',
        description: 'Estrutura para múltiplas áreas, públicos e decisões recorrentes.',
      },
      {
        title: 'Gestão completa de usuários',
        description: 'Base para RH estruturado e governança progressiva.',
      },
      {
        title: 'White Label incluso',
        description: 'Marca aplicada no relatório e entregáveis premium para comunicação institucional.',
      },
      {
        title: 'Ideal para empresas estruturadas',
        description: 'Foco em equilíbrio organizacional, cultura e contratações futuras.',
      },
    ],
  },
  diamond_consulting: {
    badge: 'Premium estratégico',
    title: 'Diamond Consulting — Nível estratégico premium',
    subtitle:
      'Solução premium com acompanhamento estratégico por psicanalista, leitura comportamental aprofundada e estrutura avançada para operação consultiva.',
    price: 'R$ 9.990,00',
    billing: 'mensal',
    summary: 'Camada premium com acompanhamento especializado, devolutiva executiva e white label incluso.',
    features: [
      {
        title: 'Acompanhamento estratégico com psicanalista',
        description: 'Leitura clínica e organizacional aplicada à realidade da empresa.',
      },
      {
        title: 'Diagnóstico comportamental aprofundado',
        description: 'Interpretação técnica do perfil DISC com mais profundidade e contexto.',
      },
      {
        title: 'Devolutiva estratégica para a empresa',
        description: 'Direcionamento para liderança, cultura, conflitos e decisões de pessoas.',
      },
      {
        title: 'Aplicação em nível executivo',
        description: 'Uso em decisões críticas de gestão e posicionamento organizacional.',
      },
      {
        title: 'Estrutura para alta performance organizacional',
        description: 'Operação consultiva premium com entregas estruturadas e acompanhamento contínuo.',
      },
      {
        title: 'White Label incluso',
        description: 'Identidade premium nos relatórios (capa/rodapé) e entregáveis executivos.',
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
  if (normalizedSlug === 'disc' || normalizedSlug === 'disc_individual' || normalizedSlug === 'disc-individual') {
    return 'disc_individual';
  }
  if (normalizedSlug === 'insider') {
    return 'insider';
  }
  if (normalizedSlug === 'professional' || normalizedSlug === 'profissional' || normalizedSlug === 'pro') {
    return 'professional';
  }
  if (normalizedSlug === 'business') return 'business';
  if (normalizedSlug === 'business-corporation' || normalizedSlug === 'business_corporation') return 'business_corporation';
  if (normalizedSlug === 'diamond-consulting' || normalizedSlug === 'diamond_consulting' || normalizedSlug === 'diamond') {
    return 'diamond_consulting';
  }
  if (normalizedSlug === 'personal') return 'personal';

  const normalizedPlanKey = String(fallbackPlanKey || '').trim().toLowerCase();
  if (normalizedPlanKey === 'disc' || normalizedPlanKey === 'disc_individual' || normalizedPlanKey === 'disc-individual') {
    return 'disc_individual';
  }
  if (normalizedPlanKey === 'insider') return 'insider';
  if (normalizedPlanKey === 'profissional') return 'professional';
  if (normalizedPlanKey === 'professional') return 'professional';
  if (normalizedPlanKey === 'business') return 'business';
  if (normalizedPlanKey === 'business_corporation' || normalizedPlanKey === 'business-corporation') return 'business_corporation';
  if (normalizedPlanKey === 'diamond_consulting' || normalizedPlanKey === 'diamond-consulting' || normalizedPlanKey === 'diamond') {
    return 'diamond_consulting';
  }
  return 'personal';
}

export default function CheckoutPlanPage() {
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
  const [orderBumpEnabled, setOrderBumpEnabled] = useState(false);
  const [whiteLabelAddonEnabled, setWhiteLabelAddonEnabled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [checkoutBlocked, setCheckoutBlocked] = useState(false);
  const [previewState, setPreviewState] = useState(() => getCheckoutPreviewState());

  const previewRequired =
    checkoutPlanKey === 'disc_individual' && requiresCheckoutPreview(access);
  const canProceedToPayment = !previewRequired || previewState.hasPreview;
  const canOfferAiOrderBump =
    checkoutPlanKey !== 'professional' &&
    checkoutPlanKey !== 'business' &&
    checkoutPlanKey !== 'business_corporation' &&
    checkoutPlanKey !== 'diamond_consulting';
  const canOfferWhiteLabelAddon =
    checkoutPlanKey === 'professional' || checkoutPlanKey === 'business';
  const planPriceBrl = PLAN_PRICE_BY_KEY_BRL[checkoutPlanKey] ?? null;
  const oneTimeAddOnsTotal =
    (canOfferAiOrderBump && orderBumpEnabled ? ORDER_BUMP_PRICE_BRL : 0) +
    (canOfferWhiteLabelAddon && whiteLabelAddonEnabled ? WHITE_LABEL_ADDON_PRICE_BRL : 0);
  const totalTodayBrl = planPriceBrl != null ? planPriceBrl + oneTimeAddOnsTotal : null;
  const planIncludesWhiteLabel =
    (checkoutPlanKey === 'business_corporation' || checkoutPlanKey === 'diamond_consulting');
  const isOneTimeCheckout = checkoutPlanKey === 'disc_individual';

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
    if (!canOfferWhiteLabelAddon) {
      setWhiteLabelAddonEnabled(false);
    }
  }, [canOfferWhiteLabelAddon]);

  useEffect(() => {
    if (!canOfferAiOrderBump) {
      setOrderBumpEnabled(false);
    }
  }, [canOfferAiOrderBump]);

  useEffect(() => {
    setSelectedMethod(isOneTimeCheckout ? 'pix' : 'card');
  }, [checkoutPlanKey, isOneTimeCheckout]);

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
    if (!canProceedToPayment) {
      setFeedback('Antes de pagar, veja um preview do relatório para liberar o checkout.');
      return;
    }

    setIsSubmitting(true);
    setFeedback('');
    setCheckoutBlocked(false);

    trackEvent('checkout_public_finalize_click', {
      planKey: checkoutPlanKey,
      paymentMethod: selectedMethod,
      orderBumpEnabled: canOfferAiOrderBump ? orderBumpEnabled : false,
      whiteLabelAddon: whiteLabelAddonEnabled,
      path: location.pathname,
    });

    try {
      persistCheckoutIntent({
        planKey: checkoutPlanKey,
        planTitle: planUi.title,
        billing: isOneTimeCheckout ? 'one_time' : 'monthly',
        mode: isOneTimeCheckout ? 'payment' : 'subscription',
        planPriceBrl,
        orderBumpAdvancedAnalysis: canOfferAiOrderBump ? orderBumpEnabled : false,
        whiteLabelAddon: canOfferWhiteLabelAddon ? whiteLabelAddonEnabled : false,
        oneTimeAddOnsTotalBrl: oneTimeAddOnsTotal,
        totalTodayBrl,
      });

      const checkoutPayload = isOneTimeCheckout
        ? {
            productType: 'single_assessment',
            mode: 'payment',
            billing: 'one_time',
            provider: 'STRIPE',
            paymentMethod: selectedMethod,
            orderBumpAdvancedAnalysis: canOfferAiOrderBump ? orderBumpEnabled : false,
          }
        : {
            plan: checkoutPlanKey,
            billing: 'monthly',
            provider: 'STRIPE',
            paymentMethod: 'card',
            orderBumpAdvancedAnalysis: canOfferAiOrderBump ? orderBumpEnabled : false,
            whiteLabelAddon: canOfferWhiteLabelAddon ? whiteLabelAddonEnabled : false,
          };

      const hasAuthSession = Boolean(getApiToken()) || Boolean(getApiUserEmail());
      const shouldUsePublicCheckout = !hasAuthSession;
      const checkoutEndpoint = shouldUsePublicCheckout
        ? '/payments/create-checkout-public'
        : '/payments/create-checkout';

      const response = await apiRequest(checkoutEndpoint, {
        method: 'POST',
        requireAuth: !shouldUsePublicCheckout,
        body: checkoutPayload,
      });

      const checkoutUrl = String(response?.checkoutUrl || response?.url || '').trim();
      if (!checkoutUrl) {
        throw new Error('CHECKOUT_URL_NOT_FOUND');
      }

      window.location.assign(checkoutUrl);
    } catch (error) {
      const code = String(error?.code || error?.payload?.error || error?.message || '')
        .trim()
        .toUpperCase();
      if (code === 'BILLING_PRICE_NOT_CONFIGURED' || code === 'STRIPE_NOT_CONFIGURED') {
        setCheckoutBlocked(true);
        setFeedback(
          'Este plano está em implantação de cobrança neste ambiente. Fale com nosso time para liberar o checkout.',
        );
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
            <p>Escolha confirmada. Revise os detalhes e siga para o checkout seguro.</p>
          </div>
          <div className="nav-pill">🔒 Checkout seguro com Stripe</div>
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

                {planIncludesWhiteLabel ? (
                  <div className="cta-row" style={{ justifyContent: 'flex-start', marginTop: 10 }}>
                    <span className="badge light" style={{ width: 'auto' }}>
                      {WHITE_LABEL_INCLUDED_BADGE}
                    </span>
                  </div>
                ) : null}

              {canOfferAiOrderBump ? (
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
              ) : null}

              {canOfferWhiteLabelAddon ? (
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={whiteLabelAddonEnabled}
                    onChange={(event) => setWhiteLabelAddonEnabled(event.target.checked)}
                    disabled={isSubmitting}
                  />
                  <div>
                    <strong>Adicionar White Label à sua compra</strong>
                    <div className="fine">
                      Personalize a plataforma com sua marca, identidade visual e apresentação profissional. Ideal para quem atende clientes e deseja transmitir autoridade.
                      <br />
                      <br />
                      <strong>Destaques</strong>
                      <br />
                      - Sua logo e identidade visual
                      <br />
                      - Plataforma com sua marca
                      <br />
                      - Relatórios personalizados
                      <br />
                      <br />
                      <strong>Pagamento único de R$ 299,00</strong>
                      <br />
                      Cobrado apenas uma vez. Disponível para os planos Professional e Business.
                    </div>
                  </div>
                </label>
              ) : null}

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
                <div className="label">Total hoje</div>
                <div style={{ marginTop: 10, fontSize: 22, fontWeight: 800 }}>
                  {totalTodayBrl != null ? formatPriceBRL(totalTodayBrl) : planUi.price}
                </div>
                <div className="fine" style={{ marginTop: 6 }}>
                  {isOneTimeCheckout
                    ? 'Pagamento único + add-ons (quando selecionados).'
                    : '1ª mensalidade + add-ons de pagamento único (quando selecionados).'}
                </div>

                <div className="kpis" style={{ marginTop: 14 }}>
                  <div className="kpi">
                    <strong>{isOneTimeCheckout ? 'Pagamento único' : 'Assinatura mensal'}</strong>
                    <span className="fine">
                      {planPriceBrl != null
                        ? isOneTimeCheckout
                          ? formatPriceBRL(planPriceBrl)
                          : `${formatPriceBRL(planPriceBrl)}/mês`
                        : planUi.billing}
                    </span>
                  </div>
                  <div className="kpi">
                    <strong>Add-ons</strong>
                    <span className="fine">{oneTimeAddOnsTotal > 0 ? formatPriceBRL(oneTimeAddOnsTotal) : '—'}</span>
                  </div>
                </div>

                <div className="fine" style={{ marginTop: 10 }}>
                  {isOneTimeCheckout
                    ? 'Sem cobranças futuras.'
                    : `Próximas cobranças: ${planPriceBrl != null ? `${formatPriceBRL(planPriceBrl)}/mês` : planUi.price}.`}
                </div>
              </div>

              <div className="sidebar-section">
                <div className="label">Método de pagamento</div>
                <div className="method-grid">
                  {PAYMENT_OPTIONS.map((method) => {
                    const selected = method.key === selectedMethod;
                    const disabled = !isOneTimeCheckout && method.key === 'pix';
                    return (
                      <button
                        key={method.key}
                        type="button"
                        className={`method ${selected ? 'selected' : ''}`}
                        onClick={() => setSelectedMethod(method.key)}
                        disabled={isSubmitting || disabled}
                      >
                        <div>
                          <strong>{method.title}</strong>
                          <div className="fine">
                            {method.key === 'pix'
                              ? disabled
                                ? 'Assinaturas são cobradas no cartão.'
                                : method.copy
                              : method.copy}
                          </div>
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
                  disabled={isSubmitting || checkoutBlocked || !canProceedToPayment}
                  aria-busy={isSubmitting ? 'true' : 'false'}
                >
                  Finalizar pagamento
                </button>

                {feedback ? <div className="checkout-feedback-error">{feedback}</div> : null}
                {checkoutBlocked ? (
                  <div className="cta-row" style={{ marginTop: 12 }}>
                    <Link
                      className="btn secondary"
                      style={{ width: 'auto', padding: '10px 14px' }}
                      to="/empresa"
                    >
                      Falar com Vendas
                    </Link>
                  </div>
                ) : null}

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
