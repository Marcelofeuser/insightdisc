import React from 'react';
import SectionShell from './SectionShell';

export default function FeatureGridSection({ id, eyebrow, title, description, items }) {
  return (
    <SectionShell id={id} eyebrow={eyebrow} title={title} description={description}>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.title} className="landing-card rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="landing-card-title text-lg font-semibold tracking-tight text-slate-900">{item.title}</h3>
            <p className="landing-card-text mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
