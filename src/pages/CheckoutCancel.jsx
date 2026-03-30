import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

export default function CheckoutCancel() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="w-full max-w-2xl border border-slate-200 shadow-[0_20px_50px_rgba(15,23,42,0.08)]">
        <CardContent className="p-8 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-amber-700">
            <AlertTriangle className="h-3.5 w-3.5" />
            Checkout cancelado
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900">Pagamento não concluído</h1>
            <p className="mt-2 text-sm text-slate-600">
              Não se preocupe: nenhum acesso foi liberado sem confirmação do pagamento. Você pode tentar novamente agora ou revisar os planos.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Se precisar de ajuda para finalizar com Pix ou cartão, fale com nosso suporte e seguimos com você no fluxo.
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to={createPageUrl('Pricing')}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">Tentar novamente</Button>
            </Link>
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline">Ir para meu painel</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
