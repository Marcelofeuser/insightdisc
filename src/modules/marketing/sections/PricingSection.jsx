import React, { useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SectionShell from './SectionShell';

export default function PricingSection({ plans }) {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const hasVariablePricing = useMemo(
    () => plans.some((plan) => plan.pricing?.monthly && plan.pricing?.annual),
    [plans]
  );

  return (
    <SectionShell
      id="planos"
      eyebrow="Planos"
      title="Planos para cada estágio da operação"
      description="Comece com o essencial e evolua para comparação, relatórios premium e inteligência organizacional."
    >
      {hasVariablePricing ? (
        <div className="mb-8 flex justify-center">
          <div className="inline-flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              className={[
                'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                billingPeriod === 'monthly'
                  ? 'bg-indigo-500/25 text-white'
                  : 'text-slate-400 hover:text-slate-200',
              ].join(' ')}
              onClick={() => setBillingPeriod('monthly')}
            >
              Mensal
            </button>
            <button
              type="button"
              className={[
                'rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                billingPeriod === 'annual'
                  ? 'bg-indigo-500/25 text-white'
                  : 'text-slate-400 hover:text-slate-200',
              ].join(' ')}
              onClick={() => setBillingPeriod('annual')}
            >
              Anual (-20%)
            </button>
          </div>
        </div>
      ) : null}
      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => {
          const displayPrice = plan.pricing
            ? billingPeriod === 'annual'
              ? plan.pricing.annual
              : plan.pricing.monthly
            : null;

          return (
            <article
              key={plan.name}
              className={[
                'landing-card relative rounded-3xl border p-6 shadow-sm',
                plan.featured
                  ? 'border-indigo-600 bg-[linear-gradient(150deg,#1e1b4b_0%,#312e81_60%,#1d4ed8_100%)] text-white shadow-indigo-200'
                  : 'border-slate-200 bg-white',
              ].join(' ')}
            >
              {plan.featured ? (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                  Mais popular
                </span>
              ) : null}
              <p
                className={`text-xs font-semibold uppercase tracking-[0.14em] ${plan.featured ? 'text-indigo-200' : 'text-slate-500'}`}
              >
                {plan.name}
              </p>
              {displayPrice ? (
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight">{displayPrice}</span>
                  <span className={`text-xs font-semibold ${plan.featured ? 'text-indigo-100' : 'text-slate-500'}`}>
                    {billingPeriod === 'annual' ? '/mês (anual)' : '/mês'}
                  </span>
                </div>
              ) : (
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold tracking-tight">{plan.customLabel || 'Custom'}</span>
                </div>
              )}
              <p className={`mt-3 text-sm leading-relaxed ${plan.featured ? 'text-indigo-100' : 'text-slate-600'}`}>{plan.subtitle}</p>
              <ul className="mt-6 space-y-2">
                {plan.highlights.map((highlight) => (
                  <li
                    key={highlight}
                    className={`flex items-start gap-2 text-sm ${plan.featured ? 'text-indigo-100' : 'text-slate-700'}`}
                  >
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 ${plan.featured ? 'text-emerald-300' : 'text-emerald-500'}`} />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
              <Link to={plan.to} className="mt-6 inline-flex w-full">
                <Button
                  variant={plan.featured ? 'secondary' : 'default'}
                  className={`w-full rounded-xl ${plan.featured ? 'bg-white text-indigo-700 hover:bg-slate-100' : 'bg-slate-900 hover:bg-slate-800'}`}
                >
                  {plan.ctaLabel}
                </Button>
              </Link>
            </article>
          );
        })}
      </div>
    </SectionShell>
  );
}
