import React from 'react';

export const FACTOR_META = {
  D: { label: 'Dominância', color: '#ef4444' },
  I: { label: 'Influência', color: '#f97316' },
  S: { label: 'Estabilidade', color: '#22c55e' },
  C: { label: 'Conformidade', color: '#3b82f6' },
};

export function formatPercent(value) {
  const num = Number(value);
  const safe = Number.isFinite(num) ? num : 0;
  return `${Math.round(safe)}%`;
}

export function PageFrame({ pageNumber, totalPages = 20, title, subtitle, children }) {
  return (
    <section className="pdf-page">
      <div className="pdf-brand avoid-break">
        <div>
          <div className="pdf-brand-name">InsightDISC</div>
          <div className="pdf-brand-subtitle">Plataforma de Análise Comportamental</div>
        </div>
        <div className="pdf-page-meta">
          Página {pageNumber} de {totalPages}
        </div>
      </div>

      {title ? <h1 className="pdf-title">{title}</h1> : null}
      {subtitle ? <p className="pdf-subtitle">{subtitle}</p> : null}
      {children}
    </section>
  );
}

export function ScoreBars({ title, scores = {} }) {
  return (
    <div className="pdf-card avoid-break">
      {title ? <h3 className="pdf-section-title">{title}</h3> : null}
      {Object.keys(FACTOR_META).map((factor) => {
        const value = Number(scores?.[factor] || 0);
        const safe = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
        const meta = FACTOR_META[factor];

        return (
          <div key={factor} className="pdf-score-row">
            <div className="pdf-score-label">
              <span>
                {factor} — {meta.label}
              </span>
              <span>{formatPercent(safe)}</span>
            </div>
            <div className="pdf-score-track">
              <div
                className="pdf-score-fill"
                style={{ width: `${safe}%`, backgroundColor: meta.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
