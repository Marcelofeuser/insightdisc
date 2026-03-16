import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import SectionShell from './SectionShell';

export default function CoreFlowsSection({ flows }) {
  return (
    <SectionShell
      eyebrow="Fluxo completo"
      title="Da avaliacao ao uso estrategico em 6 passos"
      description="Cada etapa foi desenhada para transformar leitura comportamental em acao de negocio."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {flows.map((flow, index) => (
          <Link
            key={flow.title}
            to={flow.to}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-600">Passo {index + 1}</p>
            <h3 className="mt-2 text-lg font-semibold tracking-tight text-slate-900">{flow.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{flow.description}</p>
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 group-hover:text-indigo-600">
              Abrir fluxo
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </SectionShell>
  );
}

