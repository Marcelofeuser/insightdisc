import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock3,
  FileText,
  MessageCircle,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';

const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '5511999999999';

const VALUE_CARDS = [
  {
    title: 'Perfil comportamental completo',
    description: 'Leitura prática dos 4 fatores DISC (D, I, S e C) com orientação clara para ação.',
    icon: Sparkles,
  },
  {
    title: 'Liderança e comunicação',
    description: 'Direções objetivas para gestão de pessoas, feedback e alinhamento de expectativas.',
    icon: Users,
  },
  {
    title: 'Carreira e desenvolvimento',
    description: 'Recomendações para crescimento profissional com plano de evolução 30/60/90.',
    icon: Briefcase,
  },
  {
    title: 'Relatório profissional em PDF',
    description: 'Documento estruturado para uso em RH, consultoria, coaching e desenvolvimento.',
    icon: FileText,
  },
];

const STEPS = [
  {
    title: 'Faça o teste grátis ou envie convites',
    description: 'Inicie com 10 perguntas grátis ou dispare convites para candidatos e equipes.',
  },
  {
    title: 'Responda em poucos minutos',
    description: 'Questionário objetivo, em fluxo simples e com linguagem acessível.',
  },
  {
    title: 'Gere o relatório premium',
    description: 'Receba análise com 4 fatores DISC e 3 leituras: Natural, Adaptado e Síntese.',
  },
  {
    title: 'Transforme em decisões práticas',
    description: 'Use os insights para recrutamento, liderança, comunicação e plano de desenvolvimento.',
  },
];

const USE_CASES = [
  {
    title: 'Empresas (RH e Recrutamento)',
    bullets: ['Apoio em contratação e fit comportamental', 'Mapeamento de equipes e lideranças', 'Base para feedback e desenvolvimento'],
    cta: 'Ver planos B2B',
    href: `${createPageUrl('Pricing')}#b2b`,
    icon: Building2,
  },
  {
    title: 'Consultores e Coaches',
    bullets: ['Diagnóstico inicial estruturado', 'Relatórios aplicáveis em sessões', 'Plano de ação com foco em comportamento'],
    cta: 'Falar com especialista',
    href: `https://wa.me/${WHATSAPP_NUMBER}`,
    icon: MessageCircle,
    external: true,
  },
  {
    title: 'Liderança e Desenvolvimento',
    bullets: ['Melhoria de comunicação com o time', 'Evolução de estilo de liderança', 'Ajuste de tomada de decisão sob pressão'],
    cta: 'Fazer teste grátis',
    href: createPageUrl('StartFree'),
    icon: Users,
  },
  {
    title: 'Autoconhecimento (Individual)',
    bullets: ['Entenda padrões de comportamento', 'Identifique forças e riscos de perfil', 'Defina próximos passos de carreira'],
    cta: 'Começar agora',
    href: createPageUrl('StartFree'),
    icon: UserRound,
  },
];

const FAQ_ITEMS = [
  {
    q: 'DISC são 4 perfis?',
    a: 'O DISC trabalha com 4 fatores comportamentais: D, I, S e C. O estilo de cada pessoa surge da combinação desses fatores.',
  },
  {
    q: 'O que são Natural, Adaptado e Síntese?',
    a: 'Natural é o padrão espontâneo. Adaptado mostra ajustes ao contexto atual. Síntese consolida os principais achados para decisão.',
  },
  {
    q: 'Precisa de login para testar?',
    a: 'No fluxo de teste grátis, você já consegue responder e visualizar resultado sem barreira de login no início.',
  },
  {
    q: 'Qual a diferença entre teste grátis e completo?',
    a: 'O grátis entrega uma leitura inicial. O completo amplia profundidade, inclui recomendações práticas e relatório premium em PDF.',
  },
  {
    q: 'Posso usar para recrutamento?',
    a: 'Sim. O InsightDISC apoia análise comportamental em processos seletivos e desenvolvimento de equipes, com foco em decisão prática.',
  },
  {
    q: 'O relatório é em PDF?',
    a: 'Sim. O relatório premium pode ser exportado em PDF com layout profissional para uso em reuniões e devolutivas.',
  },
];

function CTAButtons() {
  return (
    <div className="flex flex-wrap gap-3">
      <Link to={createPageUrl('StartFree')}>
        <Button className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-base font-semibold">
          Fazer teste grátis
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </Link>
      <Link to={createPageUrl('Pricing')}>
        <Button variant="outline" className="h-12 px-6 rounded-xl border-slate-300">
          Ver planos B2B
        </Button>
      </Link>
      <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noreferrer">
        <Button variant="ghost" className="h-12 px-4 rounded-xl text-slate-700">
          Falar com especialista
        </Button>
      </a>
    </div>
  );
}

