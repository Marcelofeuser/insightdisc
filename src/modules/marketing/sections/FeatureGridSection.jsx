import React from 'react';
import SectionShell from './SectionShell';

export default function FeatureGridSection({ id, eyebrow, title, description, items }) {
  return (
    <SectionShell id={id} eyebrow={eyebrow} title={title} description={description} centered>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <article key={item.title} className="glass-card feature-card scroll-reveal rounded-3xl p-8">
            <h3 className="landing-card-title text-2xl font-bold">{item.title}</h3>
            <p className="landing-card-text mt-3 leading-relaxed">{item.description}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}
