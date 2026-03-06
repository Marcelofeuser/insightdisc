import React from 'react';
import { motion } from 'framer-motion';

const QUADRANT_LABELS = {
  topLeft: { title: 'Dominante', subtitle: 'Tarefa + Rápido', color: 'bg-red-100', textColor: 'text-red-700' },
  topRight: { title: 'Influente', subtitle: 'Pessoas + Rápido', color: 'bg-orange-100', textColor: 'text-orange-700' },
  bottomLeft: { title: 'Conforme', subtitle: 'Tarefa + Lento', color: 'bg-blue-100', textColor: 'text-blue-700' },
  bottomRight: { title: 'Estável', subtitle: 'Pessoas + Lento', color: 'bg-green-100', textColor: 'text-green-700' }
};

const getMemberPosition = (profile) => {
  // X axis: Tarefa (-) vs Pessoas (+)
  // Y axis: Lento (-) vs Rápido (+)
  const x = ((profile.I + profile.S) - (profile.D + profile.C)) / 2;
  const y = ((profile.D + profile.I) - (profile.S + profile.C)) / 2;
  
  // Normalize to percentage (0-100)
  const normalizedX = 50 + (x / 2);
  const normalizedY = 50 - (y / 2);
  
  return { x: normalizedX, y: normalizedY };
};

const MEMBER_COLORS = [
  'bg-violet-500',
  'bg-pink-500',
  'bg-cyan-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-indigo-500',
  'bg-teal-500'
];

export default function TeamQuadrantChart({ members = [] }) {
  return (
    <div className="relative w-full aspect-square max-w-xl mx-auto">
      {/* Grid */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 rounded-2xl overflow-hidden border border-slate-200">
        {/* Top Left - D */}
        <div className={`${QUADRANT_LABELS.topLeft.color} p-4 border-r border-b border-slate-200`}>
          <span className={`text-xs font-bold ${QUADRANT_LABELS.topLeft.textColor}`}>
            {QUADRANT_LABELS.topLeft.title}
          </span>
          <p className="text-xs text-slate-500">{QUADRANT_LABELS.topLeft.subtitle}</p>
        </div>
        
        {/* Top Right - I */}
        <div className={`${QUADRANT_LABELS.topRight.color} p-4 border-b border-slate-200`}>
          <span className={`text-xs font-bold ${QUADRANT_LABELS.topRight.textColor}`}>
            {QUADRANT_LABELS.topRight.title}
          </span>
          <p className="text-xs text-slate-500">{QUADRANT_LABELS.topRight.subtitle}</p>
        </div>
        
        {/* Bottom Left - C */}
        <div className={`${QUADRANT_LABELS.bottomLeft.color} p-4 border-r border-slate-200`}>
          <span className={`text-xs font-bold ${QUADRANT_LABELS.bottomLeft.textColor}`}>
            {QUADRANT_LABELS.bottomLeft.title}
          </span>
          <p className="text-xs text-slate-500">{QUADRANT_LABELS.bottomLeft.subtitle}</p>
        </div>
        
        {/* Bottom Right - S */}
        <div className={`${QUADRANT_LABELS.bottomRight.color} p-4`}>
          <span className={`text-xs font-bold ${QUADRANT_LABELS.bottomRight.textColor}`}>
            {QUADRANT_LABELS.bottomRight.title}
          </span>
          <p className="text-xs text-slate-500">{QUADRANT_LABELS.bottomRight.subtitle}</p>
        </div>
      </div>

      {/* Axis labels */}
      <div className="absolute -left-20 top-1/2 -translate-y-1/2 -rotate-90">
        <span className="text-xs font-medium text-slate-400">← Lento | Rápido →</span>
      </div>
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
        <span className="text-xs font-medium text-slate-400">← Tarefa | Pessoas →</span>
      </div>

      {/* Center lines */}
      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-slate-300" />
      <div className="absolute left-0 right-0 top-1/2 h-px bg-slate-300" />

      {/* Members */}
      {members.map((member, index) => {
        const position = getMemberPosition(member.profile);
        return (
          <motion.div
            key={member.id || index}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="absolute z-10 group"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className={`w-10 h-10 rounded-full ${MEMBER_COLORS[index % MEMBER_COLORS.length]} 
              flex items-center justify-center text-white text-sm font-bold shadow-lg
              ring-4 ring-white cursor-pointer hover:scale-110 transition-transform`}>
              {member.name?.charAt(0) || '?'}
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 
              bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 
              group-hover:opacity-100 transition-opacity pointer-events-none">
              <p className="font-medium">{member.name}</p>
              <p className="text-slate-300">{member.role || 'Membro'}</p>
            </div>
          </motion.div>
        );
      })}

      {/* Legend */}
      {members.length > 0 && (
        <div className="absolute -right-4 top-0 -translate-x-full bg-white rounded-lg shadow-lg p-3 space-y-2">
          <span className="text-xs font-medium text-slate-600">Membros</span>
          {members.slice(0, 8).map((member, index) => (
            <div key={member.id || index} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${MEMBER_COLORS[index % MEMBER_COLORS.length]}`} />
              <span className="text-xs text-slate-600 truncate max-w-[100px]">{member.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}