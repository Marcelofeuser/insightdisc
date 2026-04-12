/**
 * PanelFeaturePlaceholder.jsx
 *
 * V3.0: Rota `/painel/:featureSlug` — serve como placeholder inteligente para
 * abas novas ainda não totalmente implementadas E como página de upgrade
 * para features bloqueadas pelo plano.
 *
 * Slugs tratados:
 *   rh-gestao              → RH & Gestão de Pessoas (Corporation+)
 *   usuarios               → Gestão de Usuários (Corporation+)
 *   consultorio            → Consultório & Ferramentas (Diamond)
 *   estrategia-executiva   → Estratégia Executiva (Diamond)
 *   upgrade                → Página de upgrade genérica (?feature=X)
 *   meu-desenvolvimento    → legado V2
 *   historico              → legado V2
 */

import React from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Brain,
  ClipboardList,
  Lock,
  Stethoscope,
  TrendingUp,
  UserCog,
  Users2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ---------------------------------------------------------------------------
// Conteúdo por slug
// ---------------------------------------------------------------------------

const FEATURE_CONTENT = {
  // ── Legado V2 ────────────────────────────────────────────────────────────
  'meu-desenvolvimento': {
    title: 'Meu Desenvolvimento',
    subtitle: 'Desenvolvimento Individual',
    description:
      'Estruture metas de evolução pessoal com base no seu perfil e no histórico de avaliações.',
    icon: TrendingUp,
    color: 'indigo',
    status: 'available',
    actions: [
      { label: 'Minhas avaliações', to: '/MyAssessments' },
      { label: 'Comparar perfis', to: '/compare-profiles' },
    ],
  },
  historico: {
    title: 'Histórico Pessoal',
    subtitle: 'Desenvolvimento Individual',
    description:
      'Visualize sua trilha de avaliações e compare variações comportamentais ao longo do tempo.',
    icon: ClipboardList,
    color: 'sky',
    status: 'available',
    actions: [
      { label: 'Minhas avaliações', to: '/MyAssessments' },
    ],
  },

  // ── V3.0 — Corporation ───────────────────────────────────────────────────
  'rh-gestao': {
    title: 'RH & Gestão de Pessoas',
    subtitle: 'Gestão e Equipes',
    description:
      'Transforme o InsightDISC em ferramenta central do seu RH. Distribuição comportamental, apoio a recrutamento, promoção interna, liderança, comunicação, clima e cultura organizacional — tudo baseado em dados DISC reais.',
    icon: Users2,
    color: 'blue',
    status: 'coming_soon',
    minPlan: 'Business Corporation',
    minPlanKey: 'corporation',
    submódulos: [
      'Visão geral de equipe e distribuição comportamental',
      'Apoio a recrutamento e promoção interna',
      'Apoio à liderança e comunicação',
      'Gestão de conflitos e clima organizacional',
      'Cultura organizacional e desenvolvimento por colaborador',
      'Aplicação DISC em processos internos',
      'Visão estratégica para equipes e apoio à tomada de decisão',
    ],
    actions: [
      { label: 'Abrir Team Map', to: '/team-map' },
      { label: 'Ver Analytics', to: '/app/analytics' },
    ],
  },
  usuarios: {
    title: 'Usuários',
    subtitle: 'Gestão e Equipes',
    description:
      'Administração completa dos usuários da conta com papéis, permissões e histórico operacional. Crie gestores, consultores internos, analistas de RH e usuários comuns — cada um com o nível de acesso adequado.',
    icon: UserCog,
    color: 'violet',
    status: 'coming_soon',
    minPlan: 'Business Corporation',
    minPlanKey: 'corporation',
    submódulos: [
      'Criação, edição e desativação de usuários',
      'Definição de papéis: Admin, Gestor, Consultor, Analista de RH, Usuário',
      'Visão de uso e histórico por usuário',
      'Controle de permissões por módulo',
    ],
    actions: [],
  },

  // ── V3.0 — Diamond ───────────────────────────────────────────────────────
  consultorio: {
    title: 'Consultório & Ferramentas',
    subtitle: 'Consultoria Premium',
    description:
      'Suporte premium para psicanalistas, psicólogos e profissionais da área comportamental. Cadastro de pacientes, prontuário leve, evolução entre relatórios, anotações privadas e devolutiva profissional — sem linguagem diagnóstica médica.',
    icon: Stethoscope,
    color: 'amber',
    status: 'coming_soon',
    minPlan: 'Diamond Consulting',
    minPlanKey: 'diamond_consulting',
    submódulos: [
      'Cadastro e histórico por paciente/cliente',
      'Evolução comportamental entre relatórios',
      'Anotações privadas e devolutiva profissional',
      'Plano de acompanhamento personalizado',
      'Recursos interpretativos com IA',
      'Prontuário comportamental leve (sem diagnóstico médico)',
    ],
    important:
      'O sistema apoia o profissional — não substitui o profissional. Sem linguagem diagnóstica médica.',
    actions: [
      { label: 'Abrir Dossiê', to: '/app/dossier' },
    ],
  },
  'estrategia-executiva': {
    title: 'Estratégia Executiva',
    subtitle: 'Consultoria Premium',
    description:
      'Leitura macro, estratégica e executiva com base nos dados comportamentais da organização. Recomendações para liderança, cultura, decisão e desenvolvimento de pessoas em escala.',
    icon: TrendingUp,
    color: 'amber',
    status: 'coming_soon',
    minPlan: 'Diamond Consulting',
    minPlanKey: 'diamond_consulting',
    submódulos: [
      'Visão macro e leitura estratégica',
      'Apoio à decisão executiva',
      'Análise de cultura e liderança organizacional',
      'Recomendações executivas baseadas em DISC',
      'Consolidação de insights organizacionais',
      'Análise avançada de contexto',
    ],
    actions: [
      { label: 'Abrir Analytics', to: '/app/analytics' },
    ],
  },

  // ── Upgrade genérico (via ?feature=X) ───────────────────────────────────
  upgrade: null, // tratado especialmente abaixo
};

