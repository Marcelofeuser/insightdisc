import React from 'react';
import { DISC_FACTORS, DISC_FACTOR_COLORS, DISC_FACTOR_LABELS } from '@/modules/analytics/constants';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value) {
  return Math.max(0, Math.min(100, toNumber(value)));
}

export default function DiscScoreSummary({
  scores = {},
  primaryFactor = '',
  secondaryFactor = '',
}) {
  return (
    <div className="space-y-3">
      {DISC_FACTORS.map((factor) => {
        const value = clamp(scores?.[factor]);
        const isPrimary = primaryFactor === factor;
        const isSecondary = secondaryFactor === factor;
        return (
          <div key={factor} className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-900">
                {factor} • {DISC_FACTOR_LABELS[factor]}
              </p>
              <div className="flex items-center gap-2">
                {isPrimary ? (
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-indigo-700">
                    Primário
                  </span>
                ) : null}
                {!isPrimary && isSecondary ? (
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">
                    Secundário
                  </span>
                ) : null}
                <span className="text-sm font-semibold text-slate-700">{value.toFixed(1)}%</span>
              </div>
            </div>

            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full"
                style={{
                  width: `${value}%`,
                  backgroundColor: DISC_FACTOR_COLORS[factor],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

