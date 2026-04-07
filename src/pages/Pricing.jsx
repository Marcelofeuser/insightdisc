import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  HeartHandshake,
  Shield,
  Sparkles,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PRODUCTS, formatPriceBRL } from '@/config/pricing';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { isSuperAdminAccess } from '@/modules/auth/access-control';
import { buildLoginRedirectUrl } from '@/modules/auth/next-path';
import { getCheckoutPreviewState, requiresCheckoutPreview } from '@/modules/checkout/funnel';
import { V21_PLAN_KEYS, V21_PLANS } from '@/modules/billing/v21Plans';

const SALES_WHATSAPP_URL =
  'https://wa.me/5562994090276?text=Olá%20quero%20conhecer%20os%20planos%20Business%20do%20InsightDISC';

const INDIVIDUAL_PLANS = Object.freeze([
  {
    id: 'disc_individual',
    name: 'DISC Individual',
    price: 'R$ 59,90',
    billing: 'pagamento único',
    audience: 'Uso único • leitura imediata',
    cta: 'Comprar DISC Individual',
    ctaKind: 'disc',
    features: [
      'Leitura comportamental individual',
      'Relatório premium (tela + PDF)',
      'Uso único (sem recorrência)',
      'Ideal para decisão pontual e objetiva',
    ],
  },
  {
    id: 'personal',
    name: 'Personal',
    price: 'R$ 99,90/mês',
    billing: 'mensal',
    audience: 'Autoconhecimento contínuo',
    cta: 'Assinar Personal',
    ctaKind: 'plan',
    planSlug: 'personal',
    features: [
      'Leitura comportamental aplicada ao dia a dia',
      'Clareza sobre decisão, pressão e comunicação',
      'Direcionamento de evolução (próximos passos)',
      'Relatório para consulta contínua',
    ],
  },
  {
    id: 'insider',
    name: 'Insider',
    price: 'R$ 129,90/mês',
    billing: 'mensal',
    audience: 'Versão aprofundada',
    cta: 'Assinar Insider',
    ctaKind: 'plan',
    planSlug: 'insider',
    features: [
      'Tudo do Personal',
      'Leitura mais profunda e detalhada',
      'Mais camadas de interpretação e contexto',
      'Base forte para decisões consistentes',
    ],
  },
]);

const CREDIT_PACKS = Object.freeze([
  {
    id: 'credits_10',
    name: '10 avaliações',
    credits: PRODUCTS.PACK_10.credits,
    price: formatPriceBRL(PRODUCTS.PACK_10.price),
    perUnit: `${formatPriceBRL(PRODUCTS.PACK_10.price / PRODUCTS.PACK_10.credits)} por avaliação`,
    highlight: 'Ideal para squads pequenos e consultorias.',
    cta: 'Comprar 10 Avaliações',
    checkoutProduct: PRODUCTS.PACK_10.id,
  },
  {
    id: 'credits_50',
    name: '50 avaliações',
    credits: PRODUCTS.PACK_50.credits,
    price: formatPriceBRL(PRODUCTS.PACK_50.price),
    perUnit: `${formatPriceBRL(PRODUCTS.PACK_50.price / PRODUCTS.PACK_50.credits)} por avaliação`,
    highlight: 'Melhor equilíbrio para operação recorrente.',
    cta: 'Comprar 50 Avaliações',
    popular: true,
    checkoutProduct: PRODUCTS.PACK_50.id,
  },
  {
    id: 'credits_100',
    name: '100 avaliações',
    credits: PRODUCTS.PACK_100.credits,
    price: formatPriceBRL(PRODUCTS.PACK_100.price),
    perUnit: `${formatPriceBRL(PRODUCTS.PACK_100.price / PRODUCTS.PACK_100.credits)} por avaliação`,
    highlight: 'Escala com maior eficiência de custo.',
    cta: 'Comprar 100 Avaliações',
    checkoutProduct: PRODUCTS.PACK_100.id,
  },
]);

const WHITE_LABEL_ADDON_LABEL = 'White label (add-on R$ 299 • pagamento único)';

const PROFESSIONAL_PLANS = Object.freeze([
  {
    id: 'professional',
    name: 'Professional',
    price: 'R$ 199,90/mês',
    audience: '10 créditos/mês • uso profissional',
    cta: 'Assinar Professional',
    ctaKind: 'plan',
    planSlug: 'professional',
    features: [
      '10 créditos por mês',
      'Relatórios premium (tela + PDF)',
      'Comparação de perfis',
      WHITE_LABEL_ADDON_LABEL,
      'Ideal para especialistas e entregáveis premium',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    price: 'R$ 399,90/mês',
    audience: '25 créditos/mês • pequenas empresas',
    cta: 'Assinar Business',
    ctaKind: 'plan',
    planSlug: 'business',
    features: [
      '25 créditos por mês',
      'Team Map e leitura de equipe',
      'Relatórios premium (tela + PDF)',
      WHITE_LABEL_ADDON_LABEL,
      'Ideal para aplicar em time e decisões de pessoas',
    ],
  },
]);

const CORPORATE_PLANS = Object.freeze([
  {
    ...V21_PLANS[V21_PLAN_KEYS.BUSINESS_CORPORATION],
    price: 'R$ 999,90/mês',
    audience: 'Uso ilimitado • white label incluso',
    features: [
      'Uso ilimitado sob política de uso justo',
      'White label incluso',
      'Foco em RH estruturado e equilíbrio organizacional',
      'Onboarding guiado e suporte prioritário',
      'Em implantação progressiva (V2.1)',
    ],
  },
  {
    ...V21_PLANS[V21_PLAN_KEYS.DIAMOND_CONSULTING],
    price: 'R$ 9.990/mês',
    audience: 'Consultoria premium + acompanhamento humano',
    features: [
      'Tudo do Business Corporation',
      'White label avançado incluso',
      'Acompanhamento consultivo (RH / liderança / cultura)',
      'Playbooks e implantação em escala',
      'Em implantação progressiva (V2.1)',
    ],
  },
]);

const FAQ_ITEMS = Object.freeze([
  {
    q: 'Qual a diferença entre assinatura mensal e compra avulsa?',
    a: 'Assinatura mensal é recorrência (com créditos e acesso contínuo). Compra avulsa é pontual (uso único ou pacotes), sem mensalidade.',
  },
  {
    q: 'O relatório premium (PDF) está incluído?',
    a: 'Sim — nos planos pagos e no DISC Individual. O PDF é exportável e pensado para consulta e entregáveis.',
  },
  {
    q: 'Posso complementar créditos além do plano mensal?',
    a: 'Sim. Quando fizer sentido, você pode adicionar pacotes de créditos para volume adicional (sem mudar seu plano).',
  },
  {
    q: 'Como funciona o white label?',
    a: 'Professional e Business têm add-on opcional (pagamento único). Business Corporation e Diamond Consulting incluem white label.',
  },
]);

export default function Pricing() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: authUser, access } = useAuth();
  const [checkoutLoading, setCheckoutLoading] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  const assessmentId = searchParams.get('assessmentId') || '';
  const candidateToken = searchParams.get('token') || '';
  const checkoutFlow = searchParams.get('flow') || (assessmentId ? 'candidate' : '');
  const unlockRequired = searchParams.get('unlock') === '1';

  const isCandidateUnlock = useMemo(
    () => Boolean(assessmentId || candidateToken || checkoutFlow === 'candidate'),
    [assessmentId, candidateToken, checkoutFlow]
  );

  useEffect(() => {
    const scrollToHashSection = () => {
      const hash = window.location.hash;
      if (!hash || hash === '#') return;

      const target = document.querySelector(hash);
      if (!target) return;

      const top = target.getBoundingClientRect().top + window.scrollY - 108;
      window.scrollTo({ top, behavior: 'smooth' });
    };

    const frame = requestAnimationFrame(scrollToHashSection);
    window.addEventListener('hashchange', scrollToHashSection);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', scrollToHashSection);
    };
  }, []);

  const openSales = () => {
    window.open(SALES_WHATSAPP_URL, '_blank', 'noopener,noreferrer');
  };

  const startCheckout = (planSlug) => {
    const normalizedPlanSlug = String(planSlug || '').trim().toLowerCase();
    const allowedPlans = new Set(['personal', 'insider', 'professional', 'business', 'diamond', 'enterprise', 'pro', 'premium'])
    if (!allowedPlans.has(normalizedPlanSlug)) {
      setCheckoutError('Plano inválido para checkout.');
      return;
    }

    if (!authUser?.id) {
      const nextUrl = `/checkout/plan/${normalizedPlanSlug}`;
      const loginRedirectUrl = buildLoginRedirectUrl({
        pathname: nextUrl,
        search: '',
      });
      navigate(loginRedirectUrl);
      return;
    }

    const shouldGateByPreview = requiresCheckoutPreview(access) && !isCandidateUnlock;
    if (shouldGateByPreview) {
      const previewState = getCheckoutPreviewState();
      if (!previewState.hasPreview) {
        setCheckoutError('Antes do checkout, veja um preview do relatório para liberar a compra.');
        navigate('/StartFree');
        return;
      }
    }

    setCheckoutLoading(normalizedPlanSlug);
    setCheckoutError('');
    navigate(`/checkout/plan/${normalizedPlanSlug}`);
  };

  const startDiscIndividualCheckout = () => {
    const nextUrl = '/checkout/disc';
    if (!authUser?.id) {
      navigate(
        buildLoginRedirectUrl({
          pathname: nextUrl,
          search: '',
        }),
      );
      return;
    }

    setCheckoutLoading('disc_individual');
    setCheckoutError('');
    navigate(nextUrl);
  };

  const handleCreditPackPurchase = (pack) => {
    if (!authUser?.id) {
      const loginRedirectUrl = buildLoginRedirectUrl({
        pathname: createPageUrl('Credits'),
        search: '',
      });
      navigate(loginRedirectUrl);
      return;
    }

    const normalizedPlan = String(access?.plan || authUser?.plan || '').trim().toLowerCase();
    const hasActivePlan =
      Boolean(authUser?.hasActivePlan || authUser?.has_active_plan || access?.hasPaidPurchase)
      || ['personal', 'insider', 'professional', 'business', 'diamond', 'enterprise', 'pro', 'premium']

    if (!hasActivePlan) {
      setCheckoutError('Compra de créditos disponível somente dentro do painel para contas com plano ativo.');
      return;
    }

    setCheckoutLoading(pack?.id || 'credits');
    setCheckoutError('');
    navigate(createPageUrl('Credits'));
  };

  const user = authUser || null;
  const hasSuperAdminBypass = isSuperAdminAccess(access);
  const activeBalance = Number(authUser?.credits_balance ?? authUser?.credits ?? 0);

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
              <h1 className="text-xl md:text-2xl font-black text-slate-900">Planos InsightDISC</h1>
              <p className="text-sm text-slate-600">
                Leitura comportamental aplicável • recorrência, créditos e white label
              </p>
            </div>
          </div>

          {user ? (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-700">
              Saldo atual: <strong>{hasSuperAdminBypass ? 'Ilimitado' : `${activeBalance} créditos`}</strong>
            </div>
          ) : null}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-10 pb-32 space-y-10">
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
        {hasSuperAdminBypass ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            SUPER ADMIN — sem cobrança real para testes internos.
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-indigo-700">
              <Sparkles className="w-3.5 h-3.5" />
              Pricing estruturado por jornada
            </p>
            <h2 className="mt-4 text-3xl md:text-4xl font-black text-slate-900 leading-tight">
              Escolha o plano certo para sua realidade:{' '}
              <span className="text-indigo-600">Individual</span>,{' '}
              <span className="text-violet-600">Profissional</span> ou{' '}
              <span className="text-slate-900">Empresas</span>
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              O InsightDISC é um sistema de leitura comportamental aplicável para decisões, relações e performance.
              Veja recorrência, créditos e o que cada camada entrega — do Individual ao corporativo.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#individual">
              <Button className="h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-6">
                Individual
              </Button>
            </a>
            <a href="#profissional">
              <Button variant="outline" className="h-12 rounded-2xl px-6 border-slate-300 text-slate-900">
                Profissional e Empresas
              </Button>
            </a>
          </div>

          <div className="mt-7 grid md:grid-cols-3 gap-4">
            {[
              'Recorrência e créditos com clareza',
              'White label como add-on ou incluso por plano',
              'CTA direto para checkout ou especialista',
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

        <section id="individual" className="scroll-mt-28 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-indigo-600 font-semibold">Individual</p>
              <h3 className="text-3xl font-black text-slate-900">Autoconhecimento aplicável, com clareza de entrega</h3>
              <p className="text-slate-600 mt-2 max-w-3xl">
                Escolha entre uso único (DISC Individual) ou assinatura mensal (Personal/Insider) para acompanhamento contínuo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/demo">
                <Button variant="outline" className="h-11 rounded-2xl px-5 border-slate-300 text-slate-900">
                  Ver demo
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {INDIVIDUAL_PLANS.map((plan, index) => {
              const isDisc = plan.ctaKind === 'disc';
              const loadingKey = isDisc ? plan.id : plan.planSlug;
              const isLoading = checkoutLoading === loadingKey;
              const borderTone =
                index === 0
                  ? 'border-2 border-slate-200'
                  : index === 1
                    ? 'border-2 border-indigo-200 shadow-[0_16px_36px_rgba(79,70,229,0.12)]'
                    : 'border-2 border-violet-200';

              return (
                <Card key={plan.id} className={`h-full ${borderTone}`}>
                  <CardContent className="p-6 h-full flex flex-col justify-between">
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-xl font-bold text-slate-900">{plan.name}</h4>
                        <p className="text-sm text-slate-600">{plan.audience}</p>
                      </div>

                      <div className="flex items-end gap-2">
                        <span className="text-3xl font-black text-slate-900">{plan.price}</span>
                        <span className="text-sm text-slate-500 pb-1">{plan.billing}</span>
                      </div>

                      {isCandidateUnlock && isDisc ? (
                        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-700">
                          Você veio de um fluxo público. Esta compra libera o relatório premium desta avaliação.
                        </div>
                      ) : null}

                      <ul className="space-y-2 text-sm text-slate-700 min-h-44">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      onClick={() => {
                        if (isDisc) return startDiscIndividualCheckout();
                        return startCheckout(plan.planSlug);
                      }}
                      disabled={Boolean(checkoutLoading)}
                      className={`mt-auto w-full h-12 rounded-2xl ${
                        index === 2 ? 'bg-violet-600 hover:bg-violet-700' : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {isLoading ? 'Abrindo checkout...' : plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section id="profissional" className="scroll-mt-28 space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-violet-700 font-semibold">Profissional e Empresas</p>
              <h3 className="text-3xl font-black text-slate-900">Créditos mensais para operar com consistência</h3>
              <p className="text-slate-600 mt-2 max-w-3xl">
                Professional e Business são assinaturas mensais com créditos. Business Corporation e Diamond Consulting são camadas
                corporativas com uso ilimitado (uso justo) e white label incluso.
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {PROFESSIONAL_PLANS.map((plan) => {
              const isLoading = checkoutLoading === plan.planSlug;
              return (
                <Card key={plan.id} className="h-full border-2 border-violet-200">
                  <CardContent className="p-6 h-full flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="inline-flex items-center gap-2 text-violet-700 text-xs uppercase tracking-[0.1em] font-semibold">
                            <Building2 className="w-4 h-4" />
                            Assinatura mensal
                          </div>
                          <h4 className="text-2xl font-black text-slate-900">{plan.name}</h4>
                          <p className="text-sm text-slate-600">{plan.audience}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-black text-slate-900">{plan.price}</div>
                          <div className="text-xs text-slate-500">{plan.id === 'business' ? '25 créditos/mês' : '10 créditos/mês'}</div>
                        </div>
                      </div>

                      <ul className="space-y-2 text-sm text-slate-700 min-h-44">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button
                      onClick={() => startCheckout(plan.planSlug)}
                      disabled={Boolean(checkoutLoading)}
                      className="mt-auto w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700"
                    >
                      {isLoading ? 'Abrindo checkout...' : plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {CORPORATE_PLANS.map((plan) => (
              <Card key={plan.id} className="h-full border-2 border-slate-200">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-2 text-slate-700 text-xs uppercase tracking-[0.1em] font-semibold">
                          <Building2 className="w-4 h-4" />
                          Corporate
                        </div>
                        <h4 className="text-2xl font-black text-slate-900">{plan.name}</h4>
                        <p className="text-sm text-slate-600">{plan.audience}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-slate-900">{plan.price}</div>
                        <div className="text-xs text-slate-500">Uso ilimitado (uso justo)</div>
                      </div>
                    </div>

                    <ul className="space-y-2 text-sm text-slate-700 min-h-44">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    onClick={openSales}
                    className="mt-auto w-full h-12 rounded-2xl bg-violet-600 hover:bg-violet-700"
                  >
                    {plan.cta || 'Falar com especialista'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
            <strong>White label:</strong> add-on opcional em Professional e Business (pagamento único). Incluso em Business Corporation e Diamond Consulting.
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-600 font-semibold">Créditos avulsos</p>
              <h3 className="text-2xl font-black text-slate-900">Complementar volume quando precisar</h3>
              <p className="text-slate-600 mt-1 max-w-3xl">
                Para operações com plano ativo: adicione pacotes de créditos quando houver pico de demanda.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {CREDIT_PACKS.map((pack) => (
                <motion.div key={pack.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={`h-full border-2 ${pack.popular ? 'border-indigo-400 shadow-[0_18px_40px_rgba(79,70,229,0.18)]' : 'border-slate-200'}`}>
                    <CardContent className="p-6 h-full flex flex-col justify-between">
                      <div className="space-y-4">
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

                        <ul className="space-y-2 text-sm text-slate-700 min-h-44">
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
                      </div>

                      <Button
                        onClick={() => handleCreditPackPurchase(pack)}
                        disabled={checkoutLoading === pack.id}
                        className="mt-auto w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-950"
                      >
                        {checkoutLoading === pack.id ? 'Abrindo checkout...' : pack.cta}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
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
              <h3 className="text-2xl font-black leading-tight">Precisa de apoio para escolher o plano certo?</h3>
              <p className="text-indigo-100">
                Nosso time ajuda a mapear sua necessidade e indicar a melhor camada: Individual, Professional, Business ou corporativo (Business Corporation / Diamond Consulting).
              </p>
              <div className="grid gap-2 pt-1">
                <Button
                  onClick={openSales}
                  className="w-full h-11 rounded-xl bg-white text-indigo-700 border border-indigo-100 hover:bg-indigo-50 hover:text-indigo-800"
                >
                  Falar com Vendas
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <p className="text-center text-xs text-slate-400">
          Preços em BRL. Créditos não utilizados permanecem disponíveis durante a validade contratada.
        </p>
      </main>
    </div>
  );
}
