import React from 'react';
import { Link } from 'react-router-dom';

export default function CTASection({ content }) {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="glass-card scroll-reveal relative overflow-hidden rounded-[32px] p-12 text-center md:p-16">
          <div className="disc-gradient absolute inset-0 opacity-10" />
          <div className="relative">
            <h2 className="text-4xl font-extrabold md:text-5xl">{content.title}</h2>
            <p className="mt-6 text-xl text-slate-400">{content.description}</p>
            <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
              <Link to={content.primary.to} className="btn-primary cta-pulse rounded-2xl px-10 py-5 text-lg font-bold">
                {content.primary.label}
              </Link>
              <Link
                to={content.secondary.to}
                className="glass-card rounded-2xl border border-white/10 px-10 py-5 text-lg font-bold text-slate-200 transition-all hover:border-white/20"
              >
                {content.secondary.label}
              </Link>
            </div>
            <p className="mt-8 text-sm text-slate-500">Sem cartão de crédito • Teste inicial • Evolua conforme o uso</p>
          </div>
        </div>
      </div>
    </section>
  );
}
