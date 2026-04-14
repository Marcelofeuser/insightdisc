import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowUp,
  BrainCircuit,
  Clock3,
  History,
  Layers3,
  Radar,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UpgradePrompt } from '@/modules/billing';
import {
  clearSynapsysHistory,
  readSynapsysHistory,
  writeSynapsysHistory,
} from '@/modules/synapsys/session';

const BRAND_FONT = {
  fontFamily: '"Space Grotesk", "Plus Jakarta Sans", "Manrope", sans-serif',
};

const BODY_FONT = {
  fontFamily: '"Manrope", "Plus Jakarta Sans", sans-serif',
};

const MODE_OPTIONS = [
  {
    id: 'neural-core',
    label: 'Neural Core',
    apiMode: 'builder',
    description: 'Sintetiza sinais, organiza ideias e devolve clareza acionável.',
    accent: 'from-cyan-400/25 via-sky-500/15 to-transparent',
    detail: 'Ideal para estruturar raciocínio, resposta e próximos passos.',
    prompts: [
      'Mapeie as principais hipóteses por trás deste cenário.',
      'Transforme este briefing em um plano de ação de alta nitidez.',
      'Conecte os dados abaixo e aponte padrões de decisão.',
    ],
  },
  {
    id: 'signal-architect',
    label: 'Signal Architect',
    apiMode: 'architect',
    description: 'Projeta estratégia, arquitetura de decisão e cenários futuros.',
    accent: 'from-fuchsia-500/25 via-violet-500/15 to-transparent',
    detail: 'Melhor para decisões complexas, produto, posicionamento e narrativa.',
    prompts: [
      'Monte uma estratégia premium com riscos, trade-offs e alavancas.',
      'Crie uma resposta executiva com visão sistêmica e priorização.',
      'Modele um plano em fases com critérios claros de avanço.',
    ],
  },
  {
    id: 'pattern-orbit',
    label: 'Pattern Orbit',
    apiMode: 'builder',
    description: 'Lê sinais latentes, compara contextos e destaca fricções escondidas.',
    accent: 'from-emerald-400/25 via-cyan-500/10 to-transparent',
    detail: 'Excelente para análise de padrões, comportamento e leitura contextual.',
    prompts: [
      'Quais tensões invisíveis aparecem neste contexto?',
      'Compare estes sinais e identifique convergências relevantes.',
      'Detecte riscos silenciosos e oportunidades ainda subutilizadas.',
    ],
  },
  {
    id: 'executive-pulse',
    label: 'Executive Pulse',
    apiMode: 'architect',
    description: 'Entrega decisões prontas para liderança com linguagem direta e refinada.',
    accent: 'from-amber-300/20 via-orange-500/10 to-transparent',
    detail: 'Pensado para comunicação com sócios, líderes e clientes premium.',
    prompts: [
      'Converta este conteúdo em uma resposta de alto nível para diretoria.',
      'Resuma os sinais-chave com tom executivo e assertivo.',
      'Organize uma recomendação premium em até 5 movimentos.',
    ],
  },
];

const INITIAL_MESSAGES = [
  {
    id: 'synapsys-intro',
    role: 'assistant',
    title: 'Núcleo sináptico online',
    content:
      'Sou a Synapsys AI. Traga uma pergunta, um contexto ou um volume de sinais para eu conectar dados, ativar padrões e devolver uma resposta com densidade estratégica.',
    timestampLabel: 'agora',
  },
];

const NEURAL_NODES = [
  { id: 'n1', left: '10%', top: '14%', size: 280, color: 'rgba(39, 214, 255, 0.22)' },
  { id: 'n2', left: '32%', top: '24%', size: 210, color: 'rgba(117, 81, 255, 0.20)' },
  { id: 'n3', left: '72%', top: '12%', size: 300, color: 'rgba(130, 86, 255, 0.22)' },
  { id: 'n4', left: '86%', top: '38%', size: 240, color: 'rgba(44, 198, 255, 0.18)' },
  { id: 'n5', left: '18%', top: '68%', size: 320, color: 'rgba(62, 121, 255, 0.16)' },
  { id: 'n6', left: '52%', top: '56%', size: 240, color: 'rgba(159, 89, 255, 0.18)' },
  { id: 'n7', left: '74%', top: '74%', size: 310, color: 'rgba(16, 182, 255, 0.18)' },
];

