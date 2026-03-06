import React from 'react';
import { PageFrame } from './PageFrame';

export default function Page13SteadinessRisks({ data, pageNumber }) {
  const attention = data?.factors?.S?.attention || ['Resistência a mudanças bruscas', 'Evitar conflitos necessários'];
  const tips = data?.factors?.S?.tips || ['Comunicar mudanças com antecedência', 'Definir limites e prioridades', 'Praticar feedback direto'];

  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Estabilidade (S) — Pontos de Atenção"
      subtitle="Como acelerar sem perder consistência"
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
