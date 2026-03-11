import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SectionShell from './SectionShell';
import { getReportTierProgress } from '@/modules/reports/reportValueLadder';

export default function ReportLadderSection({
  currentTier = 'standard',
  title = 'Escada de valor dos relatorios',
  description = 'Do Standard Report ao Professional Report, a leitura evolui em profundidade e aplicacao.',
}) {
  const tiers = getReportTierProgress(currentTier);

  return (
    <SectionShell
      id="escada-relatorios"
      eyebrow="Relatorios"
      title={title}
      description={description}
      className="bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)]"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {tiers.map((tier) => (
          <article
            key={tier.tier}
            className={[
              'rounded-2xl border p-5 shadow-sm',
              tier.toneClassName,
              tier.state === 'current' ? 'ring-2 ring-indigo-200' : '',
            ].join(' ')}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{tier.audience}</p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-900">{tier.label}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{tier.summary}</p>
            <ul className="mt-4 space-y-1 text-sm text-slate-700">
              {tier.highlights.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            {tier.state === 'current' ? (
              <span className="mt-4 inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-700">
                Nivel atual
              </span>
            ) : (
              <Link to={tier.ctaTo} className="mt-4 inline-flex">
                <Button variant="outline" className="h-9 rounded-lg text-xs font-semibold">
                  {tier.ctaLabel}
                </Button>
              </Link>
            )}
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

