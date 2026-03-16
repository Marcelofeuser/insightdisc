import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  onCtaClick,
  size = 'default',
  tone = 'default',
  className = '',
}) {
  const isCompact = size === 'compact';
  const toneClass =
    tone === 'soft'
      ? 'border-slate-200 bg-slate-50/70'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50'
        : 'border-slate-200 bg-white';

  return (
    <div
      className={cn(
        'rounded-2xl border text-center shadow-sm',
        toneClass,
        isCompact ? 'p-6' : 'p-10',
        className,
      )}
    >
      {Icon ? (
        <span
          className={cn(
            'mx-auto mb-4 inline-flex items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm',
            isCompact ? 'h-11 w-11' : 'h-14 w-14',
          )}
        >
          <Icon className={cn(isCompact ? 'h-5 w-5' : 'h-7 w-7')} />
        </span>
      ) : null}
      <h3 className={cn('font-semibold text-slate-900', isCompact ? 'text-base' : 'text-lg')}>{title}</h3>
      {description ? (
        <p className={cn('mx-auto mt-2 max-w-2xl text-sm text-slate-500', isCompact ? 'max-w-xl' : '')}>
          {description}
        </p>
      ) : null}
      {ctaLabel && onCtaClick ? (
        <Button onClick={onCtaClick} className={cn('bg-indigo-600 hover:bg-indigo-700', isCompact ? 'mt-4' : 'mt-6')}>
          {ctaLabel}
        </Button>
      ) : null}
    </div>
  );
}
