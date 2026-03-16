import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Zap, Trophy, Flame } from 'lucide-react';

const ACHIEVEMENTS = [
  { id: 'first5',   threshold: 5,  icon: Star,   label: 'Começando Forte!',    color: 'from-amber-400 to-yellow-500' },
  { id: 'halfway',  threshold: 20, icon: Zap,    label: 'Metade do Caminho!',  color: 'from-indigo-400 to-violet-500' },
  { id: 'almost',   threshold: 35, icon: Flame,  label: 'Quase Lá!',           color: 'from-orange-400 to-red-500' },
  { id: 'done',     threshold: 40, icon: Trophy, label: 'Avaliação Completa!', color: 'from-green-400 to-emerald-500' },
];

export default function AssessmentAchievements({ answered, total }) {
  const [shown, setShown] = useState(new Set());
  const [current, setCurrent] = useState(null);

  useEffect(() => {
    for (const ach of ACHIEVEMENTS) {
      if (answered >= ach.threshold && !shown.has(ach.id)) {
        setShown(prev => new Set([...prev, ach.id]));
        setCurrent(ach);
        const t = setTimeout(() => setCurrent(null), 2800);
        return () => clearTimeout(t);
      }
    }
  }, [answered]);

  const pct = Math.round((answered / total) * 100);
  const earnedCount = ACHIEVEMENTS.filter(a => answered >= a.threshold).length;

  return (
    <>
      {/* Mini achievement strip */}
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {ACHIEVEMENTS.map(a => {
            const earned = answered >= a.threshold;
            const Icon = a.icon;
            return (
              <div key={a.id} className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                earned ? `bg-gradient-to-br ${a.color} shadow-lg scale-110` : 'bg-white/10'
              }`}>
                <Icon className={`w-3.5 h-3.5 ${earned ? 'text-white' : 'text-white/30'}`} />
              </div>
            );
          })}
        </div>
        <span className="text-white/60 text-xs">{earnedCount}/{ACHIEVEMENTS.length} conquistas</span>
      </div>

      {/* Toast achievement popup */}
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 60, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className={`flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-to-r ${current.color} shadow-2xl shadow-black/30`}>
              {React.createElement(current.icon, { className: 'w-6 h-6 text-white' })}
              <div>
                <p className="text-white font-bold text-sm">Conquista Desbloqueada!</p>
                <p className="text-white/90 text-xs">{current.label}</p>
              </div>
              <div className="ml-2 text-white font-black text-lg">{pct}%</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}