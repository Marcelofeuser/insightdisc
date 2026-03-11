import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionShell from './SectionShell';

export default function AudienceCardsSection({ items }) {
  return (
    <SectionShell
      id="publicos"
      eyebrow="Para quem e"
      title="Uma plataforma, varios contextos de aplicacao"
      description="Empresas, RH, consultores, lideres e pessoas em desenvolvimento podem operar com a mesma base semantica DISC."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
            <Link to={item.to} className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:text-indigo-600">
              {item.ctaLabel}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

