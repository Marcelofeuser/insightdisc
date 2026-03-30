import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { PRODUCTS, formatPriceBRL, getProductById } from '@/config/pricing';
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

function mapLegacyProductPayload(rawProductKey = '', params = new URLSearchParams()) {
  const resolvedProduct = getProductById(rawProductKey || '') || null;

  if (!resolvedProduct) {
    return null;
  }

  const productTypeById = {
    single: 'single_assessment',
    gift: 'gift_assessment',
    'pack-10': 'credit_pack',
    'pack-50': 'credit_pack',
    'pack-100': 'credit_pack',
    'business-monthly': 'business_subscription',
    'report-unlock': 'report_unlock',
  };

  const payload = {
    product: resolvedProduct.id,
    productType: productTypeById[resolvedProduct.id] || undefined,
    credits: Number(resolvedProduct.credits || 0) || undefined,
    flow: params.get('flow') || undefined,
    assessmentId: params.get('assessmentId') || undefined,
    token: params.get('token') || undefined,
    giftToken: params.get('giftToken') || undefined,
  };

  if (resolvedProduct.id === 'business-monthly') {
    payload.mode = 'subscription';
  }

  return payload;
}

function buildLegacyProductView(rawProductKey = '') {
  const fallbackProduct = PRODUCTS.SINGLE_PRO;
  const resolvedProduct = getProductById(rawProductKey) || fallbackProduct;

  const basePrice = formatPriceBRL(resolvedProduct.price);
  const price = resolvedProduct.billingPeriod ? `${basePrice} / ${resolvedProduct.billingPeriod}` : basePrice;

  return {
    title: resolvedProduct.name,
    summary: resolvedProduct.description,
    price,
    productId: resolvedProduct.id,
  };
}

export default function Checkout() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { access } = useAuth();
  const [searchParams] = useSearchParams();
  const [loadingPackage, setLoadingPackage] = useState('');

  const rawProductKey = String(searchParams.get('product') || searchParams.get('produto') || '').trim();

  const legacyProduct = useMemo(() => {
    if (!rawProductKey) return null;
    return buildLegacyProductView(rawProductKey);
  }, [rawProductKey]);

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
      const payload = await apiRequest('/api/checkout/create', {
        method: 'POST',
        requireAuth: true,
        body: {
          packageId: checkoutPackage.id,
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

  const startLegacyCheckout = async () => {
    const payload = mapLegacyProductPayload(rawProductKey, searchParams);
    if (!payload) {
      toast({
        title: 'Produto inválido',
        description: 'O produto selecionado não é válido para checkout.',
        variant: 'destructive',
      });
      return;
    }

    const isReportUnlock = payload.product === 'report-unlock';
    const hasCheckoutContext = Boolean(payload.assessmentId && payload.token);
    const bypassPreviewGate = isReportUnlock && hasCheckoutContext;

    if (!enforcePreviewGate({ allowBypass: bypassPreviewGate })) {
      return;
    }

    if (isReportUnlock && !hasCheckoutContext) {
      toast({
        title: 'Contexto insuficiente',
        description: 'Não foi possível identificar a avaliação para liberar o relatório. Solicite um novo link.',
        variant: 'destructive',
      });
      return;
    }

    if (!getApiToken()) {
      redirectToLogin();
      return;
    }

    setLoadingPackage(`legacy-${payload.product}`);
    trackEvent('checkout_started', {
      flow: payload.flow || 'legacy',
      product: payload.product,
      path: location.pathname,
    });
    try {
      const response = await apiRequest('/payments/create-checkout', {
        method: 'POST',
        requireAuth: true,
        body: payload,
      });

      const checkoutUrl = String(response?.url || '').trim();
      if (!checkoutUrl) {
        throw new Error('CHECKOUT_URL_NOT_FOUND');
      }

      window.location.href = checkoutUrl;
    } catch (error) {
      let fallbackMessage = error?.message || 'Falha ao iniciar checkout para este produto.';
      if (error?.message === 'API_AUTH_MISSING') {
        fallbackMessage = 'Redirecionando para login...';
        redirectToLogin();
      }
      toast({
        title: 'Falha no checkout',
        description: fallbackMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingPackage('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link to={createPageUrl('Pricing')} className="inline-flex items-center">
          <Button variant="ghost" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para preços
          </Button>
        </Link>

        {legacyProduct ? (
          <Card className="border border-slate-200 shadow-sm">
            <CardContent className="space-y-5 p-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-indigo-700">
                <CreditCard className="h-3.5 w-3.5" />
                Produto selecionado
              </div>

              <div>
                <h1 className="text-2xl font-black text-slate-900">{legacyProduct.title}</h1>
                <p className="mt-2 text-slate-600">{legacyProduct.summary}</p>
                <p className="mt-3 text-3xl font-black text-indigo-700">{legacyProduct.price}</p>
              </div>

              <Button
                className="h-12 rounded-2xl bg-slate-900 px-8 hover:bg-slate-950"
                onClick={startLegacyCheckout}
                disabled={loadingPackage === `legacy-${legacyProduct.productId}`}
              >
                {loadingPackage === `legacy-${legacyProduct.productId}` ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Iniciando checkout...
                  </>
                ) : (
                  'Continuar compra deste produto'
                )}
              </Button>
            </CardContent>
          </Card>
        ) : null}

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
