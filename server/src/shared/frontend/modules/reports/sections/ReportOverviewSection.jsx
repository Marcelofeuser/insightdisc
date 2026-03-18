import React from 'react';
import { BarChart3, Sparkles } from 'lucide-react';
import { DiscRadarChart } from '@/modules/analytics/components';
import { DiscScoreSummary } from '@/modules/assessmentResult/components';
import { ReportSection } from '@/modules/reports/components';

export default function ReportOverviewSection({ interpretation, discSnapshot }) {
  return (
    <div id="overview" className="grid gap-4 xl:grid-cols-[1.2fr_1fr] scroll-mt-24">
      <DiscRadarChart
        title="Radar DISC"
        subtitle="Intensidade dos fatores D, I, S e C no perfil avaliado."
        profile={discSnapshot?.summary || {}}
        emptyMessage="Conclua uma avaliação com scores DISC válidos para habilitar o radar do relatório."
      />

      <ReportSection
        id="overall"
        icon={BarChart3}
        title="Visão geral do perfil"
        subtitle="Leitura resumida e intensidade dos fatores para interpretação rápida."
      >
        <div className="space-y-4">
          <p className="rounded-xl border border-slate-200 bg-white p-3 text-sm leading-relaxed text-slate-600">
            {interpretation?.summaryMedium || interpretation?.summaryShort}
          </p>
          <p className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-sm leading-relaxed text-slate-600">
            {interpretation?.summaryLong || interpretation?.summaryMedium}
          </p>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <Sparkles className="h-4 w-4" />
              Leitura rápida do estilo predominante
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {interpretation?.styleLabel || 'Estilo DISC em consolidação'}
            </p>
          </div>

          <DiscScoreSummary
            scores={discSnapshot?.summary || {}}
            primaryFactor={interpretation?.primaryFactor || ''}
            secondaryFactor={interpretation?.secondaryFactor || ''}
          />
        </div>
      </ReportSection>
    </div>
  );
}
