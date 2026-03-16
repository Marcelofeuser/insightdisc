import React from 'react';
import SectionShell from './SectionShell';

export default function UseCasesSection({ items }) {
  return (
    <SectionShell
      id="casos"
      title="Onde a plataforma gera valor de verdade"
      description="Casos de uso reais para empresas, consultores e líderes."
      centered
    >
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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
