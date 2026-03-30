import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { PRODUCTS, formatPriceBRL } from '@/config/pricing';
import { apiRequest, getApiToken } from '@/lib/apiClient';
import { createPageUrl } from '@/utils';
import { buildLoginRedirectUrl } from '@/modules/auth/next-path';
import { useAuth } from '@/lib/AuthContext';
import { getCheckoutPreviewState, requiresCheckoutPreview } from '@/modules/checkout/funnel';
import { trackEvent } from '@/lib/analytics';

const SIMPLE_PACKAGES = Object.freeze([
  {
    id: 'credit-1',
    credits: 1,
    title: '1 crédito DISC',
    subtitle: 'Compra pontual para uma avaliação.',
    price: formatPriceBRL(PRODUCTS.SINGLE_PRO.price),
  },
  {
    id: 'credit-5',
    credits: 5,
    title: '5 créditos DISC',
    subtitle: 'Pacote compacto para pequenos ciclos.',
    price: formatPriceBRL(149),
  },
  {
    id: 'credit-10',
    credits: 10,
    title: '10 créditos DISC',
    subtitle: 'Volume recomendado para equipes iniciais.',
    price: formatPriceBRL(PRODUCTS.PACK_10.price),
  },
  {
    id: 'credit-50',
    credits: 50,
    title: '50 créditos DISC',
    subtitle: 'Escala para operação recorrente de avaliações.',
    price: formatPriceBRL(PRODUCTS.PACK_50.price),
  },
]);

export default function Checkout() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { access, user } = useAuth();
  const [loadingPackage, setLoadingPackage] = useState('');
  const hasActivePlan = useMemo(() => {
    const normalizedPlan = String(access?.plan || user?.plan || '').trim().toLowerCase();
    return (
      Boolean(user?.hasActivePlan || user?.has_active_plan || access?.hasPaidPurchase) ||
      ['personal', 'professional', 'business', 'diamond', 'enterprise', 'pro', 'premium'].includes(normalizedPlan)
    );
  }, [access?.hasPaidPurchase, access?.plan, user?.hasActivePlan, user?.has_active_plan, user?.plan]);

  const redirectToLogin = () => {
    const loginRedirectUrl = buildLoginRedirectUrl({
      pathname: location.pathname,
      search: location.search || '',
    });
    navigate(loginRedirectUrl);
  };

  const enforcePreviewGate = ({ allowBypass = false } = {}) => {
    if (!requiresCheckoutPreview(access)) return true;
    if (allowBypass) return true;

    const previewState = getCheckoutPreviewState();
    if (previewState.hasPreview) return true;

    toast({
      title: 'Veja o preview antes do pagamento',
      description: 'Para liberar o checkout, primeiro conclua a etapa de preview do relatório.',
      variant: 'destructive',
    });
    navigate('/StartFree');
    return false;
  };

  const startSimpleCheckout = async (checkoutPackage) => {
    if (!checkoutPackage?.id) return;
    if (!enforcePreviewGate()) return;

    if (!getApiToken()) {
      redirectToLogin();
      return;
    }

    setLoadingPackage(checkoutPackage.id);
    trackEvent('checkout_started', {
      flow: 'simple_credits',
      product: checkoutPackage.id,
      credits: checkoutPackage.credits,
      path: location.pathname,
    });

    try {
      const payload = await apiRequest('/payments/create-checkout', {
        method: 'POST',
        requireAuth: true,
        body: {
          packageId: checkoutPackage.id,
          productType: 'credit_pack',
          credits: checkoutPackage.credits,
          provider: 'STRIPE',
        },
      });

      const checkoutUrl = String(payload?.checkoutUrl || '').trim();
      if (!checkoutUrl) {
        throw new Error('CHECKOUT_URL_NOT_FOUND');
      }

      window.location.href = checkoutUrl;
    } catch (error) {
      const fallbackMessage =
        error?.message === 'API_AUTH_MISSING'
          ? 'Redirecionando para login...'
          : error?.message || 'Falha ao iniciar checkout.';

      if (error?.message === 'API_AUTH_MISSING') {
        redirectToLogin();
      }

      toast({
        title: 'Checkout indisponível',
        description: fallbackMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingPackage('');
    }
  };

  if (!user?.id || !hasActivePlan) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-3xl">
          <Card className="border border-amber-200 shadow-sm">
            <CardContent className="space-y-4 p-7">
              <h1 className="text-2xl font-black text-slate-900">Compra de créditos disponível apenas no painel ativo</h1>
              <p className="text-slate-600">
                Para manter o fluxo de checkout limpo, pacotes de créditos ficam restritos a contas autenticadas com plano ativo.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="rounded-xl">
                  Ir para meu painel
                </Button>
                <Button variant="outline" onClick={() => navigate(createPageUrl('Pricing'))} className="rounded-xl">
                  Ver planos
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link to={createPageUrl('Pricing')} className="inline-flex items-center">
          <Button variant="ghost" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para preços
          </Button>
        </Link>

        <Card className="border border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <CardContent className="space-y-6 p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Checkout simples de créditos</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Escolha um pacote de créditos DISC e siga para o checkout seguro.
                </p>
              </div>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                Stripe Checkout + Pix
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {SIMPLE_PACKAGES.map((item) => (
                <Card key={item.id} className="border-slate-200">
                  <CardContent className="space-y-4 p-5">
                    <div>
                      <div className="text-sm text-slate-500">Pacote</div>
                      <div className="text-xl font-black text-slate-900">{item.title}</div>
                      <div className="mt-1 text-sm text-slate-600">{item.subtitle}</div>
                    </div>

                    <div className="text-2xl font-black text-indigo-700">{item.price}</div>

                    <Button
                      className="w-full"
                      onClick={() => startSimpleCheckout(item)}
                      disabled={loadingPackage === item.id}
                    >
                      {loadingPackage === item.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Iniciando checkout...
                        </>
                      ) : (
                        `Comprar ${item.credits} crédito${item.credits > 1 ? 's' : ''}`
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Os créditos só são liberados após confirmação de pagamento no backend.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
