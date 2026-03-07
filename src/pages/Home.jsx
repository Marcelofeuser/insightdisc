import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Users,
  BarChart3,
  Shield,
  Sparkles,
  Building2,
  Zap,
  Star,
  Target,
  Brain,
  ChevronDown,
  Award
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import DISCRadarChart from '@/components/disc/DISCRadarChart';

const DISC_FACTORS = [
  { key: 'D', name: 'Dominância', color: 'bg-red-500', light: 'bg-red-50 border-red-200', text: 'text-red-600', emoji: '🦁', desc: 'Orientado a resultados, direto, decidido e competitivo.' },
  { key: 'I', name: 'Influência', color: 'bg-orange-500', light: 'bg-orange-50 border-orange-200', text: 'text-orange-600', emoji: '🦊', desc: 'Comunicativo, entusiasta, persuasivo e inspirador.' },
  { key: 'S', name: 'Estabilidade', color: 'bg-green-500', light: 'bg-green-50 border-green-200', text: 'text-green-600', emoji: '🐢', desc: 'Calmo, paciente, confiável e colaborativo.' },
  { key: 'C', name: 'Conformidade', color: 'bg-blue-500', light: 'bg-blue-50 border-blue-200', text: 'text-blue-600', emoji: '🦉', desc: 'Analítico, preciso, organizado e metódico.' },
];

const STATS = [
  { value: '50.000+', label: 'Avaliações realizadas' },
  { value: '1.200+', label: 'Empresas atendidas' },
  { value: '98%', label: 'Satisfação dos usuários' },
  { value: '3 min', label: 'Para resultado grátis' },
];

const TESTIMONIALS = [
  { name: 'Ana Paula Ferreira', role: 'Gerente de RH – Grupo Vox', text: 'Em 2 meses mapeamos toda a liderança. A precisão dos perfis é impressionante e o white-label passou despercebido pelos candidatos.', rating: 5 },
  { name: 'Carlos Mendes', role: 'Psicólogo Organizacional', text: 'Migrei de outra ferramenta e o ganho em profundidade dos relatórios foi imediato. O gráfico de Energia de Ajuste é um diferencial real.', rating: 5 },
  { name: 'Juliana Costa', role: 'Profissional de Marketing', text: 'O teste gratuito me abriu os olhos. Entendi por que sempre me sentia desconfortável em reuniões longas — é o meu D alto!', rating: 5 },
];

const FEATURES = [
  { icon: Brain, title: 'Algoritmo Ipsativo', desc: 'Metodologia "Mais/Menos" com 40 questões que elimina a desejabilidade social e entrega perfis autênticos.' },
  { icon: BarChart3, title: '4 Fatores em 1 Relatório', desc: 'Análise completa de D, I, S e C com leitura Natural, Adaptada e Energia de Ajuste.' },
  { icon: Users, title: 'Mapeamento de Equipes', desc: 'Dashboard B2B com job matching, mapeamento de equipes e analytics avançado com tendências e fit cultural.' },
  { icon: Shield, title: 'Conformidade Total', desc: 'LGPD com consentimento explícito. AES-256, zero dados sensíveis armazenados. Segurança de nível enterprise.' },
];

const B2B_STEPS = [
  { step: '01', icon: Target, title: 'Compra créditos', desc: 'Pacotes de 10, 50 ou 100 tokens via PIX ou Cartão. Sem mensalidade obrigatória.' },
  { step: '02', icon: Zap, title: 'Gera link único', desc: 'Link descartável rastreável, atrelado ao seu workspace. Expira após uso.' },
  { step: '03', icon: Brain, title: 'Candidato avalia', desc: 'Fluxo guiado de 40 questões com salvamento automático a cada resposta.' },
  { step: '04', icon: Award, title: 'Relatório White-label', desc: 'PDF com sua marca gerado automaticamente. 1 crédito debitado.' },
];