const NEURAL_CONNECTIONS = [
  { id: 'c1', path: 'M 120 160 C 250 120, 320 160, 410 220', delay: '0s' },
  { id: 'c2', path: 'M 420 220 C 590 250, 660 160, 860 145', delay: '1.4s' },
  { id: 'c3', path: 'M 870 150 C 1040 140, 1120 220, 1220 320', delay: '2.8s' },
  { id: 'c4', path: 'M 430 250 C 500 360, 570 420, 650 530', delay: '0.8s' },
  { id: 'c5', path: 'M 650 530 C 780 520, 920 560, 1030 690', delay: '2.1s' },
  { id: 'c6', path: 'M 190 650 C 340 640, 470 605, 640 540', delay: '1.1s' },
  { id: 'c7', path: 'M 210 640 C 150 470, 145 350, 120 180', delay: '3.5s' },
  { id: 'c8', path: 'M 645 535 C 720 420, 845 390, 1220 320', delay: '1.8s' },
  { id: 'c9', path: 'M 870 150 C 760 290, 720 385, 650 530', delay: '0.4s' },
];

const BACKGROUND_PARTICLES = [
  { id: 'p1', left: '12%', top: '22%', size: 4, delay: 0.3 },
  { id: 'p2', left: '24%', top: '54%', size: 3, delay: 1.1 },
  { id: 'p3', left: '39%', top: '16%', size: 5, delay: 2.6 },
  { id: 'p4', left: '48%', top: '64%', size: 4, delay: 0.8 },
  { id: 'p5', left: '56%', top: '32%', size: 2, delay: 1.9 },
  { id: 'p6', left: '68%', top: '22%', size: 3, delay: 2.2 },
  { id: 'p7', left: '79%', top: '56%', size: 4, delay: 0.5 },
  { id: 'p8', left: '90%', top: '18%', size: 5, delay: 1.5 },
  { id: 'p9', left: '82%', top: '76%', size: 3, delay: 2.9 },
  { id: 'p10', left: '64%', top: '82%', size: 2, delay: 1.2 },
  { id: 'p11', left: '44%', top: '84%', size: 4, delay: 2.4 },
  { id: 'p12', left: '20%', top: '82%', size: 3, delay: 0.9 },
];

function normalizeTier(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'premium') return 'premium';
  if (normalized === 'free') return 'free';
  return 'locked';
}

function createMessage(role, content, extras = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role,
    content: String(content || '').trim(),
    timestampLabel: formatClockLabel(),
    ...extras,
  };
}

