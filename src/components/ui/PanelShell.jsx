import React from 'react';
import { cn } from '@/lib/utils';

const TONE_CLASS = {
  default: 'border-slate-200 bg-white shadow-sm',
  muted: 'border-slate-200 bg-slate-50/60 shadow-sm',
  accent: 'border-indigo-100 bg-gradient-to-b from-white to-indigo-50/30 shadow-sm',
};

export default function PanelShell({
  as: Element = 'section',
  tone = 'default',
  padded = true,
  className,
  children,
  ...props
}) {
  return (
    <Element
      className={cn(
        'rounded-2xl border',
        TONE_CLASS[tone] || TONE_CLASS.default,
        padded ? 'p-5 sm:p-6' : '',
        className,
      )}
      {...props}
    >
      {children}
    </Element>
  );
}
