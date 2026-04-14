import { ArrowRight, BrainCircuit, CheckCircle2, Crown, ShieldCheck, Sparkles, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import SynapsysSiteShell from '@/modules/synapsys/components/SynapsysSiteShell';
import {
  buildSynapsysAppPath,
  buildSynapsysSignupPath,
  buildSynapsysSubscribePath,
} from '@/modules/synapsys/routes';
import {
  SYNAPSYS_FREE_DAILY_LIMIT,
  SYNAPSYS_PREMIUM_PRICE_INTRO,
  SYNAPSYS_PREMIUM_PRICE_RENEWAL,
} from '@/modules/synapsys/runtime';
import { persistSynapsysIntent, resolveSynapsysTier } from '@/modules/synapsys/session';

const PREMIUM_BULLETS = Object.freeze([
  'Acesso à experiência premium completa',
  'Chat neural avançado com interface imersiva',
  'Modos cognitivos especializados',
  'Respostas mais profundas, estratégicas e refinadas',
  'Histórico e contexto de uso mais inteligente',
  'Prioridade na evolução dos recursos da plataforma',
]);

const FREE_BULLETS = Object.freeze([
  `Cadastro obrigatório com ${SYNAPSYS_FREE_DAILY_LIMIT} mensagens diárias`,
  'Mesma base visual neural da experiência principal',
  'Paywall elegante com upgrade preparado para rewarded ad',
  'Perfeito para conhecer o ecossistema antes de assinar',
]);

function PlanCard({ eyebrow, title, price, description, bullets, accent = 'cyan', cta, secondaryCta = null, highlight = false }) {
  const accentClass =
    accent === 'amber'
      ? 'from-amber-300/20 via-orange-400/12 to-transparent'
      : 'from-cyan-300/18 via-sky-400/12 to-transparent';

  return (
    <section
      className={`relative overflow-hidden rounded-[32px] border p-6 shadow-[0_25px_90px_rgba(4,10,22,0.28)] backdrop-blur-xl sm:p-7 ${
        highlight
          ? 'border-amber-300/18 bg-[#08111f]'
          : 'border-white/10 bg-white/[0.04]'
      }`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${accentClass}`} />

      <div className="relative z-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/56">{eyebrow}</p>
        <h2 className="mt-4 text-3xl font-semibold text-white">{title}</h2>
        <p className="mt-3 text-base leading-8 text-white/68">{description}</p>
        <div className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.05] px-5 py-4">
          <p className="text-3xl font-semibold text-white">{price}</p>
        </div>

        <div className="mt-6 space-y-3">
          {bullets.map((bullet) => (
            <div
              key={bullet}
              className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/74"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-100" />
              <span>{bullet}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <Link to={cta.to} onClick={cta.onClick}>
            <Button className="h-12 w-full rounded-full bg-white text-slate-950 hover:bg-cyan-50">
              {cta.label}
            </Button>
          </Link>
          {secondaryCta ? (
            <Link to={secondaryCta.to} onClick={secondaryCta.onClick}>
              <Button
                variant="ghost"
                className="h-12 w-full rounded-full border border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              >
                {secondaryCta.label}
              </Button>
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function SynapsysPricingPage() {
  const { isAuthenticated, access } = useAuth();
  const tier = resolveSynapsysTier(access);
  const isPremium = tier === 'premium';

  const premiumPrimaryCta = isPremium
    ? {
        label: 'Abrir chat premium',
        to: buildSynapsysAppPath({ plan: 'premium' }),
        onClick: () => persistSynapsysIntent('premium'),
      }
    : isAuthenticated
      ? {
          label: 'Quero garantir o valor promocional',
          to: buildSynapsysSubscribePath({
            returnTo: buildSynapsysAppPath({ plan: 'premium' }),
          }),
          onClick: () => persistSynapsysIntent('premium'),
        }
      : {
          label: 'Quero garantir o valor promocional',
          to: buildSynapsysSignupPath({
            intent: 'premium',
            next: buildSynapsysSubscribePath({
              returnTo: buildSynapsysAppPath({ plan: 'premium' }),
            }),
          }),
          onClick: () => persistSynapsysIntent('premium'),
        };

  return (
    <SynapsysSiteShell>
      <section className="rounded-[36px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_40px_120px_rgba(2,8,24,0.34)] backdrop-blur-xl sm:p-8 lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/18 bg-amber-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-amber-100/84">
              <Star className="h-4 w-4" />
              Oferta especial de lançamento
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
              Entre agora na versão premium da Synapsys AI com condição especial de lançamento.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/70">
              Use no primeiro mês por {SYNAPSYS_PREMIUM_PRICE_INTRO} e experimente a interface neural completa,
              respostas mais avançadas, maior profundidade analítica e uma inteligência realmente feita para pensar com você.
            </p>

            <div className="mt-8 rounded-[30px] border border-amber-300/16 bg-amber-300/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/80">Bloco de urgência</p>
              <p className="mt-3 text-base leading-8 text-white/74">
                Essa condição especial de {SYNAPSYS_PREMIUM_PRICE_INTRO} no primeiro mês é válida por tempo limitado.
                Depois do período promocional, o valor da assinatura passa para {SYNAPSYS_PREMIUM_PRICE_RENEWAL}/mês.
              </p>
              <p className="mt-4 text-sm font-medium text-amber-100/74">
                Oferta de lançamento • {SYNAPSYS_PREMIUM_PRICE_INTRO} no 1º mês • depois {SYNAPSYS_PREMIUM_PRICE_RENEWAL}/mês
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: BrainCircuit,
                title: 'Inteligência viva',
                text: 'A página final de conversa opera com fundo neural, nódulos, pulsos e sensação de mente em atividade.',
              },
              {
                icon: Crown,
                title: 'Camada premium',
                text: 'A versão completa amplia contexto, profundidade e liberdade de uso sem empurrar o usuário para o painel interno.',
              },
              {
                icon: ShieldCheck,
                title: 'Fluxo próprio',
                text: 'Aquisição, cadastro e uso acontecem dentro da Synapsys, com rotas próprias e CTA consistentes.',
              },
              {
                icon: Sparkles,
                title: 'SaaS independente',
                text: 'O produto passa a parecer uma plataforma própria, não uma funcionalidade improvisada dentro do InsightDISC.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.07] text-cyan-100">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/66">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <PlanCard
          eyebrow="Começo livre"
          title="Começar grátis"
          price={`${SYNAPSYS_FREE_DAILY_LIMIT} mensagens por dia`}
          description="A entrada gratuita mantém a identidade da Synapsys viva e elegante, mas com limites claros de uso e gatilho de upgrade preparado."
          bullets={FREE_BULLETS}
          cta={{
            label: 'Começar grátis com acesso limitado',
            to: buildSynapsysSignupPath({
              intent: 'free',
              next: buildSynapsysAppPath({ plan: 'free' }),
            }),
            onClick: () => persistSynapsysIntent('free'),
          }}
          secondaryCta={{
            label: 'Ir para a landing de entrada',
            to: '/chat/entry',
            onClick: null,
          }}
        />

        <PlanCard
          eyebrow="Versão completa"
          title="Synapsys AI Premium"
          price={`${SYNAPSYS_PREMIUM_PRICE_INTRO} no 1º mês`}
          description={`Depois, sua assinatura segue por ${SYNAPSYS_PREMIUM_PRICE_RENEWAL}/mês, com acesso contínuo à inteligência premium, modos avançados, respostas profundas e uma experiência muito além de um chat comum.`}
          bullets={PREMIUM_BULLETS}
          accent="amber"
          highlight
          cta={premiumPrimaryCta}
          secondaryCta={{
            label: 'Começar grátis com acesso limitado',
            to: buildSynapsysSignupPath({
              intent: 'free',
              next: buildSynapsysAppPath({ plan: 'free' }),
            }),
            onClick: () => persistSynapsysIntent('free'),
          }}
        />
      </section>

      <section className="mt-10 rounded-[34px] border border-white/10 bg-[#060d18]/84 p-6 shadow-[0_25px_80px_rgba(2,8,24,0.28)] backdrop-blur-2xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100/62">
              Âncora de valor
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-white">
              Se você quer usar a Synapsys do jeito que ela realmente foi pensada para funcionar, essa é a porta de entrada.
            </h2>
            <p className="mt-4 text-base leading-8 text-white/68">
              Desbloquear agora a condição de lançamento encurta a distância entre curiosidade e uso real: você entra na camada premium, entende a proposta completa e continua com uma inteligência feita para análise, estratégia e profundidade.
            </p>
          </div>

          <Link to={premiumPrimaryCta.to} onClick={premiumPrimaryCta.onClick}>
            <Button className="h-14 rounded-full bg-white px-7 text-slate-950 hover:bg-cyan-50">
              {premiumPrimaryCta.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </SynapsysSiteShell>
  );
}
