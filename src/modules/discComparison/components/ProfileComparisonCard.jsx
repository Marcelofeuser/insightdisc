import React from 'react';
import { UserCircle2 } from 'lucide-react';
import PanelShell from '@/components/ui/PanelShell';
import { DISC_FACTORS, DISC_FACTOR_COLORS, DISC_FACTOR_LABELS } from '@/modules/analytics/constants';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value) {
  return Math.max(0, Math.min(100, toNumber(value)));
}

export default function ProfileComparisonCard({
  profile,
  label = 'Perfil',
}) {
  return (
    <PanelShell>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
          <h3 className="mt-1 truncate text-lg font-semibold text-slate-900">{profile?.name || 'Participante'}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {profile?.profileCode || 'DISC'} - {profile?.styleLabel || 'Perfil em consolidacao'}
          </p>
        </div>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <UserCircle2 className="h-5 w-5" />
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-600">{profile?.summaryShort || 'Leitura comportamental em consolidacao.'}</p>

      <div className="mt-4 space-y-2">
        {DISC_FACTORS.map((factor) => {
          const value = clamp(profile?.scores?.[factor]);
          return (
            <div key={`${label}-${factor}`}>
              <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                <span>
                  {factor} - {DISC_FACTOR_LABELS[factor]}
                </span>
                <span className="font-semibold text-slate-800">{value.toFixed(1)}%</span>
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
    </PanelShell>
  );
}

