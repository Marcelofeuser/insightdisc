import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
      title="Planos para cada estágio da operação"
      description="Comece com o essencial e evolua para comparação, relatórios premium e inteligência organizacional."
      centered
    >
      {hasVariablePricing ? (
        <div className="mb-8 flex justify-center">
          <div className="pricing-toggle">
            <button
              type="button"
              id="monthly-btn"
              data-period="monthly"
              className={billingPeriod === 'monthly' ? 'active' : ''}
              onClick={() => setBillingPeriod('monthly')}
            >
              Mensal
            </button>
            <button
              type="button"
              id="annual-btn"
              data-period="annual"
              className={billingPeriod === 'annual' ? 'active' : ''}
              onClick={() => setBillingPeriod('annual')}
            >
              Anual (-20%)
            </button>
          </div>
        </div>
      ) : null}
      <div className="grid gap-8 md:grid-cols-3">
        {plans.map((plan) => {
          const displayPrice = plan.pricing
            ? billingPeriod === 'annual'
              ? plan.pricing.annual
              : plan.pricing.monthly
            : null;
          const monthlyPrice = plan.pricing?.monthly?.replace('R$', '');
          const annualPrice = plan.pricing?.annual?.replace('R$', '');

          return (
            <article
              key={plan.name}
              className={[
                'glass-card feature-card scroll-reveal relative rounded-3xl p-8',
                plan.featured
                  ? 'border border-blue-500/40'
                  : '',
              ].join(' ')}
            >
              {plan.featured ? (
                <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-4 py-1 text-sm font-semibold text-white">
                  Mais popular
                </span>
              ) : null}
              <h3 className={`mb-2 text-lg font-semibold ${plan.featured ? 'text-blue-400' : 'text-slate-400'}`}>
                {plan.name}
              </h3>
              {displayPrice ? (
                <div
                  className="price mb-3 flex items-baseline gap-1"
                  data-monthly={monthlyPrice}
                  data-annual={annualPrice}
                >
                  <span className="text-4xl font-extrabold">{displayPrice}</span>
                  <span className="text-slate-500">
                    {billingPeriod === 'annual' ? '/mês (anual)' : '/mês'}
                  </span>
                </div>
              ) : (
                <div className="mb-3 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{plan.customLabel || 'Custom'}</span>
                </div>
              )}
              <p className="mb-6 text-sm text-slate-400">{plan.subtitle}</p>
              <ul className="mb-8 space-y-3 text-slate-300">
                {plan.highlights.map((highlight) => (
                  <li key={highlight}>• {highlight}</li>
                ))}
              </ul>
              <Link
                to={plan.to}
                className={[
                  'block w-full rounded-2xl py-4 text-center font-semibold transition-all',
                  plan.featured
                    ? 'btn-primary hover:shadow-lg'
                    : 'border border-slate-700 hover:bg-slate-800',
                ].join(' ')}
              >
                {plan.ctaLabel}
              </Link>
            </article>
          );
        })}
      </div>
    </SectionShell>
  );
}
