import React from 'react';
import { PageFrame } from './PageFrame';

export default function Page10InfluenceStrengths({ data, pageNumber }) {
  const strengths = data?.factors?.I?.strengths || ['Persuasão', 'Relacionamento', 'Otimismo'];

  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Influência (I) — Pontos Fortes"
      subtitle="Conexão social, energia e impacto interpessoal"
    >
      <div className="pdf-card avoid-break">
        <p>
          A dimensão I está associada à comunicação, networking e capacidade de engajar pessoas em
          torno de objetivos comuns.
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
