import React from 'react';
import { CalendarCheck2 } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';

export default function DevelopmentPlanPanel({ plan = {} }) {
  const checkpoints = Array.isArray(plan?.checkpoints) ? plan.checkpoints : [];
  if (!checkpoints.length) return null;

  return (
    <PanelShell>
      <SectionHeader
        icon={CalendarCheck2}
        title="Plano de desenvolvimento 30-60-90"
        subtitle={plan?.summary || 'Plano automático de evolução comportamental com foco em ação prática.'}
      />
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {checkpoints.map((checkpoint) => (
          <article key={checkpoint.window} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{checkpoint.window}</p>
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {(checkpoint.goals || []).map((goal) => (
                <li key={goal} className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2">
                  {goal}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </PanelShell>
  );
}
