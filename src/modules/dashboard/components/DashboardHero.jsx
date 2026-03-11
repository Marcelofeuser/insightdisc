import React from 'react';
import PanelShell from '@/components/ui/PanelShell';
import { cn } from '@/lib/utils';

export default function DashboardHero({
  label,
  title,
  subtitle,
  actions,
  badge,
}) {
  return (
    <PanelShell
      tone="accent"
      className="relative overflow-hidden border-slate-200/80 bg-gradient-to-b from-white via-white to-slate-50/70"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-indigo-100/40 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-4xl">
          {label ? (
            <p className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600">
              {label}
            </p>
          ) : null}
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.72rem]">{title}</h2>
          {subtitle ? <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-slate-600">{subtitle}</p> : null}
          {badge ? <div className="mt-3">{badge}</div> : null}
        </div>

        {actions ? (
          <div className={cn(
            'flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white/90 p-2 shadow-sm',
            'sm:ml-auto',
          )}>
            {actions}
          </div>
        ) : null}
      </div>
    </PanelShell>
  );
}
