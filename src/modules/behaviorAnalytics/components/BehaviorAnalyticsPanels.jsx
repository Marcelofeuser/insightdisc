import React from 'react';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';

function formatScore(value = 0) {
  return `${Number(value || 0).toFixed(1)}%`;
}

export function BehaviorAnalyticsExecutivePanel({ analytics = {} }) {
  return (
    <PanelShell>
      <SectionHeader
        title="Analytics comportamental"
        subtitle="Leitura executiva da distribuição DISC e impactos organizacionais."
      />
      <p className="mt-3 text-sm text-slate-700">{analytics?.executiveSummary || 'Sem leitura executiva disponível.'}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {(analytics?.dimensions || []).map((item) => (
          <article key={item.key} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{formatScore(item.score)}</p>
            <p className="mt-1 text-xs text-slate-600">Status: {item.level}</p>
          </article>
        ))}
      </div>
    </PanelShell>
  );
}

export function BenchmarkPanel({ benchmarkComparison = {} }) {
  return (
    <PanelShell>
      <SectionHeader
        title="Benchmark organizacional"
        subtitle="Comparação da distribuição da empresa com referência global DISC."
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {(benchmarkComparison?.factors || []).map((item) => (
          <article key={item.factor} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
            <p className="mt-1 text-sm text-slate-700">Empresa: {formatScore(item.company)}</p>
            <p className="text-sm text-slate-700">Benchmark: {formatScore(item.benchmark)}</p>
            <p className={`mt-1 text-xs font-semibold ${item.delta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              Δ {item.delta >= 0 ? '+' : ''}{item.delta.toFixed(1)}
            </p>
          </article>
        ))}
      </div>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {(benchmarkComparison?.highlights || []).map((item) => (
          <li key={item} className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </PanelShell>
  );
}

export function BehaviorHistoryPanel({ evolution = {} }) {
  return (
    <PanelShell>
      <SectionHeader
        title="Histórico comportamental"
        subtitle="Evolução de perfil ao longo das avaliações disponíveis."
      />
      <p className="mt-3 text-sm text-slate-700">{evolution?.summary || 'Sem histórico disponível.'}</p>
      {(evolution?.items || []).length ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {evolution.items.slice(-6).map((item) => (
            <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{item.date || 'Sem data'}</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">Perfil {item.profileCode}</p>
              <p className="mt-1 text-xs text-slate-600">
                D {Number(item.scores?.D || 0).toFixed(1)}% • I {Number(item.scores?.I || 0).toFixed(1)}% •
                {' '}S {Number(item.scores?.S || 0).toFixed(1)}% • C {Number(item.scores?.C || 0).toFixed(1)}%
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </PanelShell>
  );
}
