import React from 'react';
import { Fingerprint } from 'lucide-react';
import { ReportSection } from '@/modules/reports/components';

function unique(items = []) {
  return Array.from(new Set((items || []).map((item) => String(item || '').trim()).filter(Boolean)));
}

export default function CombinationAnalysisSection({
  interpretation,
  archetype,
  strengths = [],
  attentionPoints = [],
  potentialChallenges = [],
}) {
  const risks = unique([...(attentionPoints || []), ...(potentialChallenges || [])]).slice(0, 6);
  const topStrengths = unique(strengths).slice(0, 6);

  return (
    <ReportSection
      id="combination-analysis"
      icon={Fingerprint}
      title="Análise da combinação DISC"
      subtitle="Como os fatores predominantes se combinam, onde performam melhor e quais riscos exigem gestão ativa."
    >
      <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
        <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">
            Combinação principal
          </p>
          <h3 className="text-lg font-semibold text-slate-900">
            {interpretation?.profileCode || 'DISC'} • {archetype?.styleLabel || interpretation?.styleLabel || 'Estilo DISC'}
          </h3>
          <p className="text-sm leading-relaxed text-slate-600">
            {archetype?.summaryMedium || interpretation?.summaryMedium}
          </p>
          <p className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-700">
            {archetype?.summaryLong || interpretation?.summaryLong}
          </p>
        </article>

        <article className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Onde tende a performar melhor</h3>
          <p className="text-sm leading-relaxed text-slate-600">
            {interpretation?.idealEnvironment || 'Contextos com metas claras, feedback estruturado e autonomia proporcional ao perfil.'}
          </p>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Forças da combinação</h4>
            {topStrengths.length ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {topStrengths.map((item) => (
                  <li key={item} className="rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Sem forças adicionais mapeadas para esta combinação.</p>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">Riscos da combinação</h4>
            {risks.length ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {risks.map((item) => (
                  <li key={item} className="rounded-lg border border-amber-200 bg-amber-50/70 px-2.5 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Sem riscos críticos para este cenário de leitura.</p>
            )}
          </div>
        </article>
      </div>
    </ReportSection>
  );
}
