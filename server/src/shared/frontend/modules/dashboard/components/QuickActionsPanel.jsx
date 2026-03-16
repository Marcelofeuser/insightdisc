import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import PanelState from '@/components/ui/PanelState';
import SectionHeader from '@/components/ui/SectionHeader';

export default function QuickActionsPanel({ title, subtitle, actions = [] }) {
  return (
    <PanelShell>
      <SectionHeader
        icon={Compass}
        iconClassName="bg-violet-100 text-violet-700"
        title={title}
        subtitle={subtitle}
      />

      {actions.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={`${action.label}-${action.to}`}
                to={action.to}
                className="group rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white hover:shadow-sm"
              >
                <div className="flex items-center gap-2 text-slate-900">
                  {Icon ? (
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm transition group-hover:bg-indigo-50 group-hover:text-indigo-700">
                      <Icon className="h-4 w-4" />
                    </span>
                  ) : null}
                  <span className="text-sm font-semibold">{action.label}</span>
                </div>
                {action.description ? (
                  <p className="mt-2 text-xs leading-relaxed text-slate-600">{action.description}</p>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : (
        <PanelState
          className="mt-4"
          title="Ações indisponíveis"
          description="Os atalhos aparecerão aqui assim que módulos compatíveis estiverem disponíveis para o seu contexto."
        />
      )}
    </PanelShell>
  );
}
