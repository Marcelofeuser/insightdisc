import React from 'react';
import SectionShell from './SectionShell';

export default function PersonaPainPointsSection({ points }) {
  return (
    <SectionShell
      eyebrow="Desafios comuns"
      title="Dores que esta jornada costuma enfrentar"
      description="Mapeamos os pontos mais recorrentes para transformar leitura comportamental em decisao acionavel."
      className="bg-slate-50"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {points.map((point) => (
          <article key={point} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm leading-relaxed text-slate-700">{point}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

