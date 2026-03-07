import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Gift,
  HeartHandshake,
  MessageSquareText,
  Shield,
  Sparkles,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import {
  createGiftToken,
  findGiftOrder,
  normalizeGiftPayload,
  saveGiftOrder,
} from '@/modules/billing/gift-utils';

const SALES_WHATSAPP_URL =
  'https://wa.me/5562994090276?text=Olá%20quero%20conhecer%20os%20planos%20Business%20do%20InsightDISC';

const DEFAULT_GIFT_MESSAGE =
  'Quero te presentear com uma avaliação DISC do InsightDISC para apoiar seu autoconhecimento e desenvolvimento profissional.';

const SOCIAL_OFFERS = Object.freeze([
  {
    id: 'free',
    title: 'Teste Grátis',
    price: 'R$ 0',
    subtitle: 'Entrada rápida para conhecer seu perfil',
    badge: 'LIMITADO',
    cta: 'Fazer Teste Grátis',
    ctaHref: createPageUrl('StartFree'),
    features: [
      'Resultado imediato com perfil dominante',
      'Versão reduzida do diagnóstico comportamental',
      'Ideal para experimentar o método DISC',
    ],
  },
  {
    id: 'single',
    title: '1 Avaliação Avulsa',
    price: 'R$ 79',
    subtitle: 'Relatório completo individual',
    cta: 'Comprar 1 Avaliação',
    features: [
      'Relatório premium completo em PDF',
      'Gráficos naturais e adaptados',
      'Leitura detalhada de perfil e desenvolvimento',
      'Acesso ao resultado completo',
    ],
  },
  {
    id: 'gift',
    title: 'Presentear alguém',
    price: 'R$ 79',
    subtitle: 'Compre 1 avaliação para outra pessoa',
    cta: 'Presentear alguém',
    features: [
      'Mensagem personalizada de presente',
      'Link exclusivo /gift/:token',
      'Experiência emocional e profissional',
    ],
  },
]);

const CREDIT_PACKS = Object.freeze([
  {
    id: 'credits_10',
    name: '10 avaliações',
    credits: 10,
    price: 'R$ 290',
    perUnit: 'R$ 29 por avaliação',
    highlight: 'Ideal para squads pequenos e consultorias.',
    cta: 'Comprar 10 Avaliações',
  },
  {
    id: 'credits_50',
    name: '50 avaliações',
    credits: 50,
    price: 'R$ 1.190',
    perUnit: 'R$ 23,80 por avaliação',
    highlight: 'Melhor equilíbrio para operação recorrente.',
    cta: 'Comprar 50 Avaliações',
    popular: true,
  },
  {
    id: 'credits_100',
    name: '100 avaliações',
    credits: 100,
    price: 'R$ 1.990',
    perUnit: 'R$ 19,90 por avaliação',
    highlight: 'Escala com maior eficiência de custo.',
    cta: 'Comprar 100 Avaliações',
  },
]);

