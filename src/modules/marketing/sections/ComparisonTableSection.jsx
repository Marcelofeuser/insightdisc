import React from 'react';
import SectionShell from './SectionShell';

export default function ComparisonTableSection({ title, rows }) {
  return (
    <SectionShell
      eyebrow="Comparativo"
      title={title}
      description="Entenda de forma objetiva como a plataforma amplia o valor do DISC em relacao a uma leitura simples."
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-[1.3fr,1fr,1.3fr] bg-slate-900 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-100 sm:px-6">
          <span>Dimensao</span>
          <span className="text-center">DISC simples</span>
          <span className="text-right">InsightDISC</span>
        </div>
        <div>
          {rows.map((row) => (
            <div
              key={row.metric}
              className="grid grid-cols-[1.3fr,1fr,1.3fr] gap-4 border-t border-slate-200 px-4 py-4 text-sm sm:px-6"
            >
              <p className="font-semibold text-slate-900">{row.metric}</p>
              <p className="text-center text-slate-500">{row.basic}</p>
              <p className="text-right text-slate-700">{row.insightdisc}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

