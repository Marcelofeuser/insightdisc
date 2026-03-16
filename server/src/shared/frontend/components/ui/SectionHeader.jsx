import React from 'react';
import { cn } from '@/lib/utils';

export default function SectionHeader({
  icon: Icon,
  iconClassName,
  eyebrow,
  title,
  subtitle,
  actions,
  className,
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{eyebrow}</p>
        ) : null}

        <div className="mt-1 flex items-start gap-3">
          {Icon ? (
            <span className={cn('mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700', iconClassName)}>
              <Icon className="h-4 w-4" />
            </span>
          ) : null}

          <div className="min-w-0">
            {title ? <h3 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h3> : null}
            {subtitle ? <p className="mt-1 text-sm leading-relaxed text-slate-600">{subtitle}</p> : null}
          </div>
        </div>
      </div>

      {actions ? <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
