import React from 'react';
import SectionShell from './SectionShell';

export default function AudienceCardsSection({ items }) {
  return (
    <SectionShell
      id="publicos"
      title="Uma plataforma, vários contextos de uso"
      description="InsightDISC foi pensada para diferentes perfis de uso, sem perder profundidade."
      centered
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => (
          <article key={item.title} className="glass-card feature-card scroll-reveal rounded-3xl p-8">
            <h3 className="landing-card-title text-xl font-bold">{item.title}</h3>
            <p className="landing-card-text mt-3 leading-relaxed">{item.description}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
