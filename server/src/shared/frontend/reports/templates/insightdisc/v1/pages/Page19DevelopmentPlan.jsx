import React from 'react';
import { PageFrame } from './PageFrame';

export default function Page19DevelopmentPlan({ data, pageNumber }) {
  const plan = data?.actionPlan || [];

  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Plano de Desenvolvimento"
      subtitle="Ações objetivas para os próximos 30 dias"
    >
      <div className="pdf-card avoid-break">
        <ol className="pdf-list">
          {plan.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>

      <div className="pdf-card avoid-break">
        <h3 className="pdf-section-title">Métrica de acompanhamento</h3>
        <p>
          Defina um indicador semanal simples (ex.: qualidade de feedback, tempo de decisão,
          clareza de comunicação) e registre evolução por quatro semanas.
        </p>
      </div>
    </PageFrame>
  );
}