function formatClockLabel(date = new Date()) {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function trimText(value, maxLength = 84) {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

function NeuralBackdrop({ activityLevel }) {
  const highlightedConnections = Math.min(
    NEURAL_CONNECTIONS.length,
    Math.max(3, activityLevel + 2),
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 15% 20%, rgba(72, 212, 255, 0.24), transparent 22%), radial-gradient(circle at 82% 16%, rgba(129, 74, 255, 0.28), transparent 24%), radial-gradient(circle at 58% 78%, rgba(0, 144, 255, 0.2), transparent 25%), linear-gradient(160deg, #02040a 0%, #040816 46%, #050814 100%)',
        }}
      />

      {NEURAL_NODES.map((node, index) => (
        <motion.div
          key={node.id}
          className="absolute rounded-full"
          style={{
            left: node.left,
            top: node.top,
            width: node.size,
            height: node.size,
            background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.42), ${node.color} 44%, rgba(4, 6, 12, 0) 76%)`,
            transform: 'translate(-50%, -50%)',
            filter: 'blur(2px)',
          }}
          animate={{
            scale: [1, 1.05 + (index % 3) * 0.01, 1],
            opacity: [0.74, 1, 0.76],
          }}
          transition={{
            duration: 9 + index,
            repeat: Infinity,
            repeatType: 'mirror',
            ease: 'easeInOut',
            delay: index * 0.45,
          }}
        >
          <motion.div
            className="absolute inset-[16%] rounded-full border border-white/10"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 42%, rgba(255,255,255,0) 72%)',
              boxShadow: '0 0 60px rgba(77, 203, 255, 0.14), inset 0 0 24px rgba(255,255,255,0.12)',
            }}
            animate={{
              opacity: [0.24, 0.5, 0.24],
            }}
            transition={{
              duration: 6 + index,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        </motion.div>
      ))}

      <svg
        className="absolute inset-0 h-full w-full opacity-90"
        viewBox="0 0 1400 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="synapsys-stroke" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(67, 230, 255, 0.1)" />
            <stop offset="50%" stopColor="rgba(182, 102, 255, 0.92)" />
            <stop offset="100%" stopColor="rgba(90, 182, 255, 0.14)" />
          </linearGradient>
          <linearGradient id="synapsys-pulse" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#8af3ff" />
            <stop offset="45%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#8f7bff" />
          </linearGradient>
          <filter id="synapsys-glow">
            <feGaussianBlur stdDeviation="7" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {NEURAL_CONNECTIONS.map((connection, index) => {
          const isHighlighted = index < highlightedConnections;
          return (
            <g key={connection.id}>
              <path
                d={connection.path}
                fill="none"
                stroke="rgba(116, 177, 255, 0.08)"
                strokeWidth="8"
                strokeLinecap="round"
                filter="url(#synapsys-glow)"
              />
              <motion.path
                d={connection.path}
                fill="none"
                stroke="url(#synapsys-stroke)"
                strokeWidth={isHighlighted ? 2.1 : 1.15}
                strokeLinecap="round"
                strokeDasharray={isHighlighted ? '8 18' : '6 24'}
                animate={{
                  opacity: isHighlighted ? [0.4, 0.92, 0.46] : [0.1, 0.26, 0.12],
                  strokeDashoffset: isHighlighted ? [0, -150, -300] : [0, -60, -120],
                }}
                transition={{
                  duration: isHighlighted ? 11 - Math.min(activityLevel, 5) * 0.8 : 16,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              {isHighlighted ? (
                <>
                  <circle r="4" fill="url(#synapsys-pulse)" filter="url(#synapsys-glow)">
                    <animateMotion
                      dur={`${9.5 - Math.min(activityLevel, 6) * 0.6}s`}
                      repeatCount="indefinite"
                      path={connection.path}
                      begin={connection.delay}
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;0.3;1;0"
                      dur="3.8s"
                      repeatCount="indefinite"
                      begin={connection.delay}
                    />
                  </circle>
                  <circle r="2.4" fill="#dffcff">
                    <animateMotion
                      dur={`${14 - Math.min(activityLevel, 5)}s`}
                      repeatCount="indefinite"
                      path={connection.path}
                      begin={`${parseFloat(connection.delay) + 2.2}s`}
                    />
                    <animate
                      attributeName="opacity"
                      values="0;0.7;0"
                      dur="4.6s"
                      repeatCount="indefinite"
                      begin={`${parseFloat(connection.delay) + 2.2}s`}
                    />
                  </circle>
                </>
              ) : null}
            </g>
          );
        })}
      </svg>

      {BACKGROUND_PARTICLES.map((particle, index) => (
        <motion.span
          key={particle.id}
          className="absolute rounded-full bg-cyan-100/80"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            boxShadow: '0 0 16px rgba(128, 236, 255, 0.55)',
          }}
          animate={{
            opacity: [0.12, 0.85, 0.22],
            scale: [0.7, 1.35, 0.8],
            y: [0, -10, 0],
          }}
          transition={{
            duration: 5 + (index % 4),
            repeat: Infinity,
            ease: 'easeInOut',
            delay: particle.delay,
          }}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#02040a] via-[#02040acc] to-transparent" />
      <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-[#02040a] to-transparent" />
      <div className="absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-[#02040a] to-transparent" />
    </div>
  );
}

function MessageBubble({ message }) {
  const isAssistant = message.role === 'assistant';

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`max-w-[88%] rounded-[28px] border px-5 py-4 shadow-[0_18px_50px_rgba(1,7,18,0.28)] backdrop-blur-xl md:max-w-[78%] ${
          isAssistant
            ? 'border-white/12 bg-white/[0.07] text-white'
            : 'border-cyan-300/25 bg-[linear-gradient(135deg,rgba(18,194,233,0.30),rgba(99,102,241,0.32),rgba(168,85,247,0.28))] text-white'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-8 w-8 items-center justify-center rounded-2xl ${
                isAssistant
                  ? 'border border-cyan-300/20 bg-cyan-300/10 text-cyan-100'
                  : 'border border-white/10 bg-white/10 text-white'
              }`}
            >
              {isAssistant ? <BrainCircuit className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55" style={BRAND_FONT}>
                {message.title || (isAssistant ? 'Synapsys AI' : 'Operador')}
              </p>
              <p className="text-xs text-white/40">{message.timestampLabel}</p>
            </div>
          </div>
          {message.isError ? (
            <span className="rounded-full border border-rose-400/25 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-100">
              oscilações detectadas
            </span>
          ) : null}
        </div>

        <div className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-white/88" style={BODY_FONT}>
          {message.content}
        </div>
      </div>
    </motion.article>
  );
}

function TypingBubble() {
  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex justify-start"
    >
      <div className="max-w-[78%] rounded-[28px] border border-white/12 bg-white/[0.07] px-5 py-4 text-white shadow-[0_18px_50px_rgba(1,7,18,0.28)] backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
            <BrainCircuit className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55" style={BRAND_FONT}>
              Synapsys ativa
            </p>
            <p className="text-xs text-white/40">processando conexões</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="h-2.5 w-2.5 rounded-full bg-cyan-100"
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [0.86, 1.18, 0.86],
              }}
              transition={{
                duration: 1.3,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: index * 0.16,
              }}
            />
          ))}
        </div>
      </div>
    </motion.article>
  );
}

function SidebarBlock({ icon: Icon, eyebrow, title, children, accentClass = '' }) {
  return (
    <section className={`rounded-[26px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl ${accentClass}`}>
      <div className="flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-cyan-100">
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/40" style={BRAND_FONT}>
            {eyebrow}
          </p>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function LockedSynapsysView({ activityLevel }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 sm:py-6">
      <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#040811] shadow-[0_35px_120px_rgba(3,8,18,0.55)]">
        <NeuralBackdrop activityLevel={activityLevel} />
        <div className="relative z-10 flex min-h-[720px] flex-col justify-between p-5 sm:p-7 lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/10 bg-white/10 text-cyan-100 shadow-[0_0_45px_rgba(42,214,255,0.18)]">
                <BrainCircuit className="h-7 w-7" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-100/65" style={BRAND_FONT}>
                  Synapsys AI
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl" style={BRAND_FONT}>
                  Câmara cognitiva premium
                </h2>
              </div>
            </div>
            <div className="rounded-full border border-amber-300/20 bg-amber-200/10 px-4 py-2 text-xs font-medium text-amber-100">
              camada neural bloqueada
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-3xl flex-1 items-center py-8">
            <div className="w-full rounded-[32px] border border-white/12 bg-[#07101dcc] p-6 shadow-[0_30px_90px_rgba(4,9,19,0.55)] backdrop-blur-2xl sm:p-8">
              <p className="inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-100/85">
                acesso protegido
              </p>
              <h3 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl" style={BRAND_FONT}>
                Uma mente artificial viva pronta para operar o seu contexto.
              </h3>
              <p className="mt-4 max-w-2xl text-base leading-8 text-white/72" style={BODY_FONT}>
                A Synapsys combina malha neural visual, contexto conversacional e respostas com acabamento
                executivo. Para ativar essa experiência, libere o plano com acesso ao ecossistema premium de IA.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  'Conversa imersiva com modos cognitivos',
                  'Ativação visual de sinapses a cada mensagem',
                  'Leitura premium com brilho, profundidade e fluxo',
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/72"
                  >
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <UpgradePrompt
                  title="Synapsys AI disponível em plano com recursos premium"
                  description="Faça upgrade para liberar a interface completa de chat neural, modos avançados e respostas cognitivas da Synapsys."
                  requiredPlanLabel="Insider ou superior"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function UsagePanel({ tier, usageState, onUpgradeRequest }) {
  const isPremium = tier === 'premium';
  const remainingText = isPremium
    ? 'Uso ilimitado e histórico completo'
    : `${usageState?.remaining ?? 0} de ${usageState?.limit ?? 0} mensagens livres restantes hoje`;

  return (
    <SidebarBlock
      icon={Zap}
      eyebrow="Acesso"
      title={isPremium ? 'Camada premium liberada' : 'Camada gratuita ativa'}
    >
      <div className="space-y-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-white/40">
            {isPremium ? 'Premium' : 'Grátis'}
          </p>
          <p className="mt-2 text-sm leading-6 text-white/78">{remainingText}</p>
        </div>

        {!isPremium ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Upgrade sugerido</p>
            <p className="mt-2 text-sm leading-6 text-white/72">
              Libere profundidade maior, modos completos, contexto persistente e uma jornada sem limite diário.
            </p>
            {typeof onUpgradeRequest === 'function' ? (
              <Button
                type="button"
                className="mt-3 w-full rounded-2xl bg-white text-slate-950 hover:bg-cyan-50"
                onClick={onUpgradeRequest}
              >
                Ir para oferta premium
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </SidebarBlock>
  );
}

export default function SynapsysChatExperience({
  tier = 'locked',
  planLabel = '',
  storageKey = '',
  historyLimit = 80,
  usageState = null,
  onConsumeMessage = null,
  onUpgradeRequest = null,
  onRewardedUnlock = null,
  rewardedReady = false,
  analyze = null,
}) {
  const effectiveTier = normalizeTier(tier);
  const [selectedModeId, setSelectedModeId] = useState(MODE_OPTIONS[0].id);
  const [messages, setMessages] = useState(() =>
    readSynapsysHistory(storageKey, INITIAL_MESSAGES),
  );
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [statusLabel, setStatusLabel] = useState('Malha neural estabilizada');
  const [lastLatencyMs, setLastLatencyMs] = useState(null);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const scrollAnchorRef = useRef(null);
  const textareaRef = useRef(null);

  const selectedMode =
    MODE_OPTIONS.find((mode) => mode.id === selectedModeId) || MODE_OPTIONS[0];
  const userMessages = messages.filter((message) => message.role === 'user');
  const activationLevel = Math.min(
    NEURAL_CONNECTIONS.length,
    3 + userMessages.length * 2 + (isSending ? 2 : 0),
  );
  const recentHistory = userMessages.slice(-4).reverse();
  const allowRewardedFlow = Boolean(rewardedReady);

  useEffect(() => {
    setMessages(readSynapsysHistory(storageKey, INITIAL_MESSAGES));
  }, [storageKey]);

  useEffect(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, isSending]);

  useEffect(() => {
    if (!storageKey) return;
    writeSynapsysHistory(storageKey, messages, historyLimit);
  }, [storageKey, messages, historyLimit]);

  const submitPrompt = async (promptText) => {
    const content = String(promptText || '').trim();
    if (!content || isSending) return;

    if (effectiveTier === 'free') {
      const remaining = Number(usageState?.remaining ?? 0);
      if (remaining <= 0) {
        setLimitDialogOpen(true);
        setStatusLabel('Limite diário atingido');
        return;
      }

      if (typeof onConsumeMessage === 'function') {
        const consumption = onConsumeMessage();
        if (!consumption?.allowed) {
          setLimitDialogOpen(true);
          setStatusLabel('Limite diário atingido');
          return;
        }
      }
    }

    const userMessage = createMessage('user', content, {
      title: 'Operador',
    });

    setMessages((current) => [...current, userMessage]);
    setDraft('');
    setIsSending(true);
    setStatusLabel(`Ativando ${selectedMode.label}`);

    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();

    try {
      if (typeof analyze !== 'function') {
        throw new Error('Synapsys sem conexão de análise neste contexto.');
      }

      const payload = await analyze({
        input: content,
        mode: selectedMode.apiMode,
      });

      const finishedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      setLastLatencyMs(Math.max(120, Math.round(finishedAt - startedAt)));
      setMessages((current) => [
        ...current,
        createMessage('assistant', payload.response, {
          title: `${selectedMode.label} · Synapsys`,
          provider: payload.provider,
        }),
      ]);
      setStatusLabel('Novas sinapses consolidadas');
    } catch (error) {
      const fallbackMessage =
        error instanceof Error && error.message
          ? error.message
          : 'A Synapsys sofreu uma oscilação e não conseguiu fechar a resposta agora.';

      setMessages((current) => [
        ...current,
        createMessage('assistant', fallbackMessage, {
          title: 'Synapsys · Resiliência',
          isError: true,
        }),
      ]);
      setStatusLabel('Oscilação detectada, canal preservado');
    } finally {
      setIsSending(false);
      window.setTimeout(() => {
        textareaRef.current?.focus();
      }, 60);
    }
  };

  if (effectiveTier === 'locked') {
    return <LockedSynapsysView activityLevel={activationLevel || 3} />;
  }

  return (
    <>
      <div className="mx-auto w-full max-w-7xl px-0 py-0">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[#040811] shadow-[0_35px_120px_rgba(3,8,18,0.55)]">
          <NeuralBackdrop activityLevel={activationLevel} />

          <div className="relative z-10 flex min-h-[calc(100vh-12.5rem)] flex-col">
            <div className="border-b border-white/10 bg-[linear-gradient(180deg,rgba(6,11,23,0.86),rgba(6,11,23,0.54))] px-4 py-5 backdrop-blur-2xl sm:px-6 lg:px-7">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-4">
                  <motion.div
                    className="relative flex h-14 w-14 items-center justify-center rounded-[22px] border border-white/10 bg-white/10 text-cyan-100 shadow-[0_0_45px_rgba(42,214,255,0.18)]"
                    animate={{
                      boxShadow: [
                        '0 0 25px rgba(42,214,255,0.12)',
                        '0 0 46px rgba(129,92,255,0.22)',
                        '0 0 25px rgba(42,214,255,0.12)',
                      ],
                    }}
                    transition={{
                      duration: 5.6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    <BrainCircuit className="h-7 w-7" />
                    <span className="absolute inset-0 rounded-[22px] border border-cyan-300/10" />
                  </motion.div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-cyan-100/65" style={BRAND_FONT}>
                      Synapsys AI
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-semibold text-white sm:text-3xl" style={BRAND_FONT}>
                        Mente artificial em atividade contínua
                      </h2>
                      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-medium text-emerald-100">
                        <span className="relative inline-flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/70" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-200" />
                        </span>
                        Synapsys ativa
                      </span>
                    </div>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-white/66" style={BODY_FONT}>
                      Cada mensagem energiza a malha neural, ativa núcleos cognitivos e reorganiza o campo de decisão
                      em tempo real.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      label: 'Sinapses em fluxo',
                      value: `${Math.max(12, activationLevel * 9)}`,
                      icon: Activity,
                    },
                    {
                      label: 'Latência neural',
                      value: lastLatencyMs ? `${lastLatencyMs} ms` : 'standby',
                      icon: Clock3,
                    },
                    {
                      label: 'Modo cognitivo',
                      value: selectedMode.label,
                      icon: Radar,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[24px] border border-white/10 bg-white/[0.06] px-4 py-3 shadow-[0_16px_45px_rgba(0,0,0,0.14)] backdrop-blur-xl"
                    >
                      <div className="flex items-center gap-2 text-white/50">
                        <item.icon className="h-4 w-4" />
                        <span className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={BRAND_FONT}>
                          {item.label}
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-semibold text-white" style={BRAND_FONT}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid flex-1 gap-4 p-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:p-5">
              <aside className="space-y-4">
                <SidebarBlock icon={Layers3} eyebrow="Modos" title="Arquiteturas Synapsys">
                  <div className="space-y-3">
                    {MODE_OPTIONS.map((mode) => {
                      const isActive = selectedModeId === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setSelectedModeId(mode.id)}
                          className={`group relative w-full overflow-hidden rounded-[24px] border p-4 text-left transition ${
                            isActive
                              ? 'border-cyan-300/30 bg-white/[0.12] shadow-[0_18px_44px_rgba(41,208,255,0.12)]'
                              : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.08]'
                          }`}
                        >
                          <div className={`absolute inset-0 rounded-[24px] bg-gradient-to-br ${mode.accent} opacity-60`} />
                          <div className="relative">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-white" style={BRAND_FONT}>
                                  {mode.label}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">
                                  {mode.apiMode}
                                </p>
                              </div>
                              {isActive ? (
                                <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
                                  ativo
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-3 text-sm leading-6 text-white/70" style={BODY_FONT}>
                              {mode.description}
                            </p>
                            <p className="mt-2 text-xs leading-5 text-white/42">{mode.detail}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </SidebarBlock>

                {effectiveTier !== 'locked' ? (
                  <UsagePanel
                    tier={effectiveTier}
                    usageState={usageState}
                    onUpgradeRequest={onUpgradeRequest}
                  />
                ) : null}

                <SidebarBlock icon={History} eyebrow="Memória" title="Ativações recentes">
                  <div className="space-y-3">
                    {recentHistory.length ? (
                      recentHistory.map((item, index) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">
                              fluxo {recentHistory.length - index}
                            </p>
                            <p className="text-xs text-white/38">{item.timestampLabel}</p>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-white/72" style={BODY_FONT}>
                            {trimText(item.content)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.03] px-4 py-5 text-sm leading-6 text-white/52">
                        As memórias da sessão aparecem aqui conforme você ativa novas conversas.
                      </div>
                    )}
                  </div>
                </SidebarBlock>

                <SidebarBlock icon={ShieldCheck} eyebrow="Status" title="Saúde do sistema">
                  <div className="grid gap-3">
                    {[
                      {
                        label: 'Campo neural',
                        value: statusLabel,
                        icon: Zap,
                      },
                      {
                        label: 'Camada contextual',
                        value: `${messages.length - 1} ${messages.length - 1 === 1 ? 'sinal processado' : 'sinais processados'}`,
                        icon: Activity,
                      },
                      {
                        label: 'Integridade',
                        value: 'Estável e pronta para novas conexões',
                        icon: ShieldCheck,
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                      >
                        <div className="flex items-center gap-2 text-white/46">
                          <item.icon className="h-4 w-4" />
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em]">{item.label}</p>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-white/76">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </SidebarBlock>
              </aside>

              <div
                className="relative flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.24)] backdrop-blur-2xl"
                style={{
                  background:
                    'linear-gradient(180deg, rgba(9, 16, 30, 0.78), rgba(7, 12, 24, 0.58)), radial-gradient(circle at 82% 20%, rgba(55, 220, 255, 0.16), transparent 22%), radial-gradient(circle at 18% 76%, rgba(145, 92, 255, 0.18), transparent 24%)',
                }}
              >
                <div className="pointer-events-none absolute inset-0 opacity-80">
                  <div className="absolute left-[10%] top-[12%] h-40 w-40 rounded-full bg-cyan-300/10 blur-3xl" />
                  <div className="absolute right-[12%] top-[18%] h-52 w-52 rounded-full bg-violet-400/10 blur-3xl" />
                  <div className="absolute bottom-[18%] left-[32%] h-56 w-56 rounded-full bg-sky-400/10 blur-3xl" />
                </div>

                <div className="relative z-10 border-b border-white/10 px-4 py-4 sm:px-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-cyan-100/56" style={BRAND_FONT}>
                        Conversa neural
                      </p>
                      <h3 className="mt-1 text-xl font-semibold text-white" style={BRAND_FONT}>
                        Chat {effectiveTier === 'premium' ? 'premium' : 'grátis'} da Synapsys
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-white/56">
                        O pano de fundo reage à conversa e amplia a malha sináptica conforme você avança.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/65">
                        Plano atual: {planLabel || effectiveTier}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setMessages(INITIAL_MESSAGES);
                          setDraft('');
                          setLastLatencyMs(null);
                          setStatusLabel('Malha neural reinicializada');
                          if (storageKey) {
                            clearSynapsysHistory(storageKey);
                          }
                        }}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/75 transition hover:border-white/20 hover:bg-white/[0.09]"
                      >
                        <RefreshCcw className="h-3.5 w-3.5" />
                        Reiniciar sessão
                      </button>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 flex min-h-0 flex-1 flex-col">
                  <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
                    <div className="space-y-4">
                      <AnimatePresence initial={false}>
                        {messages.map((message) => (
                          <MessageBubble key={message.id} message={message} />
                        ))}
                        {isSending ? <TypingBubble key="typing-indicator" /> : null}
                      </AnimatePresence>
                      <div ref={scrollAnchorRef} />
                    </div>
                  </div>

                  <div className="border-t border-white/10 bg-black/10 px-4 py-4 backdrop-blur-2xl sm:px-5">
                    {effectiveTier === 'free' ? (
                      <div className="mb-3 rounded-2xl border border-cyan-300/14 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-100/88">
                        Você está na camada gratuita. Restam <strong>{usageState?.remaining ?? 0}</strong> mensagens livres hoje.
                      </div>
                    ) : null}

                    <div className="mb-3 flex flex-wrap gap-2">
                      {selectedMode.prompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => {
                            setDraft(prompt);
                            textareaRef.current?.focus();
                          }}
                          className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs text-white/68 transition hover:border-cyan-300/25 hover:bg-cyan-300/10 hover:text-cyan-100"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>

                    <form
                      className="rounded-[28px] border border-white/12 bg-white/[0.06] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.16)]"
                      onSubmit={(event) => {
                        event.preventDefault();
                        submitPrompt(draft);
                      }}
                    >
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-white/60">
                            <Sparkles className="h-4 w-4 text-cyan-100" />
                            <span className="text-xs uppercase tracking-[0.2em]" style={BRAND_FONT}>
                              {selectedMode.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-white/45">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            canal contextual protegido
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
                          <textarea
                            ref={textareaRef}
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && !event.shiftKey) {
                                event.preventDefault();
                                submitPrompt(draft);
                              }
                            }}
                            placeholder="Descreva um cenário, uma hipótese ou um desafio. A Synapsys vai abrir novas conexões a partir daqui."
                            className="min-h-[110px] w-full resize-none rounded-[24px] border border-white/10 bg-[#08101c] px-4 py-4 text-sm leading-7 text-white placeholder:text-white/28 focus:border-cyan-300/25 focus:outline-none focus:ring-2 focus:ring-cyan-300/15"
                            style={BODY_FONT}
                          />

                          <button
                            type="submit"
                            disabled={isSending || !draft.trim()}
                            className="group inline-flex h-14 shrink-0 items-center justify-center gap-2 rounded-[22px] border border-cyan-200/20 bg-[linear-gradient(135deg,rgba(18,194,233,0.92),rgba(99,102,241,0.88),rgba(168,85,247,0.86))] px-5 text-sm font-semibold text-white shadow-[0_18px_44px_rgba(69,184,255,0.25)] transition hover:translate-y-[-1px] hover:shadow-[0_24px_56px_rgba(115,111,255,0.28)] disabled:cursor-not-allowed disabled:opacity-45"
                            style={BRAND_FONT}
                          >
                            <span>Ativar resposta</span>
                            <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white/12 transition group-hover:bg-white/18">
                              <ArrowUp className="h-4 w-4" />
                            </span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
        <DialogContent className="border border-white/10 bg-[#08111f] text-white shadow-[0_30px_120px_rgba(2,6,18,0.62)]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold" style={BRAND_FONT}>
              Seu limite diário da camada grátis foi atingido
            </DialogTitle>
            <DialogDescription className="text-sm leading-7 text-white/68" style={BODY_FONT}>
              Faça upgrade para a Synapsys premium e libere respostas profundas, histórico amplo, modos cognitivos completos
              e uso sem teto diário.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-[26px] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100/62">
              porta de entrada premium
            </p>
            <p className="mt-3 text-sm leading-7 text-white/78">
              A experiência completa da Synapsys foi desenhada para conversas mais longas, mais densas e com contexto vivo entre sessões.
            </p>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {typeof onUpgradeRequest === 'function' ? (
              <Button
                type="button"
                className="w-full rounded-2xl bg-white text-slate-950 hover:bg-cyan-50"
                onClick={() => {
                  setLimitDialogOpen(false);
                  onUpgradeRequest();
                }}
              >
                Fazer upgrade agora
              </Button>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              disabled={!allowRewardedFlow}
              className="w-full rounded-2xl border border-white/10 text-white/76 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-45"
              onClick={() => {
                if (allowRewardedFlow && typeof onRewardedUnlock === 'function') {
                  onRewardedUnlock();
                }
                setLimitDialogOpen(false);
              }}
            >
              {allowRewardedFlow
                ? 'Liberar mais 5 mensagens com mídia patrocinada'
                : 'Mídia patrocinada em preparação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