export default function Avaliacoes() {
  useEffect(() => {
    document.title = 'Avaliações | InsightDISC';
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <section className="pt-16 pb-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                <Clock3 className="w-3.5 h-3.5" />
                Avaliação DISC em 3-5 minutos
              </span>
              <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                Avaliações comportamentais para decisões mais seguras
              </h1>
              <p className="mt-4 text-lg text-slate-600 leading-relaxed">
                Relatório premium com 4 fatores DISC e 3 leituras (Natural, Adaptado e Síntese), com orientações práticas de liderança e carreira.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">LGPD</span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">Relatório em PDF</span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">Uso profissional</span>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">Aplicação prática</span>
              </div>
              <div className="mt-8">
                <CTAButtons />
              </div>
            </div>

            <Card className="rounded-2xl border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Preview do relatório</p>
                  <span className="text-xs text-slate-500">InsightDISC</span>
                </div>
                {[
                  { label: 'D - Dominância', value: 68, color: 'bg-red-500' },
                  { label: 'I - Influência', value: 54, color: 'bg-amber-500' },
                  { label: 'S - Estabilidade', value: 61, color: 'bg-green-500' },
                  { label: 'C - Conformidade', value: 47, color: 'bg-blue-500' },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{item.label}</span>
                      <span className="font-semibold">{item.value}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                  Inclui forças, riscos, comunicação, liderança e plano 30/60/90.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900">O que você avalia</h2>
          <p className="mt-2 text-slate-600">Metodologia consolidada, leitura aplicável e foco em desenvolvimento real.</p>
          <div className="mt-6 grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {VALUE_CARDS.map(({ title, description, icon: Icon }) => (
              <Card key={title} className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 bg-slate-50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900">Como funciona</h2>
          <div className="mt-6 grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {STEPS.map((step, index) => (
              <Card key={step.title} className="rounded-2xl border-slate-200 bg-white shadow-sm">
                <CardContent className="p-5">
                  <span className="text-xs font-bold text-indigo-600">PASSO {index + 1}</span>
                  <h3 className="mt-2 font-semibold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10" id="recursos-avaliacoes">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900">Onde usar</h2>
          <p className="mt-2 text-slate-600">Solução adaptável para RH, consultoria, liderança e desenvolvimento individual.</p>
          <div className="mt-6 grid md:grid-cols-2 gap-4">
            {USE_CASES.map(({ title, bullets, cta, href, icon: Icon, external }) => (
              <Card key={title} className="rounded-2xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900">{title}</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4">
                    {external ? (
                      <a href={href} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                        {cta}
                      </a>
                    ) : (
                      <Link to={href} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                        {cta}
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900">O relatório inclui</h2>
          <div className="mt-5 grid md:grid-cols-2 gap-4">
            {[
              '4 fatores DISC (D, I, S, C)',
              '3 leituras: Natural, Adaptado e Síntese',
              'Forças, riscos, comunicação e plano 30/60/90',
              'PDF com layout profissional para uso em devolutivas',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-slate-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-indigo-600 mt-0.5" />
                  <span>{item}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-10 bg-slate-50 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-slate-900">FAQ</h2>
          <div className="mt-5 space-y-3">
            {FAQ_ITEMS.map((item) => (
              <details key={item.q} className="rounded-xl border border-slate-200 bg-white p-4 group">
                <summary className="cursor-pointer list-none font-medium text-slate-900 flex items-center justify-between">
                  {item.q}
                  <span className="text-slate-400 group-open:rotate-180 transition-transform">⌄</span>
                </summary>
                <p className="mt-3 text-sm text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="max-w-6xl mx-auto px-6">
          <Card className="rounded-3xl border-slate-200 bg-gradient-to-r from-indigo-600 to-violet-600 shadow-sm">
            <CardContent className="p-8 md:p-10">
              <h2 className="text-3xl font-extrabold text-white">Comece com o teste grátis e evolua para o premium quando quiser</h2>
              <p className="mt-3 text-indigo-100 max-w-2xl">
                Faça a primeira leitura em minutos e destrave relatórios completos para decisões mais assertivas em pessoas e carreira.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to={createPageUrl('StartFree')}>
                  <Button className="h-12 px-6 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50">
                    Fazer teste grátis
                  </Button>
                </Link>
                <Link to={createPageUrl('Pricing')}>
                  <Button variant="outline" className="h-12 px-6 rounded-xl border-white/60 text-white hover:bg-white/10">
                    Ver planos B2B
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
