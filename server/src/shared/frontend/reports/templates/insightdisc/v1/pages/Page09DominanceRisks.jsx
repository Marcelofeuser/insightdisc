import React from 'react';
import { PageFrame } from './PageFrame';

export default function Page09DominanceRisks({ data, pageNumber }) {
  const attention = data?.factors?.D?.attention || ['Impaciência', 'Excesso de controle', 'Confronto desnecessário'];
  const tips = data?.factors?.D?.tips || ['Escuta ativa antes da decisão', 'Delegar com critérios claros', 'Ajustar tom em conflitos'];

  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Dominância (D) — Pontos de Atenção"
      subtitle="Como reduzir riscos e aumentar consistência"
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
          <h3 className="pdf-section-title">Recomendações práticas</h3>
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
