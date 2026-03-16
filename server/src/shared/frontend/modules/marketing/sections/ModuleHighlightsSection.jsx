import React from 'react';
import { Link } from 'react-router-dom';
import SectionShell from './SectionShell';
import { MARKETING_MODULE_LABELS } from '@/modules/marketing/content/marketingContent';

export default function ModuleHighlightsSection({ moduleKeys, ctaTo = '/demo' }) {
  const modules = moduleKeys
    .map((key) => MARKETING_MODULE_LABELS[key])
    .filter(Boolean);

  if (!modules.length) return null;

  return (
    <SectionShell
      eyebrow="Modulos relevantes"
      title="O que voce consegue fazer com esta solucao"
      description="Uma camada unica de inteligencia comportamental para aplicacao pratica no seu contexto."
      className="bg-white"
    >
      <div className="grid gap-4 md:grid-cols-2">
        {modules.map((moduleItem) => (
          <article key={moduleItem.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">{moduleItem.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{moduleItem.description}</p>
          </article>
        ))}
      </div>
      <div className="mt-8">
        <Link
          to={ctaTo}
          className="inline-flex rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          Ver plataforma em acao
        </Link>
      </div>
    </SectionShell>
  );
}

