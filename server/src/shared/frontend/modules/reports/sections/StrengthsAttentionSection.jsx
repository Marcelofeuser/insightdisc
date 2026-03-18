import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { ReportSection } from '@/modules/reports/components';

function ListCard({ title, items = [], tone = 'neutral' }) {
  const toneClass =
    tone === 'positive'
      ? 'border-emerald-200 bg-emerald-50/60'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50/70'
        : 'border-slate-200 bg-white';

  return (
    <article className={`rounded-xl border p-4 ${toneClass}`}>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {items.length ? (
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          {items.map((item) => (
            <li key={item} className="rounded-lg border border-white/70 bg-white/80 px-2.5 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-600">Sem itens críticos identificados para este bloco.</p>
      )}
    </article>
  );
}

export default function StrengthsAttentionSection({
  strengths = [],
  attentionPoints = [],
  potentialChallenges = [],
}) {
  return (
    <ReportSection
      id="strengths-attention"
      icon={ShieldCheck}
      title="Forças e pontos de atenção"
      subtitle="Pontos fortes consolidados e riscos comportamentais para gestão prática do perfil."
    >
      <div className="grid gap-3 xl:grid-cols-3">
        <ListCard title="Forças" items={strengths} tone="positive" />
        <ListCard title="Pontos de atenção" items={attentionPoints} tone="warning" />
        <ListCard title="Desafios potenciais" items={potentialChallenges} tone="neutral" />
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-600">
        <p className="inline-flex items-center gap-2 font-semibold text-slate-700">
          <AlertTriangle className="h-4 w-4" />
          Observação de uso
        </p>
        <p className="mt-1">
          Pontos de atenção não são limitações fixas. Eles indicam comportamentos que merecem gestão ativa em contextos de pressão.
        </p>
      </div>
    </ReportSection>
  );
}
