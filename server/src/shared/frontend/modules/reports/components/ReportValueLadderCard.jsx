import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { getReportTierProgress } from '@/modules/reports/reportValueLadder';

export default function ReportValueLadderCard({
  currentTier = 'standard',
  title = 'Escada de valor dos relatorios',
  description = 'Evolua da leitura essencial para uma camada executiva completa de decisao comportamental.',
  compact = false,
}) {
  const levels = getReportTierProgress(currentTier);

  return (
    <section className={`rounded-2xl border border-slate-200 bg-white ${compact ? 'p-4' : 'p-5'} shadow-sm`}>
      <h3 className={`${compact ? 'text-base' : 'text-lg'} font-semibold tracking-tight text-slate-900`}>{title}</h3>
      <p className={`mt-2 ${compact ? 'text-xs' : 'text-sm'} leading-relaxed text-slate-600`}>{description}</p>

      <div className={`mt-4 grid gap-3 ${compact ? 'sm:grid-cols-3' : 'md:grid-cols-3'}`}>
        {levels.map((level) => {
          const isCurrent = level.state === 'current';
          const isPassed = level.state === 'passed';
          return (
            <article
              key={level.tier}
              className={[
                'rounded-xl border p-3',
                level.toneClassName,
                isCurrent ? 'ring-2 ring-indigo-200' : '',
                isPassed ? 'opacity-95' : '',
              ].join(' ')}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{level.audience}</p>
                {isPassed || isCurrent ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-300" />
                )}
              </div>
              <p className="mt-1 text-sm font-semibold text-slate-900">{level.label}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{level.summary}</p>
              {!compact ? (
                <ul className="mt-2 space-y-1 text-xs text-slate-600">
                  {level.highlights.slice(0, 2).map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              ) : null}
              {isCurrent ? (
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">Plano atual</p>
              ) : (
                <Link to={level.ctaTo} className="mt-2 inline-flex">
                  <Button variant="outline" className="h-8 rounded-lg px-3 text-xs">
                    {level.ctaLabel}
                  </Button>
                </Link>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

