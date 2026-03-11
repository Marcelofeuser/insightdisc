import React from 'react';
import { AlertTriangle, Handshake } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';

function ItemList({ items = [], fallback = '' }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 text-sm text-slate-500">
        {fallback}
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

export default function SynergyTensionPanel({
  synergyPoints = [],
  tensionPoints = [],
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <PanelShell className="border-emerald-200 bg-emerald-50/30">
        <SectionHeader
          icon={Handshake}
          iconClassName="bg-emerald-100 text-emerald-700"
          title="Pontos de sinergia"
          subtitle="Areas em que os dois perfis tendem a colaborar com maior fluidez."
        />
        <div className="mt-4">
          <ItemList
            items={synergyPoints}
            fallback="Sem sinergias explicitas no momento. Defina acordos praticos para liberar complementaridade."
          />
        </div>
      </PanelShell>

      <PanelShell className="border-amber-200 bg-amber-50/30">
        <SectionHeader
          icon={AlertTriangle}
          iconClassName="bg-amber-100 text-amber-700"
          title="Tensoes potenciais"
          subtitle="Sinais de atrito que merecem combinados preventivos."
        />
        <div className="mt-4">
          <ItemList
            items={tensionPoints}
            fallback="Nao ha tensoes estruturais criticas para esta comparacao."
          />
        </div>
      </PanelShell>
    </section>
  );
}

