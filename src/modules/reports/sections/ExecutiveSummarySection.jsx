import React from 'react';
import { BriefcaseBusiness } from 'lucide-react';
import { ReportSection } from '@/modules/reports/components';

export default function ExecutiveSummarySection({ executiveSummary = [] }) {
  return (
    <ReportSection
      id="executive-summary"
      icon={BriefcaseBusiness}
      title="Resumo executivo"
      subtitle="Síntese objetiva de ação, interação, decisão e contexto de melhor performance."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {executiveSummary.map((item) => (
          <article key={item.key} className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {item.value || 'Leitura em consolidação para este eixo executivo.'}
            </p>
          </article>
        ))}
      </div>
    </ReportSection>
  );
}
