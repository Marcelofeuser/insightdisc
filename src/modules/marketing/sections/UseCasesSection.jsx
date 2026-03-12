import React from 'react';
import { Link } from 'react-router-dom';
import SectionShell from './SectionShell';

export default function UseCasesSection({ items }) {
  return (
    <SectionShell
      id="casos"
      eyebrow="Casos de uso"
      title="Onde a plataforma gera valor de verdade"
      description="Casos de uso reais para empresas, consultores e líderes."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.title}
            to={item.to}
            className="landing-card group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md"
          >
            <h3 className="landing-card-title text-lg font-semibold tracking-tight text-slate-900">{item.title}</h3>
            <p className="landing-card-text mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            <p className="landing-link mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Saiba mais</p>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}
