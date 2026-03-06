import React from 'react';
import { PageFrame } from './PageFrame';

export default function Page17Environment({ data, pageNumber }) {
  const motivators = data?.motivators || [];

  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Ambiente Ideal e Motivadores"
      subtitle="Condições que aumentam performance e engajamento"
    >
      <div className="pdf-card avoid-break">
        <p>{data?.interpretation?.environment || 'Ambiente ideal indisponível.'}</p>
      </div>

      <div className="pdf-grid">
        <div className="pdf-card avoid-break">
          <h3 className="pdf-section-title">O que tende a energizar</h3>
          <ul className="pdf-list">
            {motivators.slice(0, 4).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="pdf-card avoid-break">
          <h3 className="pdf-section-title">O que tende a desgastar</h3>
          <ul className="pdf-list">
            {(data?.drainers || []).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </PageFrame>
  );
}
