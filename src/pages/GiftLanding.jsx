import React, { useMemo } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Gift, HeartHandshake, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { resolveGiftPayload } from '@/modules/billing/gift-utils';

export default function GiftLanding() {
  const { token = '' } = useParams();
  const [searchParams] = useSearchParams();

  const gift = useMemo(
    () => resolveGiftPayload({ token, searchParams }),
    [token, searchParams]
  );

  const senderName = gift?.payload?.senderName || 'uma pessoa especial';
  const recipientName = gift?.payload?.recipientName || 'você';
  const giftMessage =
    gift?.payload?.message ||
    'Recebi esta avaliação para você porque acredito no seu potencial. Aproveite essa oportunidade para se conhecer melhor.';

  const startUrl = (() => {
    const params = new URLSearchParams();
    if (token) params.set('giftToken', token);
    if (gift?.payload?.senderName) params.set('giftFrom', gift.payload.senderName);
    if (gift?.payload?.recipientName) params.set('giftTo', gift.payload.recipientName);
    return `${createPageUrl('StartFree')}?${params.toString()}`;
  })();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.18),transparent_32%),radial-gradient(circle_at_80%_20%,rgba(14,165,233,0.18),transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <main className="max-w-4xl mx-auto px-6 py-14">
        <div className="rounded-3xl border border-white/70 bg-white/85 backdrop-blur-md shadow-[0_28px_80px_rgba(15,23,42,0.14)] overflow-hidden">
          <div className="px-8 py-7 border-b border-slate-200/80 bg-gradient-to-r from-indigo-700 via-violet-700 to-blue-700 text-white">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.12em] font-semibold">
              <Gift className="w-3.5 h-3.5" />
              Presente InsightDISC
            </div>
            <h1 className="mt-4 text-3xl font-black leading-tight">
              Você recebeu uma avaliação DISC de {senderName}
            </h1>
            <p className="mt-3 text-indigo-100 max-w-2xl">
              {recipientName}, esta é uma experiência premium para entender seus padrões
              comportamentais e transformar sua tomada de decisão no trabalho.
            </p>
          </div>

          <div className="px-8 py-8 space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div className="flex items-start gap-3">
                <HeartHandshake className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Mensagem de quem enviou</h2>
                  <p className="mt-2 text-slate-700 leading-relaxed">{giftMessage}</p>
                </div>
              </div>
            </section>

            <section className="grid md:grid-cols-3 gap-4">
              {[
                'Teste rápido e intuitivo',
                'Leitura comportamental completa',
                'Relatório premium com aplicação prática',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-700"
                >
                  {item}
                </div>
              ))}
            </section>

            <section className="flex flex-wrap items-center gap-3 pt-2">
              <Link to={startUrl}>
                <Button className="h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 px-6 text-base">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Realizar meu teste
                </Button>
              </Link>
              <Link to={createPageUrl('Home')}>
                <Button variant="outline" className="h-12 rounded-2xl px-6">
                  Voltar para o site
                </Button>
              </Link>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

