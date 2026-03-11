import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PersonaHero({ content }) {
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_70%)] pb-16 pt-28 sm:pt-32">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 left-1/2 h-72 w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.15)_0%,rgba(37,99,235,0)_74%)]" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6">
        <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
          {content.badge}
        </span>
        <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-tight text-slate-900 sm:text-5xl">
          {content.title}
        </h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-600">{content.subtitle}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to={content.primaryCta.to}>
            <Button className="h-11 rounded-xl bg-indigo-600 px-6 font-semibold hover:bg-indigo-700">
              {content.primaryCta.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to={content.secondaryCta.to}>
            <Button variant="outline" className="h-11 rounded-xl border-slate-300 px-6 font-semibold text-slate-700">
              {content.secondaryCta.label}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

