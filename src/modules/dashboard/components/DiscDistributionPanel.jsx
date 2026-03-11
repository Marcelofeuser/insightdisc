import React, { useMemo } from 'react';
import { Radar } from 'lucide-react';
import { dashboardFactorLabels } from '@/modules/dashboard/useDashboardData';
import PanelShell from '@/components/ui/PanelShell';
import PanelState from '@/components/ui/PanelState';
import SectionHeader from '@/components/ui/SectionHeader';

const FACTORS = ['D', 'I', 'S', 'C'];
const FACTOR_COLORS = {
  D: '#E53935',
  I: '#FBC02D',
  S: '#43A047',
  C: '#1E88E5',
};

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pointForFactor(index, value = 0) {
  const center = 90;
  const maxRadius = 58;
  const normalized = Math.max(0, Math.min(100, toNumber(value)));
  const radius = (normalized / 100) * maxRadius;
  const angle = ((-90 + index * 90) * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(angle),
    y: center + radius * Math.sin(angle),
  };
}

export default function DiscDistributionPanel({
  title,
  subtitle,
  distribution = {},
  predominantFactor = '',
}) {
  const hasValues = FACTORS.some((factor) => toNumber(distribution?.[factor]) > 0);
  const radarPath = useMemo(() => {
    const points = FACTORS.map((factor, index) => pointForFactor(index, distribution?.[factor]));
    return points.map((point) => `${point.x},${point.y}`).join(' ');
  }, [distribution]);

  return (
    <PanelShell>
      <SectionHeader icon={Radar} title={title} subtitle={subtitle} />

      {hasValues ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            {FACTORS.map((factor) => {
              const value = toNumber(distribution?.[factor]);
              return (
                <div key={factor}>
                  <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
                    <span>
                      {factor} • {dashboardFactorLabels[factor]}
                    </span>
                    <span className="font-semibold text-slate-800">{value.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${Math.max(0, Math.min(100, value))}%`,
                        backgroundColor: FACTOR_COLORS[factor],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
            <svg viewBox="0 0 180 180" className="mx-auto h-44 w-44">
              <circle cx="90" cy="90" r="58" fill="none" stroke="#e2e8f0" strokeWidth="1" />
              <circle cx="90" cy="90" r="38" fill="none" stroke="#e2e8f0" strokeWidth="1" />
              <circle cx="90" cy="90" r="18" fill="none" stroke="#e2e8f0" strokeWidth="1" />
              <line x1="90" y1="32" x2="90" y2="148" stroke="#cbd5e1" strokeWidth="1" />
              <line x1="32" y1="90" x2="148" y2="90" stroke="#cbd5e1" strokeWidth="1" />
              <polygon points={radarPath} fill="rgba(79,70,229,0.25)" stroke="#4f46e5" strokeWidth="2" />
              {FACTORS.map((factor, index) => {
                const point = pointForFactor(index, distribution?.[factor]);
                return <circle key={`point-${factor}`} cx={point.x} cy={point.y} r="3" fill={FACTOR_COLORS[factor]} />;
              })}
            </svg>

            <p className="mt-2 text-center text-xs leading-relaxed text-slate-600">
              Predominância atual:{' '}
              <span className="font-semibold text-slate-900">
                {predominantFactor ? `${predominantFactor} • ${dashboardFactorLabels[predominantFactor]}` : 'não definida'}
              </span>
            </p>
          </div>
        </div>
      ) : (
        <PanelState
          className="mt-4"
          title="Sem distribuição disponível"
          description="Conclua avaliações com dados DISC válidos para exibir a distribuição coletiva."
        />
      )}
    </PanelShell>
  );
}
