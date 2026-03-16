import React, { useMemo } from 'react';
import { Radar as RadarIcon } from 'lucide-react';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import PanelShell from '@/components/ui/PanelShell';
import PanelState from '@/components/ui/PanelState';
import SectionHeader from '@/components/ui/SectionHeader';
import { DISC_FACTORS, DISC_FACTOR_LABELS } from '@/modules/analytics/constants';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value) {
  return Math.max(0, Math.min(100, toNumber(value)));
}

export default function ComparativeRadarPanel({
  profileA,
  profileB,
}) {
  const radarData = useMemo(
    () =>
      DISC_FACTORS.map((factor) => ({
        factor,
        label: `${factor} - ${DISC_FACTOR_LABELS[factor]}`,
        left: clamp(profileA?.scores?.[factor]),
        right: clamp(profileB?.scores?.[factor]),
      })),
    [profileA, profileB],
  );

  const hasValues = radarData.some((item) => item.left > 0 || item.right > 0);

  return (
    <PanelShell>
      <SectionHeader
        icon={RadarIcon}
        title="Radar comparativo"
        subtitle="Visualizacao lado a lado dos fatores D, I, S e C."
      />

      {!hasValues ? (
        <PanelState
          className="mt-4"
          title="Radar indisponivel"
          description="Selecione dois perfis com scores validos para habilitar o comparativo visual."
        />
      ) : (
        <>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 16, bottom: 10, left: 16 }}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="factor" tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }} />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <Tooltip
                  formatter={(value, _name, entry) => [`${Number(value).toFixed(1)}%`, entry?.payload?.label]}
                  labelFormatter={() => ''}
                />
                <Legend />
                <Radar
                  name={profileA?.name || 'Perfil A'}
                  dataKey="left"
                  stroke="#4f46e5"
                  fill="rgba(79, 70, 229, 0.22)"
                  fillOpacity={1}
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#4f46e5', stroke: '#fff', strokeWidth: 1 }}
                />
                <Radar
                  name={profileB?.name || 'Perfil B'}
                  dataKey="right"
                  stroke="#0f766e"
                  fill="rgba(15, 118, 110, 0.20)"
                  fillOpacity={1}
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#0f766e', stroke: '#fff', strokeWidth: 1 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {radarData.map((item) => (
              <div key={item.factor} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <p className="font-semibold text-slate-800">{item.label}</p>
                <p className="text-slate-600">
                  A: {item.left.toFixed(1)}% | B: {item.right.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </PanelShell>
  );
}

