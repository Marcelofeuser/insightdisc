import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function QuestionCard({ 
  question, 
  questionNumber, 
  totalQuestions, 
  onAnswer, 
  initialAnswer = null 
}) {
  const [mostSelected, setMostSelected] = useState(initialAnswer?.most || null);
  const [leastSelected, setLeastSelected] = useState(initialAnswer?.least || null);

  const handleMostSelect = (optionId) => {
    if (optionId === leastSelected) {
      setLeastSelected(null);
    }
    setMostSelected(optionId);
    checkAndSubmit(optionId, leastSelected === optionId ? null : leastSelected);
  };

  const handleLeastSelect = (optionId) => {
    if (optionId === mostSelected) {
      setMostSelected(null);
    }
    setLeastSelected(optionId);
    checkAndSubmit(mostSelected === optionId ? null : mostSelected, optionId);
  };

  const checkAndSubmit = (most, least) => {
    if (most && least) {
      onAnswer({ 
        question_id: question.id, 
        most, 
        least,
        answered_at: new Date().toISOString()
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm font-medium text-slate-500">
          Pergunta {questionNumber} de {totalQuestions}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: totalQuestions }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  i < questionNumber ? "bg-indigo-600" : "bg-slate-200"
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gradient-to-r from-slate-50 to-indigo-50 rounded-2xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          Escolha a palavra que MAIS e MENOS descreve você
        </h3>
        <p className="text-sm text-slate-600">
          Selecione uma palavra para "Mais me descreve" e outra diferente para "Menos me descreve"
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isMost = mostSelected === option.id;
          const isLeast = leastSelected === option.id;
          
          return (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative flex items-center justify-between p-5 rounded-xl border-2 transition-all",
                isMost && "border-green-400 bg-green-50 shadow-lg shadow-green-100",
                isLeast && "border-red-400 bg-red-50 shadow-lg shadow-red-100",
                !isMost && !isLeast && "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
              )}
            >
              <span className={cn(
                "text-lg font-medium transition-colors",
                isMost && "text-green-700",
                isLeast && "text-red-700",
                !isMost && !isLeast && "text-slate-700"
              )}>
                {option.text}
              </span>

              <div className="flex items-center gap-2">
                {/* Most button */}
                <button
                  onClick={() => handleMostSelect(option.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    isMost 
                      ? "bg-green-500 text-white shadow-lg" 
                      : "bg-slate-100 text-slate-600 hover:bg-green-100 hover:text-green-700"
                  )}
                >
                  <ChevronUp className="w-4 h-4" />
                  Mais
                </button>

                {/* Least button */}
                <button
                  onClick={() => handleLeastSelect(option.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    isLeast 
                      ? "bg-red-500 text-white shadow-lg" 
                      : "bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-700"
                  )}
                >
                  <ChevronDown className="w-4 h-4" />
                  Menos
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Status indicator */}
      <AnimatePresence>
        {mostSelected && leastSelected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6 flex items-center justify-center gap-2 text-green-600"
          >
            <Check className="w-5 h-5" />
            <span className="font-medium">Resposta registrada!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}