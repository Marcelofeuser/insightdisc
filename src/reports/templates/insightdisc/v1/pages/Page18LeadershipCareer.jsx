import React from 'react';
import { PageFrame } from './PageFrame';

export default function Page18LeadershipCareer({ data, pageNumber }) {
  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Liderança e Carreira"
      subtitle="Aplicações práticas para evolução profissional"
    >
      <div className="pdf-card avoid-break">
        <h3 className="pdf-section-title">Estilo de liderança predominante</h3>
        <p>{data?.interpretation?.leadership || 'Estilo de liderança indisponível.'}</p>
      </div>

      <div className="pdf-grid">
        <div className="pdf-card avoid-break">
          <h3 className="pdf-section-title">Contribuições de carreira</h3>
          <ul className="pdf-list">
            {(data?.careerStrengths || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="pdf-card avoid-break">
          <h3 className="pdf-section-title">Focos de desenvolvimento</h3>
          <ul className="pdf-list">
            {(data?.careerDevelopment || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </PageFrame>
  );
}
