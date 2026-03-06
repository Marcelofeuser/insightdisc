import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CheckCircle2, CreditCard, Building2, Shield, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

const CREDIT_PACKS = [
  {
    id: 'credits_10',
    name: '10 Avaliações',
    credits: 10,
    price: 'R$ 290',
    pricePerUnit: 'R$ 29/avaliação',
    popular: false,
    highlight: 'Ideal para testes e projetos pequenos',
    color: 'from-slate-600 to-slate-800',
  },
  {
    id: 'credits_50',
    name: '50 Avaliações',
    credits: 50,
    price: 'R$ 1.190',
    pricePerUnit: 'R$ 23,80/avaliação',
    popular: true,
    highlight: 'Economia de 18% — Mais vendido',
    color: 'from-indigo-600 to-violet-600',
    badge: 'Mais Popular',
  },
  {
    id: 'credits_100',
    name: '100 Avaliações',
    credits: 100,
    price: 'R$ 1.990',
    pricePerUnit: 'R$ 19,90/avaliação',
    popular: false,
    highlight: 'Economia de 31% — Melhor custo-benefício',
    color: 'from-emerald-600 to-teal-600',
  },
];

const PLANS = [
  {
    id: 'plan_pro',
    name: 'Pro',
    price: 'R$ 599',
    period: '/mês',
    features: ['30 avaliações/mês inclusas', 'Dashboard gerencial completo', 'Relatórios PDF ilimitados', 'Job Matching', 'Suporte prioritário'],
    color: 'border-indigo-200',
  },
  {
    id: 'plan_enterprise',
    name: 'Enterprise',
    price: 'Sob consulta',
    period: '',
    features: ['Avaliações ilimitadas', 'White-label completo', 'API de integração', 'Mapeamento de equipes ilimitado', 'Gerente de sucesso dedicado'],
    color: 'border-violet-200',
  },
];

