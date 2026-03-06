import React from 'react';
import { FACTOR_META, PageFrame, ScoreBars, formatPercent } from './PageFrame';

export default function Page04Overview({ data, pageNumber }) {
  const natural = data?.scores?.natural || {};

  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Resultado Geral"
      subtitle="Distribuição dos fatores D, I, S e C"
    >
      <ScoreBars title="Pontuação geral (perfil natural)" scores={natural} />

      <div className="pdf-card avoid-break">
        <h3 className="pdf-section-title">Leitura objetiva</h3>
        <table className="pdf-table">
          <thead>
            <tr>
              <th>Fator</th>
              <th>Descrição</th>
              <th>Pontuação</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(FACTOR_META).map((factor) => (
              <tr key={factor}>
                <td>
                  <strong>{factor}</strong>
                </td>
                <td>{FACTOR_META[factor].label}</td>
                <td>{formatPercent(natural?.[factor])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageFrame>
  );
}
