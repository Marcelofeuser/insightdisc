import React from 'react';
import { Sparkles, Target } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';

function ListBlock({ title, items = [], tone = 'slate' }) {
  const toneClass =
    tone === 'warning'
      ? 'border-amber-200 bg-amber-50/70 text-amber-900'
      : tone === 'danger'
        ? 'border-rose-200 bg-rose-50/70 text-rose-800'
        : 'border-slate-200 bg-slate-50/70 text-slate-700';

  return (
    <article className={`rounded-xl border p-4 ${toneClass}`}>
      <h4 className="text-sm font-semibold">{title}</h4>
      {items.length ? (
        <ul className="mt-2 space-y-2 text-sm">
          {items.map((item) => (
            <li key={item} className="rounded-lg border border-white/70 bg-white/70 px-2.5 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm opacity-90">Sem alertas adicionais nesta leitura.</p>
      )}
    </article>
  );
}

export default function TeamAutoCompositionPanel({ analysis = {} }) {
  const recommendedProfiles = Array.isArray(analysis?.recommendedProfiles)
    ? analysis.recommendedProfiles
    : [];

  return (
    <PanelShell>
      <SectionHeader
        icon={Sparkles}
        title="Inteligência de time automática"
        subtitle="Recomendações de composição comportamental para equilibrar liderança, execução, estabilidade, influência e qualidade."
      />

      {analysis?.executiveNote ? (
        <p className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/70 px-3 py-2 text-sm text-indigo-900">
          {analysis.executiveNote}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 xl:grid-cols-2">
        <ListBlock
          title="Riscos de composição atual"
          items={analysis?.teamRisks || []}
          tone="danger"
        />
        <ListBlock
          title="Oportunidades de equilíbrio"
          items={analysis?.opportunities || []}
          tone="warning"
        />
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-2">
        <ListBlock
          title="Ações automáticas recomendadas"
          items={analysis?.autoCompositionRecommendations || []}
        />

        <article className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-emerald-900">
          <h4 className="inline-flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4" />
            Perfis sugeridos para reforço
          </h4>
          {recommendedProfiles.length ? (
            <div className="mt-2 space-y-2">
              {recommendedProfiles.map((item) => (
                <div key={`${item.profileCode}-${item.rationale}`} className="rounded-lg border border-emerald-200 bg-white/80 px-2.5 py-2">
                  <p className="text-sm font-semibold">{item.profileCode}</p>
                  <p className="mt-0.5 text-xs">{item.rationale}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm">Sem indicação crítica de reforço de perfil neste momento.</p>
          )}
        </article>
      </div>
    </PanelShell>
  );
}