const PLANS = [
  {
    name: 'Individual',
    tag: 'B2C',
    price: 'Grátis',
    priceSub: 'para começar',
    premium: 'R$ 97',
    premiumSub: 'relatório completo',
    features: ['12 questões · resultado imediato', 'Perfil dominante gratuito', 'Relatório PDF de 15+ páginas', '3 gráficos DISC completos', 'Acesso vitalício ao resultado'],
    cta: 'Fazer Teste Grátis',
    popular: false,
    href: 'StartFree',
    gradient: 'from-slate-800 to-slate-900',
  },
  {
    name: 'Profissional',
    tag: 'B2B',
    price: 'R$ 199',
    priceSub: '/mês + tokens',
    features: ['Dashboard corporativo completo', 'Links únicos descartáveis', 'Histórico e busca de candidatos', 'White-label (logo + cor da marca)', 'Analytics avançado e fit cultural', 'Suporte prioritário'],
    cta: 'Começar Agora',
    popular: true,
    href: 'Pricing',
    gradient: 'from-indigo-600 to-violet-600',
  },
  {
    name: 'Enterprise',
    tag: 'Personalizado',
    price: 'Sob consulta',
    priceSub: '',
    features: ['Avaliações ilimitadas', 'API de integração (REST)', 'Mapeamento de equipes ilimitado', 'White-label completo + domínio', 'SLA dedicado + gerente de sucesso'],
    cta: 'Falar com Vendas',
    popular: false,
    href: null,
    gradient: 'from-slate-800 to-slate-900',
  },
];

const FAQ = [
  { q: 'O DISC é reconhecido cientificamente?', a: 'Sim. A metodologia DISC é amplamente utilizada em psicologia organizacional há mais de 70 anos, fundamentada no modelo de William Moulton Marston e validada por milhares de estudos aplicados.' },
  { q: 'Quanto tempo leva o teste completo?', a: 'O teste gratuito tem 10 questões e leva cerca de 3 minutos. O teste premium possui 40 questões ipsativas e demora aproximadamente 15 minutos, com salvamento automático.' },
  { q: 'Meus dados são seguros?', a: 'Totalmente. Aplicamos criptografia AES-256, JWT seguro, consentimento LGPD explícito e nunca armazenamos dados de pagamento. Conformidade PCI-DSS garantida.' },
  { q: 'Posso usar os relatórios com minha marca?', a: 'Sim, nos planos B2B você personaliza logo, cor principal e nome da empresa no relatório PDF gerado automaticamente para cada candidato.' },
];

