import React from 'react';
import { PageFrame } from './PageFrame';

export default function Page11InfluenceRisks({ data, pageNumber }) {
  const attention = data?.factors?.I?.attention || ['Dispersão', 'Excesso de otimismo', 'Dificuldade em priorizar'];
  const tips = data?.factors?.I?.tips || ['Fechar acordos por escrito', 'Definir prioridades semanais', 'Balancear entusiasmo com dados'];

  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Influência (I) — Pontos de Atenção"
      subtitle="Como manter foco e execução"
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
