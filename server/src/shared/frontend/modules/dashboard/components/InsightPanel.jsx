import React from 'react';
import { Sparkles } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import PanelState from '@/components/ui/PanelState';
import SectionHeader from '@/components/ui/SectionHeader';

export default function InsightPanel({ title, subtitle, items = [] }) {
  return (
    <PanelShell>
      <SectionHeader
        icon={Sparkles}
        iconClassName="bg-indigo-100 text-indigo-700"
        title={title}
        subtitle={subtitle}
      />

      <div className="mt-4 space-y-3">
        {items.length ? (
          items.map((item, index) => (
            <div key={`${item}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
              <p className="text-sm leading-relaxed text-slate-700">{item}</p>
            </div>
          ))
        ) : (
          <PanelState
            title="Ainda não há insights suficientes para exibição"
            description="Conclua mais avaliações para gerar leitura comportamental com maior precisão."
          />
        )}
      </div>
    </PanelShell>
  );
}
