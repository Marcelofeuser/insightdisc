import React from 'react';
import { PageFrame } from './PageFrame';

export default function Page08DominanceStrengths({ data, pageNumber }) {
  const strengths = data?.factors?.D?.strengths || ['Decisão rápida', 'Foco em metas', 'Assertividade'];

  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Dominância (D) — Pontos Fortes"
      subtitle="Direção, agilidade e foco em resultado"
    >
      <div className="pdf-card avoid-break">
        <h3 className="pdf-section-title">Características centrais</h3>
        <p>
          A dimensão D representa impulso para resultado, objetividade e rapidez de decisão,
          especialmente em ambientes desafiadores.
        </p>
      </div>

      <div className="pdf-card avoid-break">
        <h3 className="pdf-section-title">Forças associadas</h3>
        <ul className="pdf-list">
          {strengths.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </PageFrame>
  );
}
