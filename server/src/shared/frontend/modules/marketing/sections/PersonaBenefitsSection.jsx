import React from 'react';
import SectionShell from './SectionShell';

export default function PersonaBenefitsSection({ benefits }) {
  return (
    <SectionShell
      eyebrow="Beneficios"
      title="Como a plataforma resolve esse contexto"
      description="Aplique DISC com consistencia semantica, leitura profissional e foco em resultado pratico."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {benefits.map((benefit) => (
          <article key={benefit} className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-5">
            <p className="text-sm leading-relaxed text-slate-800">{benefit}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

