import React from 'react';
import { cn } from '@/lib/utils';

export default function SectionShell({
  id,
  eyebrow,
  title,
  description,
  className,
  headerClassName,
  children,
}) {
  return (
    <section id={id} className={cn('py-20 sm:py-24', className)}>
      <div className="mx-auto max-w-7xl px-6">
        {(title || description || eyebrow) && (
          <div className={cn('mb-10 max-w-3xl', headerClassName)}>
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">{eyebrow}</p>
            ) : null}
            {title ? <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{title}</h2> : null}
            {description ? <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">{description}</p> : null}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

