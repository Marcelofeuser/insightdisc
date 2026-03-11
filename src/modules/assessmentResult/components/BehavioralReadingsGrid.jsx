import React from 'react';
import { MessageSquareText, Users } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';

function ReadingCard({ title, description }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{description || 'Leitura em consolidação.'}</p>
    </article>
  );
}

function ListReadingCard({ title, items = [], emptyMessage }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {items.length ? (
        <ul className="mt-2 space-y-2">
          {items.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2 text-sm text-slate-600"
            >
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

export default function BehavioralReadingsGrid({ interpretation = {} }) {
  const readingCards = [
    { title: 'Comunicação', value: interpretation?.communicationStyle },
    { title: 'Tomada de decisão', value: interpretation?.decisionMaking },
    { title: 'Liderança', value: interpretation?.leadershipStyle },
    { title: 'Estilo de trabalho', value: interpretation?.workStyle },
    { title: 'Relacionamento e colaboração', value: interpretation?.relationshipStyle },
    { title: 'Resposta sob pressão', value: interpretation?.pressureResponse },
    { title: 'Ambiente ideal', value: interpretation?.idealEnvironment },
  ];

  return (
    <PanelShell>
      <SectionHeader
        icon={MessageSquareText}
        title="Leituras comportamentais"
        subtitle="Interpretação prática do estilo DISC para comunicação, decisão, liderança e colaboração."
      />

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {readingCards.map((reading) => (
          <ReadingCard key={reading.title} title={reading.title} description={reading.value} />
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <ListReadingCard
          title="Motivadores"
          items={interpretation?.motivators || []}
          emptyMessage="Motivadores em consolidação com base na amostra atual."
        />
        <ListReadingCard
          title="Desafios potenciais"
          items={interpretation?.potentialChallenges || []}
          emptyMessage="Sem desafios críticos identificados para esta leitura."
        />
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <Users className="h-4 w-4" />
          Leitura de relacionamento
        </p>
        <p className="mt-1 text-sm text-slate-600">
          {interpretation?.relationshipStyle ||
            'O estilo relacional será refinado conforme novos contextos e observações comportamentais.'}
        </p>
      </div>
    </PanelShell>
  );
}

