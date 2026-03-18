import React from 'react';
import { MessageSquareText, Users } from 'lucide-react';
import { ReportSection } from '@/modules/reports/components';

function ReadingCard({ title, description }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {description || 'Leitura em consolidação para este eixo comportamental.'}
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
            <li key={item} className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2">
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

export default function BehavioralReadingsSection({ interpretation = {} }) {
  const readings = [
    { title: 'Estilo de comunicação', value: interpretation?.communicationStyle },
    { title: 'Tomada de decisão', value: interpretation?.decisionMaking },
    { title: 'Liderança', value: interpretation?.leadershipStyle },
    { title: 'Estilo de trabalho', value: interpretation?.workStyle },
    { title: 'Colaboração e relacionamento', value: interpretation?.relationshipStyle },
    { title: 'Comportamento sob pressão', value: interpretation?.pressureResponse },
    { title: 'Ambiente ideal', value: interpretation?.idealEnvironment },
  ];

  return (
    <ReportSection
      id="behavioral-readings"
      icon={MessageSquareText}
      title="Leituras comportamentais"
      subtitle="Interpretação aplicada de comunicação, decisão, liderança, trabalho e colaboração."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {readings.map((reading) => (
          <ReadingCard key={reading.title} title={reading.title} description={reading.value} />
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ListCard
          title="Motivadores"
          items={interpretation?.motivators || []}
          emptyMessage="Sem motivadores adicionais mapeados para este momento."
        />
        <ListCard
          title="Desafios potenciais"
          items={interpretation?.potentialChallenges || []}
          emptyMessage="Sem desafios críticos destacados nesta leitura."
        />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Learning style</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {interpretation?.learningStyle || 'Estilo de aprendizagem em consolidação para este perfil.'}
          </p>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Users className="h-4 w-4" />
            Notas de adaptação
          </h3>
          {(interpretation?.adaptationNotes || []).length ? (
            <ul className="mt-2 space-y-2 text-sm text-slate-700">
              {interpretation.adaptationNotes.map((item) => (
                <li key={item} className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Sem notas adicionais de adaptação no momento.</p>
          )}
        </article>
      </div>
    </ReportSection>
  );
}
