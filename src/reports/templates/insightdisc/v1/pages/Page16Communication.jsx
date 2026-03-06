import React from 'react';
import { FACTOR_META, PageFrame } from './PageFrame';

export default function Page16Communication({ data, pageNumber }) {
  const communication = data?.communicationByFactor || {};

  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Comunicação"
      subtitle="Como ajustar mensagem para cada perfil"
    >
      <div className="pdf-card avoid-break">
        <p>{data?.interpretation?.communication || 'Comunicação preferencial indisponível.'}</p>
      </div>

      <div className="pdf-card avoid-break">
        <table className="pdf-table">
          <thead>
            <tr>
              <th>Perfil</th>
              <th>Abordagem recomendada</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(FACTOR_META).map((factor) => (
              <tr key={factor}>
                <td>
                  <strong>{factor}</strong> — {FACTOR_META[factor].label}
                </td>
                <td>{communication?.[factor] || 'Use linguagem clara, objetiva e contextual.'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
