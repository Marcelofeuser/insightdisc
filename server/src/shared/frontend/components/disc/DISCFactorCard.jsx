import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';

const DISC_CONFIG = {
  D: {
    name: 'Dominância',
    color: 'bg-red-500',
    lightColor: 'bg-red-50',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    icon: '🦁',
    traits: ['Decisivo', 'Competitivo', 'Direto', 'Orientado a resultados'],
    description: 'Focado em superar desafios e alcançar resultados rápidos.'
  },
  I: {
    name: 'Influência',
    color: 'bg-orange-500',
    lightColor: 'bg-orange-50',
    textColor: 'text-orange-600',
    borderColor: 'border-orange-200',
    icon: '🦊',
    traits: ['Comunicativo', 'Entusiasta', 'Persuasivo', 'Otimista'],
    description: 'Focado em influenciar pessoas e criar conexões.'
  },
  S: {
    name: 'Estabilidade',
    color: 'bg-green-500',
    lightColor: 'bg-green-50',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    icon: '🐢',
    traits: ['Paciente', 'Confiável', 'Leal', 'Colaborativo'],
    description: 'Focado em cooperação e ambientes estáveis.'
  },
  C: {
    name: 'Conformidade',
    color: 'bg-blue-500',
    lightColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    borderColor: 'border-blue-200',
    icon: '🦉',
    traits: ['Analítico', 'Preciso', 'Sistemático', 'Cauteloso'],
    description: 'Focado em qualidade, precisão e procedimentos.'
  }
};

export default function DISCFactorCard({ factor, naturalValue, adaptedValue, isExpanded = false }) {
  const config = DISC_CONFIG[factor];
  const diff = (adaptedValue || 0) - (naturalValue || 0);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border-2 ${config.borderColor} ${config.lightColor} p-5 transition-all hover:shadow-lg`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${config.textColor}`}>{factor}</span>
              <span className="text-sm text-slate-500">{config.name}</span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${config.textColor}`}>{naturalValue}%</div>
          {adaptedValue !== undefined && diff !== 0 && (
            <div className={`flex items-center justify-end gap-1 text-xs ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{diff > 0 ? '+' : ''}{diff}% adaptado</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="relative h-3 bg-white rounded-full overflow-hidden mb-4">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${naturalValue}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`absolute h-full ${config.color} rounded-full`}
        />
        {adaptedValue !== undefined && (
          <motion.div
            initial={{ left: 0 }}
            animate={{ left: `${adaptedValue}%` }}
            transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
            className="absolute top-0 w-1 h-full bg-slate-800 rounded"
            style={{ transform: 'translateX(-50%)' }}
          />
        )}
      </div>

      {isExpanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          <p className="text-sm text-slate-600">{config.description}</p>
          <div className="flex flex-wrap gap-2">
            {config.traits.map((trait, i) => (
              <span 
                key={i}
                className={`px-3 py-1 rounded-full text-xs font-medium ${config.lightColor} ${config.textColor} border ${config.borderColor}`}
              >
                {trait}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}