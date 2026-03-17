import React, { useMemo } from 'react';
import { Radar as RadarIcon } from 'lucide-react';
import {
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
import {
  DISC_FACTORS,
  DISC_FACTOR_COLORS,
  DISC_FACTOR_LABELS,
  clampPercent,
} from '@/modules/analytics/constants';

export default function DiscRadarChart({
  title = 'Radar DISC',
  subtitle = 'Intensidade média dos fatores DISC.',
  profile = {},
  fillColor = 'rgba(79, 70, 229, 0.22)',
  strokeColor = '#4f46e5',
  emptyMessage = 'Ainda não há dados suficientes para montar o radar comportamental.',
}) {
  const chartData = useMemo(
    () => DISC_FACTORS.map((factor) => ({
      factor,
      label: `${factor} • ${DISC_FACTOR_LABELS[factor]}`,
      value: clampPercent(profile?.[factor]),
      color: DISC_FACTOR_COLORS[factor],
    })),
    [profile],
  );

  const hasValues = chartData.some((item) => item.value > 0);

  return (
    <PanelShell>
      <SectionHeader icon={RadarIcon} title={title} subtitle={subtitle} />

      {hasValues ? (
        <>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} margin={{ top: 10, right: 16, bottom: 8, left: 16 }}>
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
                <Radar
                  dataKey="value"
                  stroke={strokeColor}
                  fill={fillColor}
                  fillOpacity={1}
                  strokeWidth={2}
                  dot={{ r: 4, fill: strokeColor, stroke: "#ffffff", strokeWidth: 1 }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {chartData.map((item) => (
              <div key={item.factor} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <p className="font-semibold text-slate-800">{item.label}</p>
                <p className="text-slate-600">{item.value.toFixed(1)}%</p>
              </div>
            ))}
          </div>
        </>
      ) : (
        <PanelState className="mt-4" title="Radar indisponível" description={emptyMessage} />
      )}
    </PanelShell>
  );
}
