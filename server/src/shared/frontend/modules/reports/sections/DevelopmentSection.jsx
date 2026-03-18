import React from 'react';
import { TrendingUp } from 'lucide-react';
import { ReportSection } from '@/modules/reports/components';

export default function DevelopmentSection({
  developmentRecommendations = [],
  attentionPoints = [],
  nextSteps = [],
}) {
  return (
    <ReportSection
      id="development"
      icon={TrendingUp}
      title="Desenvolvimento e próximos passos"
      subtitle="Recomendações práticas para evolução comportamental e ganho de consistência em performance."
    >
      <div className="grid gap-3 xl:grid-cols-[1.15fr_1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Recomendações práticas</h3>
          {developmentRecommendations.length ? (
            <ol className="mt-2 space-y-2 text-sm text-slate-700">
              {developmentRecommendations.map((item, index) => (
                <li key={item} className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2">
                  <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                    {index + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Sem recomendações adicionais mapeadas para este perfil.</p>
          )}
        </article>

        <div className="space-y-3">
          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Competências para fortalecer</h3>
            {(attentionPoints || []).slice(0, 4).length ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {attentionPoints.slice(0, 4).map((item) => (
                  <li key={item} className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Sem competências críticas sinalizadas no momento.</p>
            )}
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Plano inicial de desenvolvimento</h3>
            {nextSteps.length ? (
              <ul className="mt-2 space-y-2 text-sm text-slate-700">
                {nextSteps.map((step) => (
                  <li key={step.id} className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2">
                    <p className="font-semibold text-slate-900">{step.title}</p>
                    <p className="mt-1">{step.description}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Plano inicial será disponibilizado após próxima atualização de leitura.</p>
            )}
          </article>
        </div>
      </div>
    </ReportSection>
  );
}
