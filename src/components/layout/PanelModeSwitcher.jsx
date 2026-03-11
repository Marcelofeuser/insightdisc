import React from 'react';
import { ChevronDown } from 'lucide-react';
import { PANEL_MODE_META, PANEL_MODE_ORDER } from '@/modules/navigation/panelMode';
import { cn } from '@/lib/utils';

export default function PanelModeSwitcher({ value, onChange }) {
  const selectedLabel = PANEL_MODE_META[value]?.label || 'Business';

  return (
    <label className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300">
      <span className="hidden text-[11px] uppercase tracking-[0.12em] text-slate-500 sm:inline">Modo</span>
      <span
        className={cn(
          'inline-flex h-1.5 w-1.5 rounded-full',
          value === 'business' ? 'bg-emerald-500' : value === 'professional' ? 'bg-indigo-500' : 'bg-amber-500',
        )}
        aria-hidden="true"
      />
      <span className="hidden text-xs text-slate-500 md:inline">({selectedLabel})</span>
      <select
        className="min-w-[136px] appearance-none border-0 bg-transparent pr-5 text-sm font-semibold text-slate-900 outline-none"
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        aria-label="Selecionar modo do painel"
      >
        {PANEL_MODE_ORDER.map((mode) => (
          <option key={mode} value={mode}>
            {PANEL_MODE_META[mode]?.label || mode}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none -ml-4 h-4 w-4 text-slate-400 transition group-hover:text-slate-600" />
    </label>
  );
}
