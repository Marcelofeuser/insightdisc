import React from 'react';
import { PageFrame } from './PageFrame';

export default function Page12SteadinessStrengths({ data, pageNumber }) {
  const strengths = data?.factors?.S?.strengths || ['Paciência', 'Cooperação', 'Consistência'];

  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Estabilidade (S) — Pontos Fortes"
      subtitle="Ritmo sustentável, confiança e previsibilidade"
    >
      <div className="pdf-card avoid-break">
        <p>
          A dimensão S tende a favorecer ambientes de colaboração, continuidade e segurança
          relacional, sustentando execução com qualidade ao longo do tempo.
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
