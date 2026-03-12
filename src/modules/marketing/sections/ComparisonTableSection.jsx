import React from 'react';
import SectionShell from './SectionShell';

export default function ComparisonTableSection({ title, rows }) {
  const isPlanComparison = Array.isArray(rows) && rows.length > 0 && Object.prototype.hasOwnProperty.call(rows[0], 'personal');
  const resolveCellTone = (value, highlighted = false) => {
    if (value === '✓') {
      return highlighted ? 'text-emerald-300 font-bold' : 'text-emerald-400 font-bold';
    }
    return highlighted ? 'text-slate-400' : 'text-slate-500';
  };

  return (
    <SectionShell
      id="comparativo"
      eyebrow="Comparativo"
      title={title}
      description={
        isPlanComparison
          ? 'Veja exatamente o que você ganha em cada plano.'
          : 'Entenda de forma objetiva como a plataforma amplia o valor do DISC em relacao a uma leitura simples.'
      }
    >
      {isPlanComparison ? (
        <div className="landing-card overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-5 py-4 text-sm font-bold uppercase tracking-[0.08em] text-slate-300">Recurso</th>
                  <th className="px-5 py-4 text-center text-sm font-bold uppercase tracking-[0.08em] text-slate-300">Personal</th>
                  <th className="bg-blue-500/10 px-5 py-4 text-center text-sm font-bold uppercase tracking-[0.08em] text-blue-300">Professional</th>
                  <th className="px-5 py-4 text-center text-sm font-bold uppercase tracking-[0.08em] text-slate-300">Business</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.metric} className="border-t border-slate-200/60 transition-colors hover:bg-white/5">
                    <td className="landing-card-title px-5 py-4 text-sm font-semibold">{row.metric}</td>
                    <td className={`landing-card-text px-5 py-4 text-center text-sm ${resolveCellTone(row.personal)}`}>{row.personal}</td>
                    <td className={`landing-card-text bg-blue-500/5 px-5 py-4 text-center text-sm ${resolveCellTone(row.professional, true)}`}>
                      {row.professional}
                    </td>
                    <td className={`landing-card-text px-5 py-4 text-center text-sm ${resolveCellTone(row.business)}`}>{row.business}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="landing-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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
                <p className="landing-card-title font-semibold text-slate-900">{row.metric}</p>
                <p className="landing-card-text text-center text-slate-500">{row.basic}</p>
                <p className="landing-card-text text-right text-slate-700">{row.insightdisc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionShell>
  );
}
