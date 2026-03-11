import React from 'react';
import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function PanelState({
  type = 'empty',
  title,
  description,
  ctaLabel,
  onCtaClick,
  className,
}) {
  const isLoading = type === 'loading';
  const isError = type === 'error';

  const Icon = isLoading ? Loader2 : isError ? AlertCircle : Inbox;

  return (
    <div
      className={cn(
        'rounded-xl border px-4 py-5 text-center',
        isError
          ? 'border-rose-200 bg-rose-50'
          : 'border-dashed border-slate-300 bg-slate-50/70',
        className,
      )}
    >
      <span
        className={cn(
          'mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl',
          isError ? 'bg-rose-100 text-rose-700' : 'bg-white text-slate-500',
        )}
      >
        <Icon className={cn('h-5 w-5', isLoading ? 'animate-spin' : '')} />
      </span>

      <p className={cn('text-sm font-semibold', isError ? 'text-rose-900' : 'text-slate-800')}>
        {title || (isLoading ? 'Carregando dados...' : isError ? 'Erro ao carregar dados' : 'Sem dados suficientes')}
      </p>
      {description ? (
        <p className={cn('mx-auto mt-1 max-w-2xl text-sm', isError ? 'text-rose-700' : 'text-slate-600')}>
          {description}
        </p>
      ) : null}

      {ctaLabel && onCtaClick ? (
        <Button
          type="button"
          variant={isError ? 'destructive' : 'outline'}
          onClick={onCtaClick}
          className="mt-4"
        >
          {ctaLabel}
        </Button>
      ) : null}
    </div>
  );
}