const COLOR_CLASSES = {
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  sky:    { bg: 'bg-sky-50',    text: 'text-sky-600',    badge: 'bg-sky-100 text-sky-700 border-sky-200' },
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600', badge: 'bg-violet-100 text-violet-700 border-violet-200' },
  amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700 border-amber-200' },
  rose:   { bg: 'bg-rose-50',   text: 'text-rose-600',   badge: 'bg-rose-100 text-rose-700 border-rose-200' },
};

// ---------------------------------------------------------------------------
// Sub-componentes
// ---------------------------------------------------------------------------

function ComingSoonPage({ content }) {
  const colors = COLOR_CLASSES[content.color] || COLOR_CLASSES.indigo;
  const Icon = content.icon;

  return (
    <div className="w-full min-w-0 max-w-3xl mx-auto px-4 py-8 sm:px-6 space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-4 mb-5">
          <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${colors.bg} ${colors.text} flex-shrink-0`}>
            <Icon className="w-6 h-6" />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {content.subtitle}
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{content.title}</h2>
          </div>
        </div>

        {content.minPlan && (
          <Badge className={`mb-4 rounded-full border px-3 ${colors.badge} text-xs`}>
            Disponível no {content.minPlan}
          </Badge>
        )}

        <p className="text-sm leading-relaxed text-slate-600">{content.description}</p>

        {content.important && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="font-semibold">Importante: </span>{content.important}
          </div>
        )}

        {content.submódulos && content.submódulos.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
              O que este módulo vai incluir
            </p>
            <ul className="space-y-2">
              {content.submódulos.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="mt-1 inline-block w-1.5 h-1.5 rounded-full bg-slate-400 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 flex items-center gap-3">
          <Zap className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <p className="text-xs text-slate-500">
            Este módulo está em desenvolvimento e será disponibilizado em breve.
            Enquanto isso, explore os módulos disponíveis abaixo.
          </p>
        </div>

        {content.actions && content.actions.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-3">
            {content.actions.map((action) => (
              <Link key={action.to} to={action.to}>
                <Button variant="outline" className="rounded-xl">{action.label}</Button>
              </Link>
            ))}
            <Link to="/painel">
              <Button variant="ghost" className="rounded-xl text-slate-500">Voltar ao painel</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function UpgradePage({ featureKey }) {
  // Mapeamento básico de feature → texto de upgrade
  const upgradeMap = {
    'team-map':           { label: 'Team Map',                   plan: 'Business Corporation' },
    'rh-gestao':          { label: 'RH & Gestão de Pessoas',     plan: 'Business Corporation' },
    'usuarios':           { label: 'Usuários',                   plan: 'Business Corporation' },
    'analytics':          { label: 'Analytics',                  plan: 'Business Corporation' },
    'white-label':        { label: 'White Label',                plan: 'Business Corporation (incluso) ou add-on' },
    'consultorio':        { label: 'Consultório & Ferramentas',  plan: 'Diamond Consulting' },
    'estrategia-executiva': { label: 'Estratégia Executiva',     plan: 'Diamond Consulting' },
    'dossier':            { label: 'Dossiê',                     plan: 'Professional' },
    'archetypes':         { label: 'Arquétipos',                 plan: 'Professional' },
    'coach':              { label: 'Coach com IA',               plan: 'Professional' },
    'ai-lab':             { label: 'AI Lab',                     plan: 'Professional' },
    'library':            { label: 'Biblioteca DISC',            plan: 'Insider' },
    'comparison':         { label: 'Comparação de Perfis',       plan: 'Insider' },
  };

  const meta = upgradeMap[featureKey] || { label: 'Este recurso', plan: 'um plano superior' };

  return (
    <div className="w-full min-w-0 max-w-2xl mx-auto px-4 py-8 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 mb-5">
          <Lock className="w-7 h-7" />
        </span>
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{meta.label}</h2>
        <p className="mt-2 text-sm text-slate-500">
          Este recurso está disponível no plano <span className="font-semibold text-slate-700">{meta.plan}</span>.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Faça upgrade para desbloquear e ampliar sua experiência no InsightDISC.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/Pricing">
            <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">Ver planos e preços</Button>
          </Link>
          <Link to="/painel">
            <Button variant="outline" className="rounded-xl">Voltar ao painel</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function PanelFeaturePlaceholder() {
  const { featureSlug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const key = String(featureSlug || '').trim().toLowerCase();

  // Rota de upgrade genérica: /painel/upgrade?feature=coach
  if (key === 'upgrade') {
    const featureKey = searchParams.get('feature') || '';
    return <UpgradePage featureKey={featureKey} />;
  }

  const content = FEATURE_CONTENT[key];

  if (content) {
    return <ComingSoonPage content={content} />;
  }

  // Fallback genérico — nunca redireciona para outro plano
  return (
    <div className="w-full min-w-0 max-w-4xl mx-auto px-6 py-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-500">
            <Brain className="w-5 h-5" />
          </span>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Painel V3</p>
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Área em desenvolvimento</h2>
        <p className="mt-3 text-sm text-slate-600">
          Esta área está sendo preparada. Continue utilizando os módulos disponíveis no seu painel.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/painel">
            <Button className="rounded-xl bg-indigo-600 hover:bg-indigo-700">Voltar ao painel</Button>
          </Link>
          <Link to="/MyAssessments">
            <Button variant="outline" className="rounded-xl">Abrir avaliações</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
