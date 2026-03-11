import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function CTASection({ content }) {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,#0f172a_0%,#1e3a8a_55%,#0ea5e9_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_45%)]" />
      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{content.title}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-sky-100 sm:text-lg">{content.description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to={content.primary.to}>
            <Button size="lg" className="h-12 rounded-xl bg-white px-6 font-semibold text-indigo-700 hover:bg-slate-100">
              {content.primary.label}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link to={content.secondary.to}>
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-xl border-white/40 bg-transparent px-6 font-semibold text-white hover:bg-white/10"
            >
              {content.secondary.label}
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

