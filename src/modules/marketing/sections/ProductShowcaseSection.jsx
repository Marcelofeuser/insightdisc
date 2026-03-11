import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionShell from './SectionShell';

export default function ProductShowcaseSection({ items }) {
  return (
    <SectionShell
      id="plataforma"
      eyebrow="Prova visual do produto"
      title="Veja a plataforma em acao"
      description="Painel, relatorio, comparador, team map e job matching trabalhando juntos em uma experiencia unica."
    >
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article
            key={item.title}
            className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg"
          >
            <div className="h-28 bg-[linear-gradient(120deg,#0f172a_0%,#1d4ed8_48%,#0ea5e9_100%)] px-5 py-4">
              <p className="inline-flex rounded-full border border-white/25 bg-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-100">
                {item.tag}
              </p>
              <div className="mt-4 grid grid-cols-6 gap-1">
                {Array.from({ length: 6 }).map((_, index) => (
                  <span key={`${item.title}-${index}`} className="h-1.5 rounded bg-white/70" />
                ))}
              </div>
            </div>
            <div className="p-5">
              <h3 className="text-lg font-semibold tracking-tight text-slate-900">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
              <Link
                to={item.to}
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 transition-colors group-hover:text-indigo-500"
              >
                Explorar modulo
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

