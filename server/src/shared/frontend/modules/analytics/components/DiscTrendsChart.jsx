import React from 'react';
import { TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DISC_FACTORS, DISC_FACTOR_COLORS, DISC_FACTOR_LABELS } from '@/modules/analytics/constants';
import PanelShell from '@/components/ui/PanelShell';
import PanelState from '@/components/ui/PanelState';
import SectionHeader from '@/components/ui/SectionHeader';

export default function DiscTrendsChart({
  title = 'Tendências comportamentais',
  subtitle = 'Evolução da distribuição DISC ao longo das avaliações mais recentes.',
  trends = [],
  placeholderText = 'Ainda não há histórico suficiente para mostrar tendência mensal. Assim que novas avaliações forem concluídas, este painel será preenchido automaticamente.',
}) {
  const hasTrendData = Array.isArray(trends) && trends.length >= 2;

  return (
    <PanelShell>
      <SectionHeader icon={TrendingUp} title={title} subtitle={subtitle} />

      {hasTrendData ? (
        <>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trends} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value, key) => [`${Number(value).toFixed(1)}%`, `${key} • ${DISC_FACTOR_LABELS[key]}`]}
                />
                <Legend
                  formatter={(value) => `${value} • ${DISC_FACTOR_LABELS[value] || 'DISC'}`}
                />
                {DISC_FACTORS.map((factor) => (
                  <Line
                    key={factor}
                    type="monotone"
                    dataKey={factor}
                    stroke={DISC_FACTOR_COLORS[factor]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-3 text-xs text-slate-600">
            Janela exibida: últimos {trends.length} períodos com avaliações válidas.
          </p>
        </>
      ) : (
        <PanelState className="mt-4" title="Tendência ainda indisponível" description={placeholderText} />
      )}
    </PanelShell>
  );
}
