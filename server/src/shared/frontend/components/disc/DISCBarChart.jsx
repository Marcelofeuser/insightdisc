import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

const DISC_COLORS = {
  D: '#E53E3E',
  I: '#F6AD55',
  S: '#48BB78', 
  C: '#4299E1'
};

const DISC_LABELS = {
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade'
};

export default function DISCBarChart({ naturalProfile, adaptedProfile, showAdapted = true, height = 250 }) {
  const data = ['D', 'I', 'S', 'C'].map(factor => ({
    factor,
    name: DISC_LABELS[factor],
    natural: naturalProfile?.[factor] || 0,
    adapted: adaptedProfile?.[factor] || 0,
    color: DISC_COLORS[factor]
  }));

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis 
            dataKey="factor" 
            tick={({ x, y, payload }) => (
              <g transform={`translate(${x},${y})`}>
                <text 
                  x={0} 
                  y={12} 
                  textAnchor="middle"
                  className="text-xs font-semibold"
                  fill={DISC_COLORS[payload.value]}
                >
                  {payload.value}
                </text>
                <text 
                  x={0} 
                  y={26} 
                  textAnchor="middle"
                  className="text-xs"
                  fill="#64748b"
                >
                  {DISC_LABELS[payload.value]}
                </text>
              </g>
            )}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
            height={50}
          />
          <YAxis 
            domain={[0, 100]} 
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: 'none', 
              borderRadius: '12px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
            }}
            formatter={(value, name) => [`${value}%`, name === 'natural' ? 'Perfil Natural' : 'Perfil Adaptado']}
          />
          <Bar 
            dataKey="natural" 
            name="Perfil Natural"
            radius={[6, 6, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-natural-${index}`} fill={entry.color} />
            ))}
          </Bar>
          {showAdapted && (
            <Bar 
              dataKey="adapted" 
              name="Perfil Adaptado"
              radius={[6, 6, 0, 0]}
              fillOpacity={0.5}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-adapted-${index}`} fill={entry.color} fillOpacity={0.5} />
              ))}
            </Bar>
          )}
          <Legend />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}