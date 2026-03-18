import React from 'react';
import { FACTOR_META, PageFrame, formatPercent } from './PageFrame';

export default function Page07Comparison({ data, pageNumber }) {
  const natural = data?.scores?.natural || {};
  const adapted = data?.scores?.adapted || {};

  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Comparativo Natural vs Adaptado"
      subtitle="Diferenças comportamentais por fator"
    >
      <div className="pdf-card avoid-break">
        <table className="pdf-table">
          <thead>
            <tr>
              <th>Fator</th>
              <th>Natural</th>
              <th>Adaptado</th>
              <th>Variação</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(FACTOR_META).map((factor) => {
              const n = Number(natural?.[factor] || 0);
              const a = Number(adapted?.[factor] || 0);
              const delta = Math.round(a - n);
              return (
                <tr key={factor}>
                  <td>
                    <strong>{factor}</strong> — {FACTOR_META[factor].label}
                  </td>
                  <td>{formatPercent(n)}</td>
                  <td>{formatPercent(a)}</td>
                  <td>{delta > 0 ? `+${delta}` : `${delta}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="pdf-card avoid-break">
        <p>
          Interprete as diferenças como ajustes de contexto. Variações moderadas são esperadas; o
          foco deve estar em sustentabilidade do desempenho ao longo do tempo.
        </p>
      </div>
    </PageFrame>
  );
}
