import React, { useMemo } from 'react';
import { PieChart } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PanelShell from '@/components/ui/PanelShell';
import PanelState from '@/components/ui/PanelState';
import SectionHeader from '@/components/ui/SectionHeader';
import {
  DISC_FACTORS,
  DISC_FACTOR_COLORS,
  DISC_FACTOR_LABELS,
  clampPercent,
  toNumber,
} from '@/modules/analytics/constants';

function resolvePredominantFactor(distribution = {}, fallbackFactor = '') {
  if (fallbackFactor && DISC_FACTORS.includes(fallbackFactor)) {
    return fallbackFactor;
  }

  return DISC_FACTORS
    .map((factor) => ({ factor, value: toNumber(distribution?.[factor]) }))
    .sort((a, b) => b.value - a.value)[0]?.factor || '';
}

export default function DiscDistributionChart({
  title = 'Distribuição DISC',
  subtitle = 'Participação média dos fatores no grupo analisado.',
  distribution = {},
  predominantFactor = '',
}) {
  const chartData = useMemo(
    () => DISC_FACTORS.map((factor) => ({
      factor,
      label: `${factor} • ${DISC_FACTOR_LABELS[factor]}`,
      value: clampPercent(distribution?.[factor]),
      color: DISC_FACTOR_COLORS[factor],
    })),
    [distribution],
  );

  const hasValues = chartData.some((item) => item.value > 0);
  const resolvedPredominant = resolvePredominantFactor(distribution, predominantFactor);

  return (
    <PanelShell>
      <SectionHeader icon={PieChart} title={title} subtitle={subtitle} />

      {hasValues ? (
        <>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(value) => `${value}%`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="factor"
                  type="category"
                  width={30}
                  tick={{ fontSize: 12, fill: '#1e293b', fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value, _name, context) => [`${toNumber(value).toFixed(1)}%`, context?.payload?.label]}
                  labelFormatter={() => ''}
                />
                <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                  {chartData.map((item) => (
                    <Cell key={item.factor} fill={item.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {chartData.map((item) => (
              <div key={item.factor} className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                <p className="font-semibold text-slate-800">{item.label}</p>
                <p className="text-slate-600">{item.value.toFixed(1)}%</p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-slate-600">
            Predominância do grupo:{' '}
            <span className="font-semibold text-slate-900">
              {resolvedPredominant
                ? `${resolvedPredominant} • ${DISC_FACTOR_LABELS[resolvedPredominant]}`
                : 'não identificada'}
            </span>
          </p>
        </>
      ) : (
        <PanelState
          className="mt-4"
          title="Sem dados para distribuição DISC"
          description="Ainda não há dados suficientes para calcular a distribuição DISC do grupo."
        />
      )}
    </PanelShell>
  );
}
