import React from 'react';
import { PageFrame } from './PageFrame';

export default function Page14ConformityStrengths({ data, pageNumber }) {
  const strengths = data?.factors?.C?.strengths || ['Análise crítica', 'Precisão', 'Padrão de qualidade'];

  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Conformidade (C) — Pontos Fortes"
      subtitle="Rigor, método e tomada de decisão baseada em dados"
    >
      <div className="pdf-card avoid-break">
        <p>
          A dimensão C favorece planejamento estruturado, pensamento analítico e controle de
          qualidade, reduzindo riscos em decisões complexas.
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
