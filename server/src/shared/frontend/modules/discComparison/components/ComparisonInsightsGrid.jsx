import React from 'react';
import { MessageSquareText } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';

function InsightCard({ title, description }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description || 'Leitura comparativa indisponivel.'}</p>
    </article>
  );
}

export default function ComparisonInsightsGrid({
  comparison,
}) {
  const insights = [
    { title: 'Comunicacao', value: comparison?.communicationDynamics },
    { title: 'Tomada de decisao', value: comparison?.decisionDynamics },
    { title: 'Estilo de trabalho', value: comparison?.workStyleDynamics },
    { title: 'Colaboracao', value: comparison?.collaborationDynamics },
    { title: 'Lideranca e influencia', value: comparison?.leadershipDynamics },
    { title: 'Ritmo e estabilidade', value: comparison?.workRhythmDynamics },
    { title: 'Tolerancia a risco', value: comparison?.riskToleranceDynamics },
    { title: 'Qualidade e organizacao', value: comparison?.qualityDynamics },
    { title: 'Resposta sob pressao', value: comparison?.pressureDynamics },
  ];

  return (
    <PanelShell>
      <SectionHeader
        icon={MessageSquareText}
        title="Analise comportamental comparativa"
        subtitle="Leitura pratica da dinamica entre os dois perfis em comunicacao, decisao e execucao."
      />

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {insights.map((item) => (
          <InsightCard key={item.title} title={item.title} description={item.value} />
        ))}
      </div>
    </PanelShell>
  );
}
