import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Sparkles, Lock, CreditCard, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const FEATURES = [
  'Relatório completo de 20+ páginas',
  'Gráfico de Perfil Natural vs Adaptado',
  'Análise de estilo de liderança',
  'Pontos fortes e áreas de desenvolvimento',
  'Dicas personalizadas de carreira',
  'Exportação em PDF de alta qualidade'
];

export default function PaywallModal({ isOpen, onClose, onPurchase, price = 'R$ 49,90' }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors z-10"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>

          {/* Header */}
          <div className="relative bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 p-8 text-white">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMiIvPjwvZz48L3N2Zz4=')] opacity-30" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6" />
                <span className="text-sm font-medium uppercase tracking-wider opacity-90">
                  Relatório Premium
                </span>
              </div>
              <h2 className="text-3xl font-bold mb-2">
                Desbloqueie seu perfil completo
              </h2>
              <p className="text-white/80">
                Descubra insights profundos sobre seu comportamento e potencial
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Features */}
            <div className="space-y-3 mb-8">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-slate-700">{feature}</span>
                </motion.div>
              ))}
            </div>

            {/* Price */}
            <div className="text-center mb-6">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-slate-900">{price}</span>
                <span className="text-slate-500">pagamento único</span>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Acesso vitalício ao seu relatório
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={onPurchase}
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 
                  hover:from-indigo-700 hover:to-violet-700 rounded-xl shadow-lg shadow-indigo-200"
              >
                <CreditCard className="w-5 h-5 mr-2" />
                Desbloquear Agora
              </Button>
              
              <div className="flex items-center justify-center gap-4 text-xs text-slate-400">
                <div className="flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Pagamento seguro
                </div>
                <div className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Acesso imediato
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}