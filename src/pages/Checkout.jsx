import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PRODUCTS, formatPriceBRL, getProductById } from '@/config/pricing';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { isSuperAdminAccess } from '@/modules/auth/access-control';

function buildCheckoutProduct(rawProductKey) {
  const fallbackProduct = PRODUCTS.SINGLE_PRO;
  const resolvedProduct = getProductById(rawProductKey) || fallbackProduct;

  const basePrice = formatPriceBRL(resolvedProduct.price);
  const price = resolvedProduct.billingPeriod ? `${basePrice} / ${resolvedProduct.billingPeriod}` : basePrice;

  return {
    title: resolvedProduct.name,
    summary: resolvedProduct.description,
    price,
  };
}

export default function Checkout() {
  const { access } = useAuth();
  const [searchParams] = useSearchParams();
  const rawProductKey = (searchParams.get('product') || searchParams.get('produto') || 'single').trim();
  const product = buildCheckoutProduct(rawProductKey);
  const hasSuperAdminBypass = isSuperAdminAccess(access);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link to={createPageUrl('Pricing')} className="inline-flex items-center">
          <Button variant="ghost" className="rounded-xl">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para preços
          </Button>
        </Link>

        <Card className="border border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <CardContent className="space-y-5 p-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-indigo-700">
              <CreditCard className="h-3.5 w-3.5" />
              Checkout provisório
            </div>
            {hasSuperAdminBypass ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-amber-800">
                SUPER ADMIN — ACESSO TOTAL
              </div>
            ) : null}

            <div>
              <h1 className="text-2xl font-black text-slate-900">{product.title}</h1>
              <p className="mt-2 text-slate-600">{product.summary}</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-sm text-slate-500">Produto selecionado</div>
              <div className="mt-1 text-xl font-bold text-slate-900">{product.title}</div>
              <div className="mt-3 text-3xl font-black text-indigo-700">{product.price}</div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              O pagamento definitivo ainda está em implementação nesta rota temporária. Nenhum crédito é adicionado antes da confirmação de pagamento.
            </div>

            <Button
              className="h-12 w-full rounded-2xl bg-slate-900 hover:bg-slate-950"
              onClick={() => {
                window.alert('Pagamento em implementação nesta rota provisória.');
              }}
            >
              PAGAMENTO EM IMPLEMENTAÇÃO
            </Button>

            <p className="flex items-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Fluxo preparado para liberar créditos apenas após confirmação de pagamento.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
