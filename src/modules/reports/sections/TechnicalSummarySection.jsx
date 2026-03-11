import React from 'react';
import { Cpu } from 'lucide-react';
import { DISC_FACTORS, DISC_FACTOR_LABELS } from '@/modules/analytics/constants';
import { ReportSection } from '@/modules/reports/components';

function toValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(1)}%` : '0.0%';
}

function formatDate(value) {
  if (!value) return 'Data indisponível';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Data indisponível';
  return parsed.toLocaleDateString('pt-BR');
}

export default function TechnicalSummarySection({ technical, identity }) {
  return (
    <ReportSection
      id="technical-summary"
      icon={Cpu}
      title="Resumo técnico final"
      subtitle="Camada técnica discreta para auditoria de scores, fatores e equilíbrio do perfil."
      tone="muted"
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Scores normalizados D, I, S, C</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {DISC_FACTORS.map((factor) => (
              <div key={factor} className="rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2">
                <p className="text-xs text-slate-500">
                  {factor} • {DISC_FACTOR_LABELS[factor]}
                </p>
                <p className="text-sm font-semibold text-slate-900">{toValue(technical?.normalizedScores?.[factor])}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>
            <span className="font-semibold text-slate-900">Código do perfil:</span> {technical?.profileCode || 'DISC'}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Fator primário:</span> {technical?.primaryFactor || '-'}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Fator secundário:</span> {technical?.secondaryFactor || '-'}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Classificação:</span>{' '}
            {!technical?.hasValidInput
              ? 'Amostra insuficiente'
              : technical?.isPure
                ? 'Perfil puro'
                : 'Perfil combinado'}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Gap entre fatores líderes:</span>{' '}
            {Number.isFinite(technical?.topGap) ? `${technical.topGap.toFixed(1)} p.p.` : '—'}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Estilo:</span> {technical?.styleLabel || 'DISC em consolidação'}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Avaliação:</span> {identity?.id || 'indisponível'}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Data de conclusão:</span> {formatDate(identity?.completedAt)}
          </p>
        </article>
      </div>

      <div className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
        <span className="font-semibold text-slate-900">Observação de equilíbrio/intensidade:</span>{' '}
        {technical?.balanceNote || 'Sem observações adicionais de equilíbrio no momento.'}
      </div>
    </ReportSection>
  );
}
