import React from 'react';
import { Layers3 } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';

function resolveStatusBadge(status = '') {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'forte') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
  if (normalized === 'vulneravel') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export default function TeamDimensionsPanel({ dimensions = [] }) {
  return (
    <PanelShell>
      <SectionHeader
        icon={Layers3}
        title="Leitura por dimensão organizacional"
        subtitle="Tradução prática do DISC para liderança, comunicação, colaboração, execução e qualidade."
      />

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {dimensions.map((dimension) => {
          const value = Number(dimension?.score || 0);
          const width = Math.max(0, Math.min(100, value));
          const statusClass = resolveStatusBadge(dimension?.status);

          return (
            <article key={dimension?.key} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold text-slate-900">{dimension?.label}</h4>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${statusClass}`}>
                  {dimension?.status || 'equilibrada'}
                </span>
              </div>

              <p className="mt-2 text-lg font-semibold text-slate-900">{value.toFixed(1)}%</p>

              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${width}%` }} />
              </div>

              <p className="mt-2 text-sm leading-relaxed text-slate-600">{dimension?.narrative || 'Sem narrativa para esta dimensão.'}</p>
            </article>
          );
        })}
      </div>
    </PanelShell>
  );
}
