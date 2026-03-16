import React from 'react';
import { AlertTriangle, Target } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import PanelState from '@/components/ui/PanelState';
import SectionHeader from '@/components/ui/SectionHeader';

function FactorPill({ item, tone = 'neutral' }) {
  const toneClass =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : tone === 'danger'
        ? 'border-rose-200 bg-rose-50 text-rose-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800';

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${toneClass}`}>
      {item.factor} • {item.label} ({Number(item.value || 0).toFixed(1)}%)
    </span>
  );
}

export default function TeamGapsPanel({ gaps = {} }) {
  const underrepresented = gaps?.underrepresentedFactors || [];
  const overrepresented = gaps?.overrepresentedFactors || [];
  const risks = gaps?.risks || [];
  const opportunities = gaps?.opportunities || [];

  return (
    <PanelShell>
      <SectionHeader
        icon={Target}
        title="Gaps e oportunidades"
        subtitle="Lacunas comportamentais da equipe e recomendações para ampliar equilíbrio organizacional."
      />

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">Fatores pouco representados</h4>
          {underrepresented.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {underrepresented.map((item) => (
                <FactorPill key={`${item.factor}-under`} item={item} tone="warning" />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Sem lacunas críticas por fator na composição atual.</p>
          )}
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-900">Fatores com excesso de concentração</h4>
          {overrepresented.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {overrepresented.map((item) => (
                <FactorPill key={`${item.factor}-over`} item={item} tone="danger" />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Sem sobrecarga crítica de um fator específico.</p>
          )}
        </article>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <article className="rounded-xl border border-amber-200 bg-amber-50/70 p-4">
          <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Riscos da composição atual
          </h4>
          {risks.length ? (
            <ul className="mt-2 space-y-2 text-sm text-amber-900">
              {risks.map((item) => (
                <li key={item} className="rounded-lg border border-amber-200 bg-white/70 px-2.5 py-2">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <PanelState className="mt-2" title="Sem riscos críticos mapeados" description="A composição atual não apresenta alertas relevantes de concentração." />
          )}
        </article>

        <article className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
          <h4 className="text-sm font-semibold text-emerald-900">Oportunidades de equilíbrio</h4>
          {opportunities.length ? (
            <ul className="mt-2 space-y-2 text-sm text-emerald-900">
              {opportunities.map((item) => (
                <li key={item} className="rounded-lg border border-emerald-200 bg-white/70 px-2.5 py-2">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-emerald-900">Sem oportunidades adicionais registradas nesta amostra.</p>
          )}
        </article>
      </div>
    </PanelShell>
  );
}
