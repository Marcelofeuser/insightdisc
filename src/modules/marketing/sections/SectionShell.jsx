import React from 'react';
import { cn } from '@/lib/utils';

export default function SectionShell({
  id,
  eyebrow,
  title,
  description,
  centered = false,
  className,
  headerClassName,
  children,
}) {
  return (
    <section id={id} className={cn('px-6 py-24', className)}>
      <div className="mx-auto max-w-7xl">
        {(title || description || eyebrow) && (
          <div
            className={cn(
              'mb-14 max-w-3xl',
              centered ? 'mx-auto text-center' : '',
              headerClassName
            )}
          >
            {eyebrow ? (
              <p className="landing-section-eyebrow mb-3 text-xs font-semibold uppercase tracking-[0.16em]">{eyebrow}</p>
            ) : null}
            {title ? (
              <h2 className="landing-section-title text-4xl font-extrabold md:text-5xl">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="landing-section-description mt-4 text-xl leading-relaxed">{description}</p>
            ) : null}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}
