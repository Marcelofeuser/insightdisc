import React from 'react';
import SectionShell from './SectionShell';

export default function FeatureGridSection({ eyebrow, title, description, items }) {
  return (
    <SectionShell eyebrow={eyebrow} title={title} description={description}>
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((item) => (
          <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold tracking-tight text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}