export default function Pricing() {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [purchasing, setPurchasing] = useState(null);
  const [success, setSuccess] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  const assessmentId = searchParams.get('assessmentId') || '';
  const leadEmail = searchParams.get('email') || '';
  const leadName = searchParams.get('name') || '';
  const candidateToken = searchParams.get('token') || '';
  const checkoutFlow = searchParams.get('flow') || (assessmentId ? 'candidate' : '');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await base44.auth.me();
      setUser(u);
      if (u.active_workspace_id) {
        const ws = await base44.entities.Workspace.filter({ id: u.active_workspace_id });
        if (ws.length) setWorkspace(ws[0]);
      }
    } catch {}
  };

  const handlePurchase = async (pack) => {
    if (!user) { base44.auth.redirectToLogin(window.location.href); return; }
    setPurchasing(pack.id);

    // Simulate payment (in prod: redirect to Stripe/Asaas checkout)
    // Per PCI-DSS: we never store card data — only gateway transaction IDs
    await new Promise(r => setTimeout(r, 1800));

    try {
      // Record transaction (simulated as completed — real: set via webhook)
      await base44.entities.Transaction.create({
        user_id: user.id,
        workspace_id: workspace?.id,
        type: 'credit_pack',
        product: pack.id,
        amount: parseInt(pack.price.replace(/\D/g, '')),
        currency: 'BRL',
        status: 'completed',
        payment_method: 'credit_card',
        credits_added: pack.credits,
        metadata: { pack_name: pack.name }
      });

      // Add credits to workspace
      if (workspace) {
        const newBalance = (workspace.credits_balance || 0) + pack.credits;
        await base44.entities.Workspace.update(workspace.id, { credits_balance: newBalance });
        setWorkspace(prev => ({ ...prev, credits_balance: newBalance }));
      }

      setSuccess(pack);
    } catch (e) {
      console.error(e);
    } finally {
      setPurchasing(null);
    }
  };

  const handleCheckout = async ({ priceEnvKey, mode = 'payment' }) => {
    setCheckoutError('');
    setCheckoutLoading(true);
    let timeoutId;
    try {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), 12000);
      const payload = {
        mode,
        priceEnvKey,
        email: leadEmail || user?.email || '',
        name: leadName || user?.full_name || '',
        assessmentId: assessmentId || undefined,
        token: candidateToken || undefined,
        flow: checkoutFlow || undefined,
        successUrl: `${window.location.origin}${createPageUrl('CheckoutSuccess')}`,
        cancelUrl: `${window.location.origin}${createPageUrl('Pricing')}`,
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
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link to={user ? createPageUrl('Dashboard') : createPageUrl('Home')}>
            <Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Comprar Avaliações</h1>
            {workspace && (
              <p className="text-sm text-slate-500">
                Saldo atual: <span className="font-semibold text-indigo-600">{workspace.credits_balance || 0} créditos</span>
              </p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <Card className="mb-8 border-slate-200">
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Plano Individual</h2>
              <p className="text-sm text-slate-600">
                Faça o teste gratuitamente e desbloqueie o relatório completo quando quiser.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to={createPageUrl('StartFree')}>
                <Button variant="outline">Fazer teste grátis</Button>
              </Link>
              <Button
                onClick={() => handleCheckout({ priceEnvKey: 'STRIPE_PRICE_PRO', mode: 'payment' })}
                disabled={checkoutLoading || !assessmentId}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {checkoutLoading ? 'Abrindo checkout...' : 'Comprar relatório completo'}
              </Button>
            </div>
            {!assessmentId ? (
              <p className="text-xs text-slate-500">
                Para desbloquear um relatório específico, use o botão de desbloqueio na página de resultados.
              </p>
            ) : null}
          </CardContent>
        </Card>

        {/* Success Banner */}
        {success && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-5 rounded-2xl bg-green-50 border border-green-200 flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800">Compra realizada com sucesso!</p>
              <p className="text-sm text-green-700">{success.credits} créditos foram adicionados à sua conta. Novo saldo: {workspace?.credits_balance} créditos.</p>
            </div>
          </motion.div>
        )}

        {checkoutError ? (
          <div className="mb-8 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {checkoutError}
          </div>
        ) : null}

        {/* PCI-DSS Notice */}
        <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 mb-8">
          <Shield className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <p className="text-sm text-blue-700">
            <strong>Pagamento 100% seguro.</strong> Dados de cartão processados diretamente pelo gateway (PCI-DSS Level 1). Não armazenamos dados financeiros em nossos servidores.
          </p>
        </div>

        {/* Credit Packs */}
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Pacotes de Créditos (Pay-as-you-go)</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {CREDIT_PACKS.map((pack, i) => (
            <motion.div key={pack.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }} className="relative">
              {pack.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full z-10 whitespace-nowrap">
                  {pack.badge}
                </div>
              )}
              <Card className={`h-full border-2 ${pack.popular ? 'border-indigo-400 shadow-xl shadow-indigo-100' : 'border-slate-200'} overflow-hidden`}>
                <div className={`bg-gradient-to-br ${pack.color} p-6 text-white`}>
                  <h3 className="text-xl font-bold mb-1">{pack.name}</h3>
                  <p className="text-white/70 text-sm">{pack.highlight}</p>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{pack.price}</span>
                    <p className="text-white/70 text-sm mt-1">{pack.pricePerUnit}</p>
                  </div>
                </div>
                <CardContent className="p-6">
                  <ul className="space-y-2 mb-6">
                    {['Relatório PDF completo', 'Gráfico Natural + Adaptado', 'Job Matching incluído', 'Válido por 12 meses'].map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() => handlePurchase(pack)}
                    disabled={purchasing === pack.id}
                    className={`w-full rounded-xl h-12 font-semibold ${pack.popular ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-slate-900'}`}
                  >
                    {purchasing === pack.id ? (
                      <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />Processando...</>
                    ) : (
                      <><CreditCard className="w-4 h-4 mr-2" />Comprar {pack.name}</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Subscription Plans */}
        <h2 id="b2b" className="text-2xl font-bold text-slate-900 mb-6 scroll-mt-24">
          Planos SaaS (Assinatura Mensal)
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {PLANS.map((plan, i) => (
            <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className={`border-2 ${plan.color}`}>
                <CardContent className="p-7">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                        <span className="text-slate-500">{plan.period}</span>
                      </div>
                    </div>
                    {plan.id === 'plan_pro' && <Star className="w-5 h-5 text-amber-400 fill-amber-400" />}
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    onClick={() =>
                      plan.id === 'plan_enterprise'
                        ? null
                        : handleCheckout({ priceEnvKey: 'STRIPE_PRICE_B2B', mode: 'subscription' })
                    }
                    disabled={plan.id !== 'plan_enterprise' && checkoutLoading}
                    className="w-full rounded-xl h-12 font-semibold bg-indigo-600 hover:bg-indigo-700"
                  >
                    {plan.id === 'plan_enterprise'
                      ? 'Falar com Vendas'
                      : checkoutLoading
                        ? 'Abrindo checkout...'
                        : 'Assinar Plano Pro'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-center text-slate-400 mt-10">
          Todos os preços em BRL. Cancelamento a qualquer momento. Créditos não utilizados são transferidos entre ciclos.
        </p>
      </main>
    </div>
  );
}
