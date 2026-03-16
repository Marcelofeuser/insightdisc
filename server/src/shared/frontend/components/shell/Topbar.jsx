import React from 'react';
import { LayoutDashboard } from 'lucide-react';

export default function Topbar({ title, subtitle, actions, modeLabel }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-white/90 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <LayoutDashboard className="h-4 w-4" />
            </span>
            {modeLabel ? (
              <p className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Experiência {modeLabel}
              </p>
            ) : null}
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-500">{subtitle}</p> : null}
        </div>
        {actions ? (
          <div className="flex max-w-full flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
