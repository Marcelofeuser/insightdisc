import React from 'react';
import { Cpu } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';
import { DISC_FACTORS, DISC_FACTOR_LABELS } from '@/modules/analytics/constants';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value) {
  return Math.round(toNumber(value) * 10) / 10;
}

export default function ComparisonTechnicalPanel({
  comparison,
}) {
  const scoreDifferences = comparison?.scoreDifferences || {};

  return (
    <PanelShell tone="muted">
      <SectionHeader
        icon={Cpu}
        title="Bloco tecnico da comparacao"
        subtitle="Leitura discreta de diferencas entre fatores, highlights e notas derivadas das regras."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Diferencas de score por fator
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {DISC_FACTORS.map((factor) => {
              const entry = scoreDifferences?.[factor] || {};
              return (
                <div key={factor} className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
                  <p className="text-xs text-slate-500">
                    {factor} - {DISC_FACTOR_LABELS[factor]}
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    A: {round1(entry?.left).toFixed(1)}% | B: {round1(entry?.right).toFixed(1)}%
                  </p>
                  <p className="text-xs text-slate-600">
                    Delta: {round1(entry?.delta).toFixed(1)} p.p. | Abs: {round1(entry?.absDelta).toFixed(1)}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>
            <span className="font-semibold text-slate-900">Compatibilidade:</span>{' '}
            {Number(comparison?.compatibilityScore || 0).toFixed(1)}% ({comparison?.compatibilityLevel || '-'})
          </p>
          <p>
            <span className="font-semibold text-slate-900">Gap mais alto:</span>{' '}
            {(scoreDifferences?.strongestGapFactor || '-')} ({Number(scoreDifferences?.strongestGapValue || 0).toFixed(1)} p.p.)
          </p>
          <p>
            <span className="font-semibold text-slate-900">Fator mais proximo:</span>{' '}
            {(scoreDifferences?.closestFactor || '-')} ({Number(scoreDifferences?.closestGapValue || 0).toFixed(1)} p.p.)
          </p>
          <p>
            <span className="font-semibold text-slate-900">Distancia media:</span>{' '}
            {Number(scoreDifferences?.meanAbsDelta || 0).toFixed(1)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Soma abs D/I/S/C:</span>{' '}
            {Number(scoreDifferences?.totalAbsDelta || 0).toFixed(1)}
          </p>
        </section>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Factor highlights</p>
          {Array.isArray(comparison?.factorHighlights) && comparison.factorHighlights.length ? (
            <ul className="mt-2 space-y-2">
              {comparison.factorHighlights.map((item) => (
                <li key={item} className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-sm text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Sem highlights adicionais para esta comparacao.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Notas tecnicas</p>
          {Array.isArray(comparison?.technicalNotes) && comparison.technicalNotes.length ? (
            <ul className="mt-2 space-y-2">
              {comparison.technicalNotes.map((item) => (
                <li key={item} className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-sm text-slate-700">
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Sem notas tecnicas adicionais para esta comparacao.</p>
          )}
        </section>
      </div>
    </PanelShell>
  );
}