export default function Home() {
  const [openFaq, setOpenFaq] = useState(null);
  const sampleProfile = { D: 72, I: 45, S: 28, C: 55 };

  return (
    <div id="top" className="min-h-screen bg-white overflow-x-hidden">

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-to-b from-indigo-100/60 to-transparent rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Copy */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-semibold mb-6 border border-indigo-200">
                <Sparkles className="w-4 h-4" />
                Avaliação Comportamental DISC · Metodologia Ipsativa
              </div>

              <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight mb-6 tracking-tight">
                Entenda como você
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                  pensa, age e lidera
                </span>
              </h1>

              <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-lg">
                O teste DISC mais preciso do Brasil. Resultado gratuito em 3 minutos.
                Relatório profissional com análise completa dos 4 fatores DISC (D, I, S, C), perfil comportamental detalhado, estilo de liderança e orientação de carreira.
              </p>

              <div className="grid sm:grid-cols-2 gap-2 mb-8 text-sm text-slate-700">
                {[
                  '4 fatores comportamentais DISC',
                  'análise de liderança',
                  'orientação de carreira',
                  'relatório profissional em PDF',
                ].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {item}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-4 mb-10">
                <Link to={createPageUrl('StartFree')} className="w-full sm:w-auto">
                  <Button size="lg" className="h-14 w-full sm:w-auto px-8 text-base font-bold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-2xl shadow-lg shadow-indigo-200/60">
                    Fazer Teste Grátis
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Link to={`${createPageUrl('Pricing')}#b2b`} className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="h-14 w-full sm:w-auto rounded-2xl border border-indigo-600 bg-white text-indigo-700 shadow-[0_10px_28px_rgba(79,70,229,0.16)] hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-200 px-8 text-base font-semibold"
                    data-testid="home-cta-secondary"
                  >
                    Ver Planos
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center gap-5 text-sm text-slate-500">
                {['Gratuito para começar', 'LGPD compliant', 'Sem cadastro obrigatório'].map((t, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    {t}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* Chart Preview */}
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }} className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-200 to-violet-200 rounded-3xl blur-3xl opacity-25" />
              <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-8">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Exemplo de Resultado</p>
                    <h3 className="text-lg font-bold text-slate-800">Perfil Dominante: D/C</h3>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold">InsightDISC</span>
                </div>
                <DISCRadarChart naturalProfile={sampleProfile} showAdapted={false} size={300} />
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {DISC_FACTORS.map(f => (
                    <div key={f.key} className={`rounded-xl p-2 text-center border ${f.light}`}>
                      <p className={`text-lg font-black ${f.text}`}>{sampleProfile[f.key]}%</p>
                      <p className="text-[10px] font-semibold text-slate-500 uppercase">{f.key}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────── */}
      <section className="py-16 bg-slate-900">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="text-center">
                <p className="text-4xl font-extrabold text-white mb-1">{s.value}</p>
                <p className="text-slate-400 text-sm">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── O QUE É O DISC ─────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">O que é o modelo DISC?</h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              4 dimensões comportamentais que explicam como você reage ao ambiente, toma decisões e se relaciona com outros.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {DISC_FACTORS.map((f, i) => (
              <motion.div key={f.key} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`rounded-2xl border-2 p-7 ${f.light} hover:shadow-lg transition-all`}>
                <div className="text-4xl mb-4">{f.emoji}</div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-2xl font-black ${f.text}`}>{f.key}</span>
                  <span className="font-bold text-slate-800 text-lg">{f.name}</span>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Por que o InsightDISC é diferente?</h2>
            <p className="text-lg text-slate-600 max-w-xl mx-auto">Construído por psicólogos organizacionais, para profissionais que exigem precisão.</p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-7">
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all border border-slate-100 group">
                <div className="w-13 h-13 w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center mb-6 group-hover:from-indigo-100 group-hover:to-violet-100 transition-all border border-indigo-100">
                  <f.icon className="w-7 h-7 text-indigo-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── B2B FLOW ──────────────────────────────────────────── */}
      <section className="py-24 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="relative max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/15 text-indigo-300 text-sm font-semibold mb-4 border border-indigo-500/20">
              <Building2 className="w-4 h-4" /> Solução Corporativa
            </span>
            <h2 className="text-4xl font-extrabold text-white mb-4">Como funciona para empresas?</h2>
            <p className="text-slate-400 text-lg max-w-xl mx-auto">Do crédito ao relatório White-label em 4 passos simples.</p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {B2B_STEPS.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="relative p-7 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-indigo-500/40 transition-all">
                {i < B2B_STEPS.length - 1 && (
                  <div className="hidden md:flex absolute top-10 -right-3 z-10">
                    <ArrowRight className="w-5 h-5 text-indigo-500/50" />
                  </div>
                )}
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center mb-5">
                  <s.icon className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-xs font-bold text-indigo-500/60 mb-1 uppercase tracking-widest">{s.step}</p>
                <h3 className="text-white font-bold text-lg mb-2">{s.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to={`${createPageUrl('Pricing')}#b2b`}>
              <Button size="lg" className="h-13 h-12 px-8 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white font-bold">
                Ver Planos <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Quem já usa o InsightDISC</h2>
            <p className="text-lg text-slate-500">De profissionais de RH a indivíduos em busca de autoconhecimento.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="bg-slate-50 rounded-2xl p-8 border border-slate-100 hover:shadow-lg transition-all">
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-slate-700 leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                    <p className="text-slate-500 text-xs">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────── */}
      <section id="pricing" className="py-24 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Planos e Preços</h2>
            <p className="text-lg text-slate-600">Escolha o modelo certo para seu objetivo.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {PLANS.map((plan, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`relative rounded-3xl flex flex-col ${plan.popular
                  ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-2xl shadow-indigo-300/40 scale-105'
                  : 'bg-white border-2 border-slate-100 shadow-sm'
                }`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-amber-400 text-amber-900 text-xs font-black rounded-full uppercase tracking-wide shadow">
                    Mais Popular
                  </div>
                )}
                <div className="p-8 flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className={`text-xl font-extrabold ${plan.popular ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plan.popular ? 'bg-white/20 text-indigo-100' : 'bg-indigo-100 text-indigo-700'}`}>{plan.tag}</span>
                  </div>

                  <div className="mb-6">
                    <span className={`text-4xl font-extrabold ${plan.popular ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                    {plan.priceSub && <span className={`ml-1 text-sm ${plan.popular ? 'text-indigo-200' : 'text-slate-500'}`}>{plan.priceSub}</span>}
                    {plan.premium && (
                      <p className={`text-sm mt-1 ${plan.popular ? 'text-indigo-200' : 'text-slate-400'}`}>ou {plan.premium} {plan.premiumSub}</p>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-3">
                        <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.popular ? 'text-indigo-200' : 'text-indigo-500'}`} />
                        <span className={`text-sm ${plan.popular ? 'text-indigo-100' : 'text-slate-600'}`}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="p-8 pt-0">
                  {plan.href ? (
                    <Link to={createPageUrl(plan.href)}>
                      <Button className={`w-full h-12 font-bold rounded-xl ${plan.popular ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                        {plan.cta} <ArrowRight className="ml-2 w-4 h-4" />
                      </Button>
                    </Link>
                  ) : (
                    <Button className="w-full h-12 font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800">
                      {plan.cta} <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-slate-900 mb-4">Perguntas Frequentes</h2>
          </motion.div>

          <div className="space-y-3">
            {FAQ.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                className="border border-slate-200 rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-slate-900 pr-4">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6">
                    <p className="text-slate-600 leading-relaxed">{item.a}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────── */}
      <section className="py-24 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(255,255,255,0.08),transparent_50%)]" />
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="text-6xl mb-6">🧠</div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white mb-6 leading-tight">
              Pronto para se conhecer profundamente?
            </h2>
            <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
              Milhares de profissionais já usam o InsightDISC para tomar decisões melhores sobre carreira, time e liderança.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to={createPageUrl('StartFree')}>
                <Button size="lg" className="h-16 px-12 text-lg font-extrabold bg-white text-indigo-700 hover:bg-indigo-50 rounded-2xl shadow-2xl">
                  Começar Gratuitamente
                  <ArrowRight className="ml-3 w-5 h-5" />
                </Button>
              </Link>
              <Link to={`${createPageUrl('Pricing')}#b2b`}>
                <Button
                  size="lg"
                  variant="ghost"
                  className="h-16 w-full sm:w-auto rounded-2xl border border-indigo-600 bg-white text-indigo-700 shadow-[0_10px_28px_rgba(79,70,229,0.18)] hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all duration-200 px-10 text-lg font-bold"
                >
                  Ver Planos
                </Button>
              </Link>
            </div>
            <p className="text-indigo-200 text-sm mt-6">Sem cartão de crédito. Resultado em 3 minutos.</p>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────── */}
      <footer className="bg-slate-950 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-xl font-extrabold">InsightDISC</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                Plataforma líder em avaliação comportamental DISC no Brasil. Metodologia ipsativa com rigor científico.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-5 text-slate-200">Produto</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li><Link to={createPageUrl('StartFree')} className="hover:text-white transition-colors">Teste Gratuito</Link></li>
                <li><Link to={createPageUrl('Pricing')} className="hover:text-white transition-colors">Planos Premium</Link></li>
                <li><Link to={createPageUrl('Pricing')} className="hover:text-white transition-colors">Para Empresas</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-5 text-slate-200">Plataforma</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li><Link to={createPageUrl('Dashboard')} className="hover:text-white transition-colors">Dashboard</Link></li>
                <li><Link to={createPageUrl('TeamMapping')} className="hover:text-white transition-colors">Mapeamento de Equipes</Link></li>
                <li><Link to={createPageUrl('AnalyticsDashboard')} className="hover:text-white transition-colors">Analytics B2B</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-5 text-slate-200">Legal</h4>
              <ul className="space-y-3 text-slate-400 text-sm">
                <li><Link to={createPageUrl('Privacy')} className="hover:text-white transition-colors">Privacidade</Link></li>
                <li><Link to={createPageUrl('Terms')} className="hover:text-white transition-colors">Termos de Uso</Link></li>
                <li><Link to={createPageUrl('Lgpd')} className="hover:text-white transition-colors">LGPD</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-500 text-sm">
            <p>© 2026 InsightDISC. Todos os direitos reservados. Dados protegidos conforme LGPD.</p>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-500" />
              <span>LGPD Compliant · AES-256</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
