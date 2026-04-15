import { BrainCircuit, CheckCircle2, Crown, ShieldCheck, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { hasSynapsysAccess, resolveSynapsysTier } from '@/modules/synapsys/access';
import SynapsysSiteShell from '@/modules/synapsys/components/SynapsysSiteShell';
import {
  buildSynapsysAppPath,
  buildSynapsysPricingPath,
  buildSynapsysSignupPath,
} from '@/modules/synapsys/routes';
import {
  SYNAPSYS_FREE_DAILY_LIMIT,
  SYNAPSYS_PREMIUM_PRICE_INTRO,
  SYNAPSYS_PREMIUM_PRICE_RENEWAL,
} from '@/modules/synapsys/runtime';
import { persistSynapsysIntent } from '@/modules/synapsys/session';

const BENEFITS = Object.freeze([
  'Conversa em interface neural proprietária',
  'Modos cognitivos especializados para estratégia, leitura contextual e síntese',
  'Ativação visual de sinapses conforme a conversa avança',
  'Fluxo próprio da Synapsys, sem depender do painel interno do InsightDISC',
]);

const FREE_FEATURES = Object.freeze([
  `Cadastro obrigatório e ${SYNAPSYS_FREE_DAILY_LIMIT} mensagens por dia`,
  'Mesma estética neural da experiência premium',
  'Entrada rápida para testar profundidade, tom e raciocínio',
]);

const PREMIUM_FEATURES = Object.freeze([
  'Uso sem limite diário',
  'Chat neural avançado com interface imersiva',
  'Modos cognitivos especializados',
  'Respostas mais profundas, estratégicas e refinadas',
  'Histórico e contexto de uso mais inteligente',
  'Prioridade na evolução dos recursos da plataforma',
]);

function FeatureList({ items }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item}
          className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/76"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-100" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export default function SynapsysChatEntry() {
  const { isAuthenticated, access } = useAuth();
  const tier = resolveSynapsysTier(access);
  const canUseSynapsys = hasSynapsysAccess(access);
  const freeCtaTarget = canUseSynapsys
    ? buildSynapsysAppPath({ plan: tier === 'premium' ? 'premium' : 'free' })
    : buildSynapsysSignupPath({
      intent: 'free',
      next: buildSynapsysAppPath({ plan: 'free' }),
    });
  const premiumCtaTarget =
    isAuthenticated && tier === 'premium'
      ? buildSynapsysAppPath({ plan: 'premium' })
      : buildSynapsysPricingPath({ plan: 'premium' });

  return (
    <SynapsysSiteShell>
      <section className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_40px_120px_rgba(2,8,24,0.34)] backdrop-blur-xl sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,255,0.12),transparent_34%),radial-gradient(circle_at_78%_20%,rgba(167,85,255,0.12),transparent_28%)]" />

        <div className="relative z-10 grid gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/18 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/84">
              <BrainCircuit className="h-4 w-4" />
              Synapsys AI
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold leading-tight text-white sm:text-5xl lg:text-6xl">
              Converse com uma inteligência viva, treinada para pensar com você.
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/70">
              Use gratuitamente com limite diário ou libere a experiência completa da Synapsys.
              A interface neural reage às suas mensagens, conecta sinais em tempo real e transforma conversa em raciocínio aplicado.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to={freeCtaTarget}
                onClick={() => persistSynapsysIntent('free')}
              >
                <Button className="h-14 rounded-full bg-white px-7 text-base font-semibold text-slate-950 hover:bg-cyan-50">
                  Começar grátis
                </Button>
              </Link>
              <Link
                to={premiumCtaTarget}
                onClick={() => persistSynapsysIntent('premium')}
              >
                <Button
                  variant="ghost"
                  className="h-14 rounded-full border border-white/12 bg-white/[0.04] px-7 text-base font-semibold text-white hover:bg-white/[0.08]"
                >
                  Ver planos
                </Button>
              </Link>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {BENEFITS.map((item) => (
                <div key={item} className="rounded-[24px] border border-white/10 bg-white/[0.04] px-4 py-4 text-sm leading-7 text-white/74">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-[#060d1a]/84 p-6 shadow-[0_25px_80px_rgba(2,8,24,0.34)] backdrop-blur-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-100/62">
              Lançamento
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-white">
              Entre agora na versão premium da Synapsys AI com condição especial de lançamento.
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/72">
              Use no primeiro mês por {SYNAPSYS_PREMIUM_PRICE_INTRO} e experimente a interface neural completa,
              respostas mais avançadas, maior profundidade analítica e uma inteligência realmente feita para pensar com você.
            </p>

            <div className="mt-6 rounded-[26px] border border-amber-300/16 bg-amber-300/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-100/84">
                Oferta de lançamento
              </p>
              <p className="mt-3 text-3xl font-semibold text-white">
                {SYNAPSYS_PREMIUM_PRICE_INTRO}
                <span className="ml-2 text-base font-medium text-white/56">no 1º mês</span>
              </p>
              <p className="mt-2 text-sm text-white/66">
                Depois, {SYNAPSYS_PREMIUM_PRICE_RENEWAL}/mês com acesso contínuo à camada premium.
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Link
                to={premiumCtaTarget}
                onClick={() => persistSynapsysIntent('premium')}
              >
                <Button className="h-12 w-full rounded-full bg-white text-slate-950 hover:bg-cyan-50">
                  Quero garantir o valor promocional
                </Button>
              </Link>
              <Link
                to={freeCtaTarget}
                onClick={() => persistSynapsysIntent('free')}
              >
                <Button
                  variant="ghost"
                  className="h-12 w-full rounded-full border border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                >
                  Começar grátis com acesso limitado
                </Button>
              </Link>
            </div>

            <p className="mt-4 text-center text-xs text-white/45">
              Oferta de lançamento • {SYNAPSYS_PREMIUM_PRICE_INTRO} no 1º mês • depois {SYNAPSYS_PREMIUM_PRICE_RENEWAL}/mês
            </p>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-cyan-300/16 bg-cyan-300/10 text-cyan-100">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100/62">
                Modo grátis
              </p>
              <h3 className="text-xl font-semibold text-white">Entrada com limite diário, sem cortar a experiência visual</h3>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-white/68">
            A porta de entrada foi pensada para sentir a Synapsys funcionando por dentro. Cadastro é obrigatório e o controle diário já fica preparado para futuras extensões como mídia patrocinada.
          </p>
          <div className="mt-5">
            <FeatureList items={FREE_FEATURES} />
          </div>
        </div>

        <div className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-[20px] border border-violet-300/16 bg-violet-300/10 text-violet-100">
              <Crown className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-100/62">
                Modo premium
              </p>
              <h3 className="text-xl font-semibold text-white">A forma como a Synapsys realmente foi pensada para funcionar</h3>
            </div>
          </div>
          <p className="mt-4 text-sm leading-7 text-white/68">
            Destrave agora a Synapsys AI Premium por {SYNAPSYS_PREMIUM_PRICE_INTRO} no primeiro mês. Depois, continue por {SYNAPSYS_PREMIUM_PRICE_RENEWAL}/mês e mantenha acesso à versão mais poderosa da plataforma.
          </p>
          <div className="mt-5">
            <FeatureList items={PREMIUM_FEATURES} />
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-[34px] border border-white/10 bg-[#060d18]/84 p-6 shadow-[0_25px_80px_rgba(2,8,24,0.28)] backdrop-blur-2xl sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100/62">
              Benefícios
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-white">
              Não é só um chat. É uma camada cognitiva com identidade própria.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-white/68">
              Por menos do que muitas ferramentas comuns entregam em produtividade, você acessa uma inteligência premium projetada para análise, estratégia e profundidade real de resposta.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              {
                icon: Sparkles,
                title: 'Núcleos ativos',
                description: 'Fundo vivo com nódulos, sinapses e pulsos suaves reagindo à conversa.',
              },
              {
                icon: Zap,
                title: 'Pensamento aplicado',
                description: 'Respostas estruturadas para contexto, hipótese, decisão e plano de ação.',
              },
              {
                icon: BrainCircuit,
                title: 'Produto próprio',
                description: 'Fluxo de aquisição, cadastro e uso rodando na Synapsys, não no painel interno.',
              },
              {
                icon: Crown,
                title: 'Evolução contínua',
                description: 'Quem entra cedo participa da camada premium que vai concentrar a evolução do produto.',
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[26px] border border-white/10 bg-white/[0.04] p-5">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/10 bg-white/[0.07] text-cyan-100">
                  <item.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/66">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(10,20,35,0.92),rgba(8,14,28,0.78),rgba(26,18,44,0.86))] p-6 shadow-[0_25px_90px_rgba(4,10,22,0.42)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-100/70">
              Fechamento
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-white">
              Se você quer usar a Synapsys do jeito que ela realmente foi pensada para funcionar, essa é a porta de entrada.
            </h2>
            <p className="mt-4 text-base leading-8 text-white/68">
              Essa condição especial de {SYNAPSYS_PREMIUM_PRICE_INTRO} no primeiro mês é válida por tempo limitado. Depois do período promocional, o valor da assinatura passa para {SYNAPSYS_PREMIUM_PRICE_RENEWAL}/mês.
            </p>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-3">
            <Link
              to={premiumCtaTarget}
              onClick={() => persistSynapsysIntent('premium')}
            >
              <Button className="h-14 w-full rounded-full bg-white text-slate-950 hover:bg-cyan-50">
                Quero garantir o valor promocional
              </Button>
            </Link>
            <Link
              to={freeCtaTarget}
              onClick={() => persistSynapsysIntent('free')}
            >
              <Button
                variant="ghost"
                className="h-14 w-full rounded-full border border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              >
                Começar grátis
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </SynapsysSiteShell>
  );
}
