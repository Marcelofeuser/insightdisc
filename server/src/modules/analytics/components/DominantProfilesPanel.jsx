import React from 'react';
import { Trophy } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import PanelState from '@/components/ui/PanelState';
import SectionHeader from '@/components/ui/SectionHeader';

export default function DominantProfilesPanel({
  title = 'Perfis predominantes',
  subtitle = 'Combinações DISC mais frequentes no conjunto analisado.',
  profiles = [],
}) {
  const hasProfiles = Array.isArray(profiles) && profiles.length > 0;
  const total = profiles.reduce((acc, item) => acc + Number(item?.count || 0), 0);
  const top = profiles[0]?.count || 1;

  return (
    <PanelShell>
      <SectionHeader icon={Trophy} title={title} subtitle={subtitle} />

      {hasProfiles ? (
        <div className="mt-4 space-y-3">
          {profiles.map((item, index) => {
            const count = Number(item?.count || 0);
            const width = top > 0 ? (count / top) * 100 : 0;
            const relative = total > 0 ? (count / total) * 100 : 0;

            return (
              <article key={`${item?.profile || 'DISC'}-${index}`} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <p className="font-semibold text-slate-900">{String(item?.profile || 'DISC').toUpperCase()}</p>
                  <p className="text-slate-700">{count} pessoa{count === 1 ? '' : 's'}</p>
                </div>

                <div className="mt-2 h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-indigo-500"
                    style={{ width: `${Math.max(8, Math.min(100, width))}%` }}
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">Participação relativa: {relative.toFixed(1)}%</p>
              </article>
            );
          })}
        </div>
      ) : (
        <PanelState
          className="mt-4"
          title="Sem perfis predominantes consolidados"
          description="Ainda não há perfis suficientes para consolidar predominâncias."
        />
      )}
    </PanelShell>
  );
}
