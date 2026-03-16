import React from 'react';
import SectionShell from './SectionShell';

const METRICS = Object.freeze([
  { label: 'Jornadas de desenvolvimento', value: 'Individual + Equipe + Lideranca' },
  { label: 'Camadas de analise', value: 'Resultado, comparacao, fit e team map' },
  { label: 'Modo de aplicacao', value: 'Personal, Professional e Business' },
]);

const PLACEHOLDERS = Object.freeze([
  'Espaco reservado para case de recrutamento com candidato x cargo.',
  'Espaco reservado para case de lideranca e desenvolvimento de equipe.',
  'Espaco reservado para case de consultoria comportamental.',
]);

export default function SocialProofSection() {
  return (
    <SectionShell
      eyebrow="Prova de uso"
      title="Fluxo completo de aplicacao comportamental"
      description="A plataforma foi desenhada para gerar decisao pratica em pessoas, lideranca, recrutamento e equipes."
      className="bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]"
    >
      <div className="grid gap-4 md:grid-cols-3">
        {METRICS.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-slate-900">{metric.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {PLACEHOLDERS.map((item) => (
          <div key={item} className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-5">
            <p className="text-sm leading-relaxed text-slate-600">{item}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

