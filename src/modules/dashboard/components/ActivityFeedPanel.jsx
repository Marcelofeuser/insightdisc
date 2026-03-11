import React from 'react';
import { CalendarClock } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import PanelState from '@/components/ui/PanelState';
import SectionHeader from '@/components/ui/SectionHeader';

export default function ActivityFeedPanel({ title, subtitle, items = [] }) {
  return (
    <PanelShell>
      <SectionHeader
        icon={CalendarClock}
        iconClassName="bg-slate-100 text-slate-700"
        title={title}
        subtitle={subtitle}
      />

      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5">
              <p className="text-sm font-semibold text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs text-slate-600">{item.description}</p>
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs text-slate-500">
                <CalendarClock className="h-3.5 w-3.5" />
                {item.date}
              </div>
            </div>
          ))
        ) : (
          <PanelState
            title="Sem atividade recente para exibir"
            description="Quando novas avaliações e relatórios forem processados, a movimentação aparecerá aqui."
          />
        )}
      </div>
    </PanelShell>
  );
}