const BUSINESS_PLANS = Object.freeze([
  {
    id: 'business_monthly',
    name: 'Plano Business Mensal',
    price: 'R$ 199/mês',
    audience: 'Profissionais e equipes em operação contínua',
    cta: 'Assinar Plano Business',
    ctaKind: 'checkout',
    features: [
      'Inclui 5 avaliações por mês',
      'Painel SaaS completo para gestão de avaliações',
      'Histórico de candidatos e relatórios premium',
      'Avaliações extras via pacotes de créditos',
      'Job Matching e visão de pipeline',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Sob consulta',
    audience: 'Operação corporativa com múltiplas áreas',
    cta: 'Falar com Vendas',
    ctaKind: 'sales',
    features: [
      'White-label corporativo completo',
      'Gestão de equipes e permissões avançadas',
      'Analytics executivo e indicadores por unidade',
      'API e integrações sob demanda',
      'Suporte estratégico dedicado',
    ],
  },
]);

const SOCIAL_COMPARISON = Object.freeze([
  {
    feature: 'Resultado imediato',
    free: 'Sim',
    single: 'Sim',
    gift: 'Sim (quando o presente é ativado)',
  },
  {
    feature: 'Perfil dominante',
    free: 'Sim',
    single: 'Sim',
    gift: 'Sim',
  },
  {
    feature: 'Relatório completo',
    free: 'Não',
    single: 'Sim',
    gift: 'Sim',
  },
  {
    feature: 'PDF premium',
    free: 'Não',
    single: 'Sim',
    gift: 'Sim',
  },
  {
    feature: 'Gráficos completos D/I/S/C',
    free: 'Parcial',
    single: 'Completo',
    gift: 'Completo',
  },
  {
    feature: 'Acesso vitalício ao resultado',
    free: 'Não',
    single: 'Sim',
    gift: 'Sim',
  },
  {
    feature: 'Possibilidade de compartilhar',
    free: 'Limitado',
    single: 'Sim',
    gift: 'Sim',
  },
  {
    feature: 'Experiência presenteável',
    free: 'Não',
    single: 'Opcional',
    gift: 'Sim',
  },
]);

const BUSINESS_COMPARISON = Object.freeze([
  {
    feature: 'Quantidade incluída',
    credits10: '10 avaliações',
    credits50: '50 avaliações',
    credits100: '100 avaliações',
    business: '5 avaliações/mês',
    enterprise: 'Sob desenho',
  },
  {
    feature: 'Validade',
    credits10: '12 meses',
    credits50: '12 meses',
    credits100: '12 meses',
    business: 'Ciclo mensal',
    enterprise: 'Contrato corporativo',
  },
  {
    feature: 'Painel SaaS',
    credits10: 'Sim',
    credits50: 'Sim',
    credits100: 'Sim',
    business: 'Sim',
    enterprise: 'Sim avançado',
  },
  {
    feature: 'Relatórios PDF premium',
    credits10: 'Sim',
    credits50: 'Sim',
    credits100: 'Sim',
    business: 'Sim',
    enterprise: 'Sim + customização',
  },
  {
    feature: 'Job Matching',
    credits10: 'Básico',
    credits50: 'Completo',
    credits100: 'Completo',
    business: 'Completo',
    enterprise: 'Completo + governança',
  },
  {
    feature: 'Histórico de candidatos',
    credits10: 'Sim',
    credits50: 'Sim',
    credits100: 'Sim',
    business: 'Sim',
    enterprise: 'Sim',
  },
  {
    feature: 'White-label',
    credits10: 'Não',
    credits50: 'Opcional',
    credits100: 'Opcional',
    business: 'Opcional',
    enterprise: 'Completo',
  },
  {
    feature: 'Equipe e permissões',
    credits10: 'Básico',
    credits50: 'Básico',
    credits100: 'Básico',
    business: 'Intermediário',
    enterprise: 'Avançado',
  },
  {
    feature: 'Analytics',
    credits10: 'Essencial',
    credits50: 'Intermediário',
    credits100: 'Intermediário',
    business: 'Gerencial',
    enterprise: 'Executivo',
  },
  {
    feature: 'Suporte',
    credits10: 'Padrão',
    credits50: 'Prioritário',
    credits100: 'Prioritário',
    business: 'Prioritário',
    enterprise: 'Dedicado',
  },
  {
    feature: 'API',
    credits10: 'Não',
    credits50: 'Não',
    credits100: 'Não',
    business: 'Não',
    enterprise: 'Sim',
  },
  {
    feature: 'Uso corporativo avançado',
    credits10: 'Limitado',
    credits50: 'Moderado',
    credits100: 'Moderado',
    business: 'Alto',
    enterprise: 'Total',
  },
]);

const FAQ_ITEMS = Object.freeze([
  {
    q: 'Qual a diferença entre crédito avulso e assinatura Business?',
    a: 'Crédito avulso é compra pontual de avaliações com validade. Assinatura Business é mensal, inclui avaliações recorrentes e acesso contínuo ao painel.',
  },
  {
    q: 'O teste grátis já entrega o relatório completo?',
    a: 'Não. O teste grátis é limitado e mostra uma versão reduzida. O relatório premium completo fica disponível nos produtos pagos.',
  },
  {
    q: 'Posso comprar avaliações extras além do plano mensal?',
    a: 'Sim. Mesmo com assinatura ativa, você pode complementar com pacotes de créditos quando precisar de volume adicional.',
  },
  {
    q: 'Como funciona o presente?',
    a: 'Você preenche os dados de quem envia e de quem recebe, conclui a compra e recebe um link personalizado para enviar.',
  },
]);

function ComparisonCell({ value }) {
  const positive = ['sim', 'completo', 'alto', 'total'];
  const lowered = String(value || '').toLowerCase();
  const isPositive = positive.some((token) => lowered.includes(token));
  return (
    <td className="px-3 py-3 text-sm text-slate-700 align-top">
      <span
        className={
          isPositive
            ? 'inline-flex rounded-full bg-emerald-50 text-emerald-700 px-2 py-1 text-xs font-semibold'
            : 'inline-flex rounded-full bg-slate-100 text-slate-600 px-2 py-1 text-xs font-semibold'
        }
      >
        {value}
      </span>
    </td>
  );
}

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: authUser } = useAuth();
  const apiBaseUrl = getApiBaseUrl();

  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [creditLoading, setCreditLoading] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  const [giftForm, setGiftForm] = useState({
    senderName: '',
    senderEmail: '',
    recipientName: '',
    recipientEmail: '',
    message: '',
    useDefaultMessage: true,
  });
  const [giftError, setGiftError] = useState('');

  const assessmentId = searchParams.get('assessmentId') || '';
  const leadEmail = searchParams.get('email') || '';
  const leadName = searchParams.get('name') || '';
  const candidateToken = searchParams.get('token') || '';
  const checkoutFlow = searchParams.get('flow') || (assessmentId ? 'candidate' : '');
  const unlockRequired = searchParams.get('unlock') === '1';

  const isCandidateUnlock = useMemo(
    () => Boolean(assessmentId || candidateToken || checkoutFlow === 'candidate'),
    [assessmentId, candidateToken, checkoutFlow]
  );

  useEffect(() => {
    const loadData = async () => {
      try {
        if (apiBaseUrl && authUser) {
          setUser(authUser);
          setWorkspace({
            id: authUser?.active_workspace_id || authUser?.tenant_id || '',
            credits_balance: Number(authUser?.credits || 0),
          });
          return;
        }

        const authenticatedUser = await base44.auth.me();
        setUser(authenticatedUser);
        if (authenticatedUser?.active_workspace_id) {
          const workspaceResult = await base44.entities.Workspace.filter({
            id: authenticatedUser.active_workspace_id,
          });
          if (workspaceResult.length) {
            setWorkspace(workspaceResult[0]);
          }
        }
      } catch {
        setUser(null);
      }
    };

    loadData();
  }, [apiBaseUrl, authUser]);

  const goToLogin = () => {
    const next = `${createPageUrl('Pricing')}${window.location.search || ''}`;
    navigate(`${createPageUrl('Login')}?next=${encodeURIComponent(next)}`);
  };

  const openSales = () => {
    window.open(SALES_WHATSAPP_URL, '_blank', 'noopener,noreferrer');
  };

  const handleCreditPackPurchase = async (pack) => {
    if (!user) {
      goToLogin();
      return;
    }

    if (apiBaseUrl) {
      const token = getApiToken();
      if (!token) {
        goToLogin();
        return;
      }

      setCreditLoading(pack.id);
      setCheckoutError('');
      setSuccessMessage('');

      try {
        const response = await apiRequest('/payments/create-checkout', {
          method: 'POST',
          requireAuth: true,
          body: {
            credits: pack.credits,
            successUrl: `${window.location.origin}${createPageUrl('CheckoutSuccess')}`,
            cancelUrl: `${window.location.origin}${createPageUrl('Pricing')}#b2b`,
          },
        });

        if (!response?.url) {
          throw new Error('Falha ao iniciar checkout de créditos.');
        }

        window.location.href = response.url;
      } catch (error) {
        setCheckoutError(error?.message || 'Não foi possível iniciar a compra de créditos.');
      } finally {
        setCreditLoading('');
      }
      return;
    }

    setCreditLoading(pack.id);
    setCheckoutError('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 1400));
      if (workspace?.id) {
        const currentBalance = Number(workspace?.credits_balance || 0);
        const nextBalance = currentBalance + pack.credits;

        await base44.entities.Transaction.create({
          user_id: user.id,
          workspace_id: workspace.id,
          type: 'credit_pack',
          product: pack.id,
          amount: Number(pack.price.replace(/\D/g, '')),
          currency: 'BRL',
          status: 'completed',
          payment_method: 'credit_card',
          credits_added: pack.credits,
          metadata: { pack_name: pack.name },
        });

        await base44.entities.Workspace.update(workspace.id, {
          credits_balance: nextBalance,
        });

        setWorkspace((prev) => ({ ...prev, credits_balance: nextBalance }));
      }

      setSuccessMessage(`${pack.credits} créditos adicionados com sucesso.`);
    } catch (error) {
      setCheckoutError(error?.message || 'Não foi possível concluir a compra.');
    } finally {
      setCreditLoading('');
    }
  };

  const handleWebCheckout = async ({
    priceEnvKey,
    mode = 'payment',
    flowOverride = '',
    successParams = {},
    cancelHash = '',
    emailOverride = '',
    nameOverride = '',
  }) => {
    setCheckoutError('');
    setSuccessMessage('');
    setCheckoutLoading(priceEnvKey || 'checkout');

    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 12000);

      const successUrl = new URL(`${window.location.origin}${createPageUrl('CheckoutSuccess')}`);
      Object.entries(successParams || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          successUrl.searchParams.set(key, String(value));
        }
      });

      const cancelUrl = new URL(`${window.location.origin}${createPageUrl('Pricing')}`);
      if (cancelHash) {
        cancelUrl.hash = cancelHash;
      }

      const payload = {
        mode,
        priceEnvKey,
        email: emailOverride || leadEmail || user?.email || '',
        name: nameOverride || leadName || user?.full_name || '',
        assessmentId: assessmentId || undefined,
        token: candidateToken || undefined,
        flow: flowOverride || checkoutFlow || undefined,
        successUrl: successUrl.toString(),
        cancelUrl: cancelUrl.toString(),
      };

      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || 'Falha ao criar sessão de checkout.');
      }

      window.location.href = data.url;
    } catch (error) {
      if (base44?.__isMock && assessmentId) {
        const fallback = new URL(`${window.location.origin}${createPageUrl('CheckoutSuccess')}`);
        fallback.searchParams.set('session_id', `mock_${Date.now()}`);
        fallback.searchParams.set('assessmentId', assessmentId);
        if (candidateToken) fallback.searchParams.set('token', candidateToken);
        if (checkoutFlow) fallback.searchParams.set('flow', checkoutFlow);
        if (leadEmail) fallback.searchParams.set('email', leadEmail);
        if (leadName) fallback.searchParams.set('name', leadName);
        window.location.href = fallback.toString();
        return;
      }

      setCheckoutError(
        error?.name === 'AbortError'
          ? 'O checkout demorou para responder. Tente novamente em instantes.'
          : error?.message || 'Não foi possível iniciar o checkout.'
      );
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setCheckoutLoading('');
    }
  };

  const handleBuySingleAssessment = () => {
    handleWebCheckout({
      priceEnvKey: 'STRIPE_PRICE_PRO',
      mode: 'payment',
      flowOverride: checkoutFlow || (isCandidateUnlock ? 'candidate' : ''),
      successParams: isCandidateUnlock
        ? {
            assessmentId,
            token: candidateToken,
            flow: checkoutFlow || 'candidate',
          }
        : {},
      cancelHash: 'social',
    });
  };

  const handleGiftPurchase = async () => {
    const normalizedGift = normalizeGiftPayload({
      senderName: giftForm.senderName,
      senderEmail: giftForm.senderEmail,
      recipientName: giftForm.recipientName,
      recipientEmail: giftForm.recipientEmail,
      message: giftForm.useDefaultMessage ? DEFAULT_GIFT_MESSAGE : giftForm.message,
    });

    if (!normalizedGift.senderName) {
      setGiftError('Informe o nome de quem está enviando o presente.');
      return;
    }

    if (!normalizedGift.recipientName && !normalizedGift.recipientEmail) {
      setGiftError('Informe o nome ou e-mail de quem vai receber o presente.');
      return;
    }

    const giftToken = createGiftToken();
    saveGiftOrder({
      token: giftToken,
      payload: normalizedGift,
      status: 'pending',
    });

    const preview = findGiftOrder(giftToken);
    const giftPayload = preview?.payload || normalizedGift;

    setGiftError('');

    await handleWebCheckout({
      priceEnvKey: 'STRIPE_PRICE_PRO',
      mode: 'payment',
      flowOverride: 'gift',
      successParams: {
        flow: 'gift',
        giftToken,
        from: giftPayload.senderName,
        senderEmail: giftPayload.senderEmail,
        to: giftPayload.recipientName,
        recipientEmail: giftPayload.recipientEmail,
        msg: giftPayload.message,
      },
      cancelHash: 'social',
      emailOverride: giftPayload.senderEmail || leadEmail || user?.email || '',
      nameOverride: giftPayload.senderName || leadName || user?.full_name || '',
    });
  };

  const setGiftField = (field, value) => {
    setGiftForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const activeBalance = Number(workspace?.credits_balance || 0);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.13),transparent_34%),radial-gradient(circle_at_10%_18%,rgba(14,165,233,0.14),transparent_32%),#f8fafc]">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to={user ? createPageUrl('Dashboard') : createPageUrl('Home')}>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900">Preços InsightDISC</h1>
              <p className="text-sm text-slate-600">
                Estrutura comercial clara para Social / Individual e Business / Empresas
              </p>
            </div>
          </div>

          {user ? (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
              Saldo atual: <strong>{activeBalance} créditos</strong>
            </div>
          ) : null}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        {unlockRequired ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Seu acesso ainda está bloqueado. Escolha uma opção de compra para desbloquear o painel completo.
          </div>
        ) : null}

        {checkoutError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {checkoutError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-indigo-700">
              <Sparkles className="w-3.5 h-3.5" />
              Pricing estruturado por jornada
            </p>
            <h2 className="mt-4 text-3xl md:text-4xl font-black text-slate-900 leading-tight">
              Escolha a trilha certa para você: <span className="text-indigo-600">Social / Individual</span> ou <span className="text-violet-600">Business / Empresas</span>
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Aqui você encontra exatamente o que cada oferta entrega: o que é gratuito, o que é avulso, o que é presenteável,
              o que é pacote de avaliações e o que é assinatura mensal SaaS.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#social">
              <Button className="h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-6">
                Social / Individual
              </Button>
            </a>
            <a href="#b2b">
              <Button variant="outline" className="h-12 rounded-2xl px-6 border-slate-300">
                Business / Empresas
              </Button>
            </a>
          </div>

          <div className="mt-7 grid md:grid-cols-3 gap-4">
            {[
              'Sem ambiguidade entre assinatura e créditos',
              'Diferença clara entre uso individual e corporativo',
              'Funil preparado para conversão e expansão',
            ].map((item) => (
              <div key={item} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </section>

        <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 border border-blue-100">
          <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Pagamentos processados em gateway seguro (PCI-DSS). O InsightDISC não armazena dados sensíveis de cartão.
          </p>
        </div>

        <section id="social" className="scroll-mt-28 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-indigo-600 font-semibold">Social / Individual</p>
              <h3 className="text-3xl font-black text-slate-900">Para quem quer se conhecer, evoluir ou presentear alguém</h3>
              <p className="text-slate-600 mt-2 max-w-3xl">
                Ofertas diretas para pessoa física: teste grátis limitado, compra avulsa de 1 avaliação e fluxo dedicado de presente com link personalizado.
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <Card className="border-2 border-slate-200">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">{SOCIAL_OFFERS[0].title}</h4>
                    <p className="text-sm text-slate-600">{SOCIAL_OFFERS[0].subtitle}</p>
                  </div>
                  <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-bold">
                    {SOCIAL_OFFERS[0].badge}
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-black text-slate-900">{SOCIAL_OFFERS[0].price}</span>
                </div>
                <ul className="space-y-2 text-sm text-slate-700">
                  {SOCIAL_OFFERS[0].features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link to={SOCIAL_OFFERS[0].ctaHref}>
                  <Button className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-950">
                    {SOCIAL_OFFERS[0].cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-2 border-indigo-200 shadow-[0_16px_36px_rgba(79,70,229,0.12)]">
              <CardContent className="p-6 space-y-4">
                <div>
                  <h4 className="text-xl font-bold text-slate-900">{SOCIAL_OFFERS[1].title}</h4>
                  <p className="text-sm text-slate-600">{SOCIAL_OFFERS[1].subtitle}</p>
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-slate-900">{SOCIAL_OFFERS[1].price}</span>
                  <span className="text-sm text-slate-500 pb-1">pagamento único</span>
                </div>
                {isCandidateUnlock ? (
                  <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-700">
                    Você veio de um resultado gratuito. Esta compra libera o relatório completo desta avaliação.
                  </div>
                ) : null}
                <ul className="space-y-2 text-sm text-slate-700">
                  {SOCIAL_OFFERS[1].features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={handleBuySingleAssessment}
                  disabled={Boolean(checkoutLoading)}
                  className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700"
                >
                  {checkoutLoading === 'STRIPE_PRICE_PRO' ? 'Abrindo checkout...' : 'Comprar 1 Avaliação'}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-violet-200">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">{SOCIAL_OFFERS[2].title}</h4>
                    <p className="text-sm text-slate-600">{SOCIAL_OFFERS[2].subtitle}</p>
                  </div>
                  <Gift className="w-5 h-5 text-violet-600" />
                </div>

                <div className="flex items-end gap-2">
                  <span className="text-3xl font-black text-slate-900">{SOCIAL_OFFERS[2].price}</span>
                  <span className="text-sm text-slate-500 pb-1">por presente</span>
                </div>

                <ul className="space-y-2 text-sm text-slate-700">
                  {SOCIAL_OFFERS[2].features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="grid gap-3">
                  <input
                    value={giftForm.senderName}
                    onChange={(event) => setGiftField('senderName', event.target.value)}
                    placeholder="Nome de quem envia"
                    className="h-11 rounded-xl border border-slate-300 px-3 text-sm"
                  />
                  <input
                    value={giftForm.senderEmail}
                    onChange={(event) => setGiftField('senderEmail', event.target.value)}
                    placeholder="E-mail de quem envia (opcional)"
                    className="h-11 rounded-xl border border-slate-300 px-3 text-sm"
                  />
                  <input
                    value={giftForm.recipientName}
                    onChange={(event) => setGiftField('recipientName', event.target.value)}
                    placeholder="Nome de quem recebe"
                    className="h-11 rounded-xl border border-slate-300 px-3 text-sm"
                  />
                  <input
                    value={giftForm.recipientEmail}
                    onChange={(event) => setGiftField('recipientEmail', event.target.value)}
                    placeholder="E-mail de quem recebe (opcional)"
                    className="h-11 rounded-xl border border-slate-300 px-3 text-sm"
                  />

                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={giftForm.useDefaultMessage}
                      onChange={(event) => setGiftField('useDefaultMessage', event.target.checked)}
                    />
                    Usar mensagem pronta do InsightDISC
                  </label>

                  <textarea
                    value={giftForm.useDefaultMessage ? DEFAULT_GIFT_MESSAGE : giftForm.message}
                    onChange={(event) => setGiftField('message', event.target.value)}
                    disabled={giftForm.useDefaultMessage}
                    placeholder="Mensagem personalizada (opcional)"
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm min-h-24"
                  />
                </div>

                {giftError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">{giftError}</div>
                ) : null}

                <Button
                  onClick={handleGiftPurchase}
                  disabled={Boolean(checkoutLoading)}
                  className="w-full h-12 rounded-2xl bg-violet-600 hover:bg-violet-700"
                >
                  {checkoutLoading === 'STRIPE_PRICE_PRO' ? 'Abrindo checkout...' : 'Presentear alguém'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card className="border border-slate-200">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[780px] border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-800">Social / Individual</th>
                    <th className="text-left px-3 py-3 text-sm font-semibold text-slate-700">Grátis</th>
                    <th className="text-left px-3 py-3 text-sm font-semibold text-slate-700">1 Avaliação</th>
                    <th className="text-left px-3 py-3 text-sm font-semibold text-slate-700">Presenteie alguém</th>
                  </tr>
                </thead>
                <tbody>
                  {SOCIAL_COMPARISON.map((row) => (
                    <tr key={row.feature} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.feature}</td>
                      <ComparisonCell value={row.free} />
                      <ComparisonCell value={row.single} />
                      <ComparisonCell value={row.gift} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        <section id="b2b" className="scroll-mt-28 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-violet-700 font-semibold">Business / Empresarial</p>
              <h3 className="text-3xl font-black text-slate-900">Pacotes de avaliações, SaaS mensal e Enterprise</h3>
              <p className="text-slate-600 mt-2 max-w-3xl">
                Diferença clara: pacotes avulsos entregam volume imediato de avaliações; assinatura mensal entrega operação contínua com quantidade incluída;
                Enterprise é desenho personalizado para escala corporativa.
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {CREDIT_PACKS.map((pack) => (
              <motion.div key={pack.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`h-full border-2 ${pack.popular ? 'border-indigo-400 shadow-[0_18px_40px_rgba(79,70,229,0.18)]' : 'border-slate-200'}`}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xl font-bold text-slate-900">{pack.name}</h4>
                        <p className="text-sm text-slate-600">{pack.highlight}</p>
                      </div>
                      {pack.popular ? <Star className="w-5 h-5 text-amber-500 fill-amber-400" /> : null}
                    </div>

                    <div>
                      <div className="text-3xl font-black text-slate-900">{pack.price}</div>
                      <div className="text-sm text-slate-500">{pack.perUnit}</div>
                    </div>

                    <ul className="space-y-2 text-sm text-slate-700">
                      {[
                        `${pack.credits} avaliações incluídas`,
                        'Validade de 12 meses',
                        'Relatórios PDF premium',
                        'Uso em recrutamento e desenvolvimento',
                      ].map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handleCreditPackPurchase(pack)}
                      disabled={creditLoading === pack.id}
                      className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-950"
                    >
                      {creditLoading === pack.id ? 'Processando...' : pack.cta}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {BUSINESS_PLANS.map((plan) => (
              <Card key={plan.id} className="border-2 border-violet-200">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="inline-flex items-center gap-2 text-violet-700 text-xs uppercase tracking-[0.1em] font-semibold">
                        <Building2 className="w-4 h-4" />
                        SaaS / Enterprise
                      </div>
                      <h4 className="text-2xl font-black text-slate-900">{plan.name}</h4>
                      <p className="text-sm text-slate-600">{plan.audience}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-slate-900">{plan.price}</div>
                      {plan.id === 'business_monthly' ? (
                        <div className="text-xs text-slate-500">Inclui 5 avaliações/mês + créditos extras opcionais</div>
                      ) : null}
                    </div>
                  </div>

                  <ul className="space-y-2 text-sm text-slate-700">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.ctaKind === 'checkout' ? (
                    <Button
                      onClick={() =>
                        handleWebCheckout({
                          priceEnvKey: 'STRIPE_PRICE_B2B',
                          mode: 'subscription',
                          flowOverride: 'business_subscription',
                          successParams: { flow: 'business_subscription' },
                          cancelHash: 'b2b',
                        })
                      }
                      disabled={Boolean(checkoutLoading)}
                      className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700"
                    >
                      {checkoutLoading === 'STRIPE_PRICE_B2B' ? 'Abrindo checkout...' : 'Assinar Plano Business'}
                    </Button>
                  ) : (
                    <Button onClick={openSales} className="w-full h-12 rounded-2xl bg-violet-600 hover:bg-violet-700">
                      Falar com Vendas
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border border-slate-200">
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[1120px] border-collapse">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="text-left px-4 py-3 text-sm font-bold text-slate-800">Business / Empresas</th>
                    <th className="text-left px-3 py-3 text-sm font-semibold text-slate-700">10 avaliações</th>
                    <th className="text-left px-3 py-3 text-sm font-semibold text-slate-700">50 avaliações</th>
                    <th className="text-left px-3 py-3 text-sm font-semibold text-slate-700">100 avaliações</th>
                    <th className="text-left px-3 py-3 text-sm font-semibold text-slate-700">Business mensal</th>
                    <th className="text-left px-3 py-3 text-sm font-semibold text-slate-700">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {BUSINESS_COMPARISON.map((row) => (
                    <tr key={row.feature} className="border-t border-slate-200">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{row.feature}</td>
                      <ComparisonCell value={row.credits10} />
                      <ComparisonCell value={row.credits50} />
                      <ComparisonCell value={row.credits100} />
                      <ComparisonCell value={row.business} />
                      <ComparisonCell value={row.enterprise} />
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </section>

        <section className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
          <Card className="border border-slate-200">
            <CardContent className="p-6 space-y-4">
              <h3 className="text-2xl font-black text-slate-900">FAQ rápido</h3>
              <div className="space-y-3">
                {FAQ_ITEMS.map((item) => (
                  <div key={item.q} className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                    <p className="font-semibold text-slate-900">{item.q}</p>
                    <p className="text-sm text-slate-600 mt-1">{item.a}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-indigo-200 bg-gradient-to-br from-indigo-700 via-violet-700 to-blue-700 text-white">
            <CardContent className="p-6 space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.1em] font-semibold">
                <HeartHandshake className="w-4 h-4" />
                CTA final
              </div>
              <h3 className="text-2xl font-black leading-tight">Pronto para escolher seu próximo passo?</h3>
              <p className="text-indigo-100">
                Social para autoconhecimento rápido, Business para operação recorrente e Enterprise para escala global.
              </p>
              <div className="grid gap-2">
                <Link to={createPageUrl('StartFree')}>
                  <Button className="w-full h-11 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50">
                    Fazer Teste Grátis
                  </Button>
                </Link>
                <Button onClick={handleBuySingleAssessment} className="w-full h-11 rounded-xl bg-indigo-950 hover:bg-indigo-900">
                  Comprar 1 Avaliação
                </Button>
                <Button onClick={openSales} variant="outline" className="w-full h-11 rounded-xl border-white/40 text-white hover:bg-white/10">
                  <MessageSquareText className="w-4 h-4 mr-2" />
                  Falar com Vendas
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <p className="text-center text-xs text-slate-400 pb-4">
          Preços em BRL. Créditos não utilizados permanecem disponíveis durante a validade contratada.
        </p>
      </main>
    </div>
  );
}
