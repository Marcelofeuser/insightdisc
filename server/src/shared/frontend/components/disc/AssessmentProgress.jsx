import React from 'react';
import { motion } from 'framer-motion';
import { Clock, CheckCircle2 } from 'lucide-react';

export default function AssessmentProgress({ current, total, timeSpent = 0 }) {
  const percentage = Math.round((current / total) * 100);
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium">
              {current} de {total} respondidas
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{formatTime(timeSpent)}</span>
          </div>
        </div>
        <span className="text-sm font-bold text-indigo-600">{percentage}%</span>
      </div>
      
      {/* Progress bar */}
      <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="absolute h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
        />
        
        {/* Milestone markers */}
        <div className="absolute inset-0 flex items-center justify-between px-1">
          {[25, 50, 75].map((milestone) => (
            <div
              key={milestone}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${
                percentage >= milestone ? 'bg-white' : 'bg-slate-300'
              }`}
              style={{ marginLeft: `${milestone - 1}%` }}
            />
          ))}
        </div>
      </div>

      {/* Encouragement messages */}
      <motion.p
        key={percentage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-sm text-slate-500 mt-3"
      >
        {percentage < 25 && "Você está no começo! Continue assim 💪"}
        {percentage >= 25 && percentage < 50 && "Ótimo progresso! Já passou de 1/4 do teste 🎯"}
        {percentage >= 50 && percentage < 75 && "Halfway there! Você está na metade 🚀"}
        {percentage >= 75 && percentage < 100 && "Quase lá! Falta pouco para descobrir seu perfil ✨"}
        {percentage === 100 && "Parabéns! Você completou todas as perguntas! 🎉"}
      </motion.p>
    </div>
  );
}