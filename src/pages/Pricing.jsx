import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Gift,
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

const SALES_WHATSAPP_URL =
  'https://wa.me/5562994090276?text=Olá%20quero%20conhecer%20os%20planos%20Business%20do%20InsightDISC';

const SOCIAL_OFFERS = Object.freeze([
  {
    id: 'free',
    title: 'Starter',
    price: 'R$ 0',
    subtitle: 'Teste grátis com leitura inicial',
    badge: 'LIMITADO',
    cta: 'Fazer Teste Grátis',
    ctaHref: '/avaliacoes',
    features: [
      'Resultado imediato com perfil dominante',
      'Versão reduzida do diagnóstico comportamental',
      'Ideal para experimentar o método DISC',
    ],
  },
  {
    id: 'single',
    title: 'Professional',
    price: formatPriceBRL(PRODUCTS.SINGLE_PRO.price),
    subtitle: '1 avaliação premium completa',
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
    title: 'Gift',
    price: formatPriceBRL(PRODUCTS.GIFT.price),
    subtitle: 'Compre 1 avaliação para outra pessoa',
    cta: 'Comprar presente',
    features: [
      'Link exclusivo de presente',
      'Personalização somente após pagamento',
      'Compartilhamento fácil por link e WhatsApp',
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

const BUSINESS_PLANS = Object.freeze([
  {
    id: 'business_monthly',
    name: 'Plano Business Mensal',
    price: `${formatPriceBRL(PRODUCTS.BUSINESS_MONTHLY.price)}/${PRODUCTS.BUSINESS_MONTHLY.billingPeriod}`,
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
    gift: 'Sim (após ativação do presente)',
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
    a: 'Você compra primeiro e personaliza depois: gera o link exclusivo, adiciona mensagem e compartilha quando quiser.',
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

  const buildCheckoutUrl = (product, payload = {}) => {
    const params = new URLSearchParams();
    params.set('product', product);
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.set(key, String(value));
      }
    });
    return `/checkout?${params.toString()}`;
  };

  const startCheckout = (checkoutKey, product, payload = {}) => {
    if (!product) {
      setCheckoutError('Produto inválido para checkout.');
      return;
    }

    setCheckoutLoading(checkoutKey || product);
    setCheckoutError('');
    navigate(buildCheckoutUrl(product, payload));
  };

  const handleBuySingleAssessment = () => {
    startCheckout('single_assessment', 'single', {
      flow: checkoutFlow || (isCandidateUnlock ? 'candidate' : 'single_assessment'),
      assessmentId: isCandidateUnlock ? assessmentId : '',
      token: isCandidateUnlock ? candidateToken : '',
    });
  };

  const handleGiftPurchase = () => {
    startCheckout('gift_assessment', 'gift', {
      flow: 'gift',
    });
  };

  const handleCreditPackPurchase = (pack) => {
    startCheckout(pack.id, pack.checkoutProduct, {
      flow: 'credit_pack',
    });
  };

  const handleBusinessSubscription = () => {
    startCheckout('business_monthly', 'business-monthly', {
      flow: 'business_subscription',
    });
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
              <h1 className="text-xl md:text-2xl font-black text-slate-900">Preços InsightDISC</h1>
              <p className="text-sm text-slate-600">
                Estrutura comercial clara para Social / Individual e Business / Empresas
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
              Escolha a trilha certa para você: <span className="text-indigo-600">Social / Individual</span> ou{' '}
              <span className="text-violet-600">Business / Empresas</span>
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Aqui você encontra exatamente o que cada oferta entrega: o que é gratuito, o que é avulso, o que é presenteável,
              o que é pacote de avaliações e o que é assinatura mensal SaaS. Linhas comerciais: Starter, Professional, Business e Enterprise.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#social">
              <Button className="h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-6">
                Social / Individual
              </Button>
            </a>
            <a href="#b2b">
              <Button variant="outline" className="h-12 rounded-2xl px-6 border-slate-300 text-slate-900">
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
            <Card className="h-full border-2 border-slate-200">
              <CardContent className="p-6 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">{SOCIAL_OFFERS[0].title}</h4>
                      <p className="text-sm text-slate-600">{SOCIAL_OFFERS[0].subtitle}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Plano Starter</p>
                    </div>
                    <span className="rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-bold">
                      {SOCIAL_OFFERS[0].badge}
                    </span>
                  </div>

                  <div>
                    <span className="text-3xl font-black text-slate-900">{SOCIAL_OFFERS[0].price}</span>
                  </div>

                  <ul className="space-y-2 text-sm text-slate-700 min-h-44">
                    {SOCIAL_OFFERS[0].features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link to={SOCIAL_OFFERS[0].ctaHref} className="mt-auto">
                  <Button className="w-full h-12 rounded-2xl bg-slate-900 hover:bg-slate-950">
                    {SOCIAL_OFFERS[0].cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="h-full border-2 border-indigo-200 shadow-[0_16px_36px_rgba(79,70,229,0.12)]">
              <CardContent className="p-6 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">{SOCIAL_OFFERS[1].title}</h4>
                    <p className="text-sm text-slate-600">{SOCIAL_OFFERS[1].subtitle}</p>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">Plano Professional</p>
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

                  <ul className="space-y-2 text-sm text-slate-700 min-h-44">
                    {SOCIAL_OFFERS[1].features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={handleBuySingleAssessment}
                  disabled={Boolean(checkoutLoading)}
                  className="mt-auto w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700"
                >
                  {checkoutLoading === 'single_assessment' ? 'Abrindo checkout...' : 'Comprar 1 Avaliação'}
                </Button>
              </CardContent>
            </Card>

            <Card className="h-full border-2 border-violet-200">
              <CardContent className="p-6 h-full flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">{SOCIAL_OFFERS[2].title}</h4>
                      <p className="text-sm text-slate-600">{SOCIAL_OFFERS[2].subtitle}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-violet-700">Produto Presenteável</p>
                    </div>
                    <Gift className="w-5 h-5 text-violet-600" />
                  </div>

                  <div className="flex items-end gap-2">
                    <span className="text-3xl font-black text-slate-900">{SOCIAL_OFFERS[2].price}</span>
                    <span className="text-sm text-slate-500 pb-1">por presente</span>
                  </div>

                  <ul className="space-y-2 text-sm text-slate-700 min-h-44">
                    {SOCIAL_OFFERS[2].features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-700">
                    A personalização do presente acontece após o pagamento confirmado.
                  </div>
                </div>

                <Button
                  onClick={handleGiftPurchase}
                  disabled={Boolean(checkoutLoading)}
                  className="mt-auto w-full h-12 rounded-2xl bg-violet-600 hover:bg-violet-700"
                >
                  {checkoutLoading === 'gift_assessment' ? 'Abrindo checkout...' : 'Comprar presente'}
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
                Diferença clara: pacotes avulsos entregam volume imediato de avaliações; assinatura mensal entrega operação contínua com quantidade incluída; Enterprise é desenho personalizado para escala corporativa.
              </p>
            </div>
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

          <div className="grid lg:grid-cols-2 gap-6">
            {BUSINESS_PLANS.map((plan) => (
              <Card key={plan.id} className="h-full border-2 border-violet-200">
                <CardContent className="p-6 h-full flex flex-col justify-between">
                  <div className="space-y-4">
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

                    <ul className="space-y-2 text-sm text-slate-700 min-h-44">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.ctaKind === 'checkout' ? (
                    <Button
                      onClick={handleBusinessSubscription}
                      disabled={Boolean(checkoutLoading)}
                      className="mt-auto w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700"
                    >
                      {checkoutLoading === 'business_monthly' ? 'Abrindo checkout...' : 'Assinar Plano Business'}
                    </Button>
                  ) : (
                    <Button
                      onClick={openSales}
                      className="mt-auto w-full h-12 rounded-2xl bg-violet-600 hover:bg-violet-700"
                    >
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
              <h3 className="text-2xl font-black leading-tight">Precisa de apoio para escolher o plano certo?</h3>
              <p className="text-indigo-100">
                Nosso time comercial ajuda você a definir a melhor combinação entre avaliação avulsa, pacotes de créditos e assinatura Business.
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
