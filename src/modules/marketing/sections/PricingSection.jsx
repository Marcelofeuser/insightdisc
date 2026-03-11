import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import SectionShell from './SectionShell';

export default function PricingSection({ plans }) {
  return (
    <SectionShell
      id="planos"
      eyebrow="Planos"
      title="Escolha o plano da sua jornada"
      description="A mesma base de inteligencia comportamental com escopo diferente para personal, professional e business."
    >
      <div className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <article
            key={plan.name}
            className={[
              'rounded-3xl border p-6 shadow-sm',
              plan.featured
                ? 'border-indigo-600 bg-[linear-gradient(150deg,#1e1b4b_0%,#312e81_60%,#1d4ed8_100%)] text-white shadow-indigo-200'
                : 'border-slate-200 bg-white',
            ].join(' ')}
          >
            <p className={`text-xs font-semibold uppercase tracking-[0.14em] ${plan.featured ? 'text-indigo-200' : 'text-slate-500'}`}>
              {plan.name}
            </p>
            <p className={`mt-3 text-sm leading-relaxed ${plan.featured ? 'text-indigo-100' : 'text-slate-600'}`}>{plan.subtitle}</p>
            <ul className="mt-6 space-y-2">
              {plan.highlights.map((highlight) => (
                <li key={highlight} className={`flex items-start gap-2 text-sm ${plan.featured ? 'text-indigo-100' : 'text-slate-700'}`}>
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
        ))}
      </div>
    </SectionShell>
  );
}

