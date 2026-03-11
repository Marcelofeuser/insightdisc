import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { ReportSection } from '@/modules/reports/components';

function InsightCard({ title, text }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {text || 'Leitura em consolidação para este eixo de liderança.'}
      </p>
    </article>
  );
}

function ListCard({ title, items = [], emptyMessage }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {items.length ? (
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          {items.map((item) => (
            <li key={item} className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{emptyMessage}</p>
      )}
    </article>
  );
}

export default function LeadershipInsightsSection({ leadershipInsights = {} }) {
  return (
    <ReportSection
      id="leadership-insights"
      icon={ShieldCheck}
      title="Inteligência de liderança"
      subtitle="Leitura automática de liderança, decisão, conflitos, pressão e gestão de equipe com base no DISC."
    >
      <p className="rounded-xl border border-indigo-100 bg-indigo-50/70 px-3 py-2 text-sm text-indigo-900">
        {leadershipInsights?.summaryMedium ||
          'Sem dados suficientes para consolidar inteligência de liderança.'}
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <InsightCard title="Estilo de liderança" text={leadershipInsights?.leadershipStyle} />
        <InsightCard title="Forma de decisão" text={leadershipInsights?.decisionStyle} />
        <InsightCard title="Gestão de conflitos" text={leadershipInsights?.conflictManagement} />
        <InsightCard title="Gestão sob pressão" text={leadershipInsights?.pressureManagement} />
        <InsightCard title="Gestão de equipe" text={leadershipInsights?.teamManagement} />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ListCard
          title="Pontos fortes de liderança"
          items={leadershipInsights?.leadershipStrengths || []}
          emptyMessage="Sem pontos fortes adicionais mapeados nesta leitura."
        />
        <ListCard
          title="Riscos de liderança"
          items={leadershipInsights?.leadershipRisks || []}
          emptyMessage="Sem riscos críticos de liderança mapeados."
        />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ListCard
          title="Como liderar melhor"
          items={leadershipInsights?.recommendations || []}
          emptyMessage="Sem recomendações adicionais neste momento."
        />
        <ListCard
          title="Lidando com perfis diferentes"
          items={leadershipInsights?.differentProfilesGuidance || []}
          emptyMessage="Sem orientações adicionais por contraste de perfil."
        />
      </div>
    </ReportSection>
  );
}
