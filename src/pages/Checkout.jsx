import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CreditCard, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';

const PRODUCTS = Object.freeze({
  single: {
    title: '1 Avaliação Avulsa',
    price: 'R$ 79,00',
    summary: 'Relatório DISC completo para uso individual.',
  },
  gift: {
    title: 'Presente DISC',
    price: 'R$ 79,00',
    summary: 'Compre agora e personalize o presente após a confirmação do pagamento.',
  },
  'pack-10': {
    title: 'Pacote 10 Avaliações',
    price: 'R$ 290,00',
    summary: 'Ideal para squads pequenos e consultorias.',
  },
  'pack-50': {
    title: 'Pacote 50 Avaliações',
    price: 'R$ 1.190,00',
    summary: 'Escala com melhor custo por avaliação.',
  },
  'pack-100': {
    title: 'Pacote 100 Avaliações',
    price: 'R$ 1.990,00',
    summary: 'Volume alto para operação recorrente e RH em escala.',
  },
  'business-monthly': {
    title: 'Assinatura Business Mensal',
    price: 'R$ 199,00 / mês',
    summary: 'Plano contínuo para operação profissional com painel SaaS.',
  },
  'report-unlock': {
    title: 'Desbloquear Relatório Completo',
    price: 'R$ 49,90',
    summary: 'Libera o relatório completo da avaliação já realizada.',
  },
});

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const productKey = searchParams.get('product') || 'single';
  const product = PRODUCTS[productKey] || PRODUCTS.single;

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
              onClick={() => {}}
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
