import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend } from 'recharts';

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

export default function DISCRadarChart({ naturalProfile, adaptedProfile, showAdapted = true, size = 300 }) {
  const data = [
    {
      factor: 'D',
      fullName: DISC_LABELS.D,
      natural: naturalProfile?.D || 0,
      adapted: adaptedProfile?.D || 0,
    },
    {
      factor: 'I', 
      fullName: DISC_LABELS.I,
      natural: naturalProfile?.I || 0,
      adapted: adaptedProfile?.I || 0,
    },
    {
      factor: 'S',
      fullName: DISC_LABELS.S,
      natural: naturalProfile?.S || 0,
      adapted: adaptedProfile?.S || 0,
    },
    {
      factor: 'C',
      fullName: DISC_LABELS.C,
      natural: naturalProfile?.C || 0,
      adapted: adaptedProfile?.C || 0,
    },
  ];

  return (
    <div className="w-full" style={{ height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid stroke="#e2e8f0" />
          <PolarAngleAxis 
            dataKey="factor" 
            tick={({ x, y, payload }) => (
              <g transform={`translate(${x},${y})`}>
                <text 
                  x={0} 
                  y={0} 
                  textAnchor="middle"
                  className="text-sm font-bold"
                  fill={DISC_COLORS[payload.value]}
                >
                  {payload.value}
                </text>
              </g>
            )}
          />
          <PolarRadiusAxis 
            angle={90} 
            domain={[0, 100]} 
            tick={{ fontSize: 10 }}
            tickCount={5}
          />
          <Radar
            name="Perfil Natural"
            dataKey="natural"
            stroke="#1a1a2e"
            fill="#1a1a2e"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          {showAdapted && (
            <Radar
              name="Perfil Adaptado"
              dataKey="adapted"
              stroke="#6366f1"
              fill="#6366f1"
              fillOpacity={0.2}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
          )}
          <Legend 
            wrapperStyle={{ fontSize: '12px' }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}