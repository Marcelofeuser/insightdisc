import React, { useMemo } from 'react';
import { BarChart3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import PanelShell from '@/components/ui/PanelShell';
import PanelState from '@/components/ui/PanelState';
import SectionHeader from '@/components/ui/SectionHeader';
import { DISC_FACTORS, DISC_FACTOR_LABELS } from '@/modules/analytics/constants';

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value) {
  return Math.round(toNumber(value) * 10) / 10;
}

export default function FactorDifferencePanel({ comparison }) {
  const chartData = useMemo(() => {
    const explicit = Array.isArray(comparison?.visualization?.factorDifferences)
      ? comparison.visualization.factorDifferences
      : null;

    if (explicit?.length) {
      return explicit.map((item) => ({
        factor: item.factor,
        label: item.label || DISC_FACTOR_LABELS[item.factor] || item.factor,
        delta: round1(item.delta),
        absDelta: round1(item.absDelta),
        dominantSide: item.dominantSide || (toNumber(item.delta) >= 0 ? 'A' : 'B'),
      }));
    }

    const diffs = comparison?.scoreDifferences || {};
    return DISC_FACTORS.map((factor) => ({
      factor,
      label: DISC_FACTOR_LABELS[factor] || factor,
      delta: round1(diffs?.[factor]?.delta),
      absDelta: round1(diffs?.[factor]?.absDelta),
      dominantSide: toNumber(diffs?.[factor]?.delta) >= 0 ? 'A' : 'B',
    }));
  }, [comparison]);

  const hasData = chartData.some((item) => item.absDelta > 0);

  return (
    <PanelShell>
      <SectionHeader
        icon={BarChart3}
        title="Diferenca entre fatores"
        subtitle="Leitura visual do quanto cada fator pende para o perfil A ou perfil B."
      />

      {!hasData ? (
        <PanelState
          className="mt-4"
          title="Diferencas indisponiveis"
          description="A comparacao precisa de dois perfis validos para calcular diferencas por fator."
        />
      ) : (
        <>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 20, bottom: 8, left: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="factor"
                  tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  formatter={(value, _name, entry) => {
                    const row = entry?.payload || {};
                    const sideLabel = row?.dominantSide === 'A' ? 'Perfil A' : 'Perfil B';
                    return [`${Number(value).toFixed(1)} p.p. (${sideLabel})`, row?.label];
                  }}
                  labelFormatter={() => ''}
                />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <Bar dataKey="delta" radius={[8, 8, 0, 0]}>
                  {chartData.map((item) => (
                    <Cell
                      key={`difference-${item.factor}`}
                      fill={item.dominantSide === 'A' ? '#4f46e5' : '#0f766e'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {chartData.map((item) => (
              <article key={item.factor} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                <p className="font-semibold text-slate-800">
                  {item.factor} - {item.label}
                </p>
                <p className="text-slate-600">
                  Delta: {item.delta.toFixed(1)} p.p. | Abs: {item.absDelta.toFixed(1)} p.p.
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </PanelShell>
  );
}
