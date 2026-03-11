import React from 'react';
import { Lightbulb, Target } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';

function ListBlock({ title, items = [], fallback }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</p>
      {items.length ? (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li key={item} className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-sm text-slate-700">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{fallback}</p>
      )}
    </section>
  );
}

export default function ComparisonRecommendationsPanel({
  recommendations = [],
  conflictRisks = [],
}) {
  return (
    <PanelShell>
      <SectionHeader
        icon={Target}
        title="Recomendacoes praticas"
        subtitle="Como reduzir conflitos, alinhar comunicacao e aproveitar complementaridade entre os perfis."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ListBlock
          title="Acoes recomendadas"
          items={recommendations}
          fallback="Sem recomendacoes adicionais para este comparativo."
        />
        <ListBlock
          title="Riscos de conflito"
          items={conflictRisks}
          fallback="Sem riscos criticos detectados para este par de perfis."
        />
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm text-slate-600">
        <p className="inline-flex items-center gap-2 font-semibold text-slate-800">
          <Lightbulb className="h-4 w-4 text-amber-600" />
          Proximo passo sugerido
        </p>
        <p className="mt-1">
          Escolha duas recomendacoes objetivas, aplique por 30 dias e revise com feedback observavel de comportamento.
        </p>
      </div>
    </PanelShell>
  );
}

