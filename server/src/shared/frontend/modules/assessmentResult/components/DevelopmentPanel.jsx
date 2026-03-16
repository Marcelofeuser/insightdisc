import React from 'react';
import { GraduationCap, Target } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';

function RecommendationList({ items = [] }) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm text-slate-500">
        Sem recomendações adicionais no momento. Novas avaliações ajudam a ampliar esse bloco.
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function DevelopmentPanel({
  summaryLong = '',
  learningStyle = '',
  developmentRecommendations = [],
  adaptationNotes = [],
}) {
  return (
    <PanelShell>
      <SectionHeader
        icon={Target}
        title="Desenvolvimento"
        subtitle="Recomendações práticas para evolução consistente do perfil comportamental."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Síntese ampliada</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">
              {summaryLong ||
                'Resumo ampliado indisponível no momento. Conclua nova avaliação para aprofundar a narrativa.'}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Recomendações práticas
            </p>
            <RecommendationList items={developmentRecommendations} />
          </div>
        </section>

        <section className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              <GraduationCap className="h-4 w-4" />
              Estilo de aprendizagem
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {learningStyle || 'Estilo de aprendizagem em mapeamento comportamental.'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Notas de adaptação
            </p>
            {adaptationNotes?.length ? (
              <ul className="mt-2 space-y-2">
                {adaptationNotes.map((note) => (
                  <li
                    key={note}
                    className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-sm text-slate-600"
                  >
                    {note}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                Sem notas adicionais de adaptação para este resultado.
              </p>
            )}
          </div>
        </section>
      </div>
    </PanelShell>
  );
}

