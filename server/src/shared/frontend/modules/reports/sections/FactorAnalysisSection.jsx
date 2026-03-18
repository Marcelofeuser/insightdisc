import React from 'react';
import { Microscope } from 'lucide-react';
import { DISC_FACTOR_COLORS } from '@/modules/analytics/constants';
import { ReportSection } from '@/modules/reports/components';

function FactorCard({ item }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            {item.factor} • {item.label}
          </h3>
          <p className="mt-1 text-sm text-slate-600">Intensidade {item.intensity.label.toLowerCase()}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-slate-900">{item.score.toFixed(1)}%</p>
          <div className="mt-1 flex flex-wrap justify-end gap-1">
            {item.isPrimary ? (
              <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-700">
                Primário
              </span>
            ) : null}
            {!item.isPrimary && item.isSecondary ? (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                Secundário
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-3 h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full"
          style={{
            width: `${Math.max(0, Math.min(100, item.score))}%`,
            backgroundColor: DISC_FACTOR_COLORS[item.factor],
          }}
        />
      </div>

      <div className="mt-3 space-y-2 text-sm">
        <p className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2 text-slate-700">
          <span className="font-semibold text-slate-900">Leitura semântica:</span> {item.semanticReading}
        </p>
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-700">
          <span className="font-semibold text-slate-900">Impacto comportamental:</span> {item.impact}
        </p>
      </div>
    </article>
  );
}

export default function FactorAnalysisSection({ factorAnalysis = [] }) {
  return (
    <ReportSection
      id="factor-analysis"
      icon={Microscope}
      title="Análise dos fatores D, I, S e C"
      subtitle="Leitura detalhada de score, intensidade e impacto comportamental de cada fator."
    >
      <div className="grid gap-3 lg:grid-cols-2">
        {factorAnalysis.map((item) => (
          <FactorCard key={item.factor} item={item} />
        ))}
      </div>
    </ReportSection>
  );
}
