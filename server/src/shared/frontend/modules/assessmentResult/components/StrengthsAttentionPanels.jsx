import React from 'react';
import { AlertTriangle, ShieldCheck } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';

function ListBlock({ items = [], emptyMessage = 'Sem itens disponíveis no momento.' }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function StrengthsAttentionPanels({
  strengths = [],
  attentionPoints = [],
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <PanelShell className="border-emerald-200 bg-emerald-50/30">
        <SectionHeader
          icon={ShieldCheck}
          iconClassName="bg-emerald-100 text-emerald-700"
          title="Forças"
          subtitle="Padrões comportamentais com maior potencial de contribuição."
        />
        <div className="mt-4">
          <ListBlock
            items={strengths}
            emptyMessage="Conclua novas avaliações para expandir a lista de forças prioritárias."
          />
        </div>
      </PanelShell>

      <PanelShell className="border-amber-200 bg-amber-50/30">
        <SectionHeader
          icon={AlertTriangle}
          iconClassName="bg-amber-100 text-amber-700"
          title="Pontos de atenção"
          subtitle="Sinais de ajuste para preservar equilíbrio de execução e relacionamento."
        />
        <div className="mt-4">
          <ListBlock
            items={attentionPoints}
            emptyMessage="Sem pontos críticos no momento. Continue monitorando ciclos de feedback."
          />
        </div>
      </PanelShell>
    </section>
  );
}

