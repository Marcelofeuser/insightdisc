import React from 'react';
import { Cpu } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';
import { DISC_FACTORS, DISC_FACTOR_LABELS } from '@/modules/analytics/constants';
import { buildScoreBalanceNote } from '@/modules/assessmentResult/assessmentResultData';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value) {
  return Math.round(toNumber(value) * 10) / 10;
}

export default function TechnicalProfilePanel({
  interpretation = {},
  scores = {},
}) {
  const topGap = round1(interpretation?.scoreSummary?.topGap);
  const isPure = Boolean(interpretation?.scoreSummary?.isPure);
  const hasValidInput = Boolean(interpretation?.scoreSummary?.hasValidInput);

  return (
    <PanelShell tone="muted">
      <SectionHeader
        icon={Cpu}
        title="Resumo técnico DISC"
        subtitle="Camada técnica para apoio de leitura avançada e consistência analítica."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Scores D, I, S, C
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {DISC_FACTORS.map((factor) => (
              <div key={factor} className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
                <p className="text-xs text-slate-500">
                  {factor} • {DISC_FACTOR_LABELS[factor]}
                </p>
                <p className="text-sm font-semibold text-slate-900">{round1(scores?.[factor])}%</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>
            <span className="font-semibold text-slate-900">Código do perfil:</span>{' '}
            {interpretation?.profileCode || 'DISC'}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Fator primário:</span>{' '}
            {interpretation?.primaryFactor || '-'}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Fator secundário:</span>{' '}
            {interpretation?.secondaryFactor || '-'}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Top gap:</span>{' '}
            {Number.isFinite(topGap) ? `${topGap.toFixed(1)} p.p.` : '—'}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Classificação:</span>{' '}
            {!hasValidInput ? 'Amostra insuficiente' : isPure ? 'Perfil puro' : 'Perfil combinado'}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Arquétipo:</span>{' '}
            {interpretation?.styleLabel || 'DISC em consolidação'}
          </p>
        </section>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">Observação de equilíbrio/intensidade:</span>{' '}
        {buildScoreBalanceNote(interpretation?.scoreSummary || {})}
      </div>
    </PanelShell>
  );
}

