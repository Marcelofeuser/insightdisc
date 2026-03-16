import React from 'react';
import { Activity, Users, Zap } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';

function SummaryStat({ label, value, hint }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-600">{hint}</p> : null}
    </article>
  );
}

export default function TeamOverviewHero({ intelligence = {} }) {
  const balance = intelligence?.balance || {};

  return (
    <PanelShell
      tone="accent"
      className="border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/60"
      data-testid="team-intelligence-overview"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">Inteligência organizacional DISC</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Visão geral da equipe</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            {intelligence?.executiveSummary ||
              'Leitura executiva indisponível no momento. Gere o mapa com avaliações válidas para habilitar a análise organizacional.'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Perfil predominante</p>
          <p className="mt-1 font-semibold text-slate-900">
            {intelligence?.predominantFactor || '-'} • {intelligence?.predominantLabel || 'Sem leitura'}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <SummaryStat
          label="Pessoas analisadas"
          value={Number(intelligence?.totalMembers || 0)}
          hint="Perfis válidos na composição atual"
        />
        <SummaryStat
          label="Equilíbrio da equipe"
          value={`${Number(balance?.score || 0).toFixed(1)}%`}
          hint={`Nível ${String(balance?.level || 'indefinido')}`}
        />
        <SummaryStat
          label="Spread comportamental"
          value={`${Number(balance?.spread || 0).toFixed(1)} p.p.`}
          hint="Diferença entre fator mais e menos presente"
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
            <Users className="h-4 w-4 text-indigo-600" />
            Colaboração
          </p>
          <p className="mt-1">{intelligence?.predominantNarrative || 'Sem leitura de colaboração disponível.'}</p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
            <Zap className="h-4 w-4 text-amber-600" />
            Execução
          </p>
          <p className="mt-1">
            Fator mais forte: {balance?.strongestFactor || '-'} ({Number(balance?.strongestValue || 0).toFixed(1)}%).
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
          <p className="inline-flex items-center gap-2 font-semibold text-slate-900">
            <Activity className="h-4 w-4 text-emerald-600" />
            Atenção
          </p>
          <p className="mt-1">
            Fator menos presente: {balance?.weakestFactor || '-'} ({Number(balance?.weakestValue || 0).toFixed(1)}%).
          </p>
        </article>
      </div>
    </PanelShell>
  );
}
