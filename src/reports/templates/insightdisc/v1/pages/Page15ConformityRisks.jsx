import React from 'react';
import { PageFrame } from './PageFrame';

export default function Page15ConformityRisks({ data, pageNumber }) {
  const attention = data?.factors?.C?.attention || ['Perfeccionismo', 'Excesso de análise', 'Baixa tolerância a erros'];
  const tips = data?.factors?.C?.tips || ['Definir limite de decisão', 'Priorizar impacto sobre perfeição', 'Delegar com critérios objetivos'];

  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Conformidade (C) — Pontos de Atenção"
      subtitle="Como manter precisão sem perder velocidade"
    >
      <div className="pdf-grid">
        <div className="pdf-card avoid-break">
          <h3 className="pdf-section-title">Riscos sob pressão</h3>
          <ul className="pdf-list">
            {attention.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="pdf-card avoid-break">
          <h3 className="pdf-section-title">Ajustes recomendados</h3>
          <ul className="pdf-list">
            {tips.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </PageFrame>
  );
}
