import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

const MESSAGES = [
  'Ótima escolha!', 'Avançando!', 'Cada resposta revela mais sobre você!',
  'Quase lá!', 'Continue assim!', 'Você está indo bem!', 'Resposta registrada!'
];

export default function AnswerFeedback({ trigger }) {
  const [visible, setVisible] = useState(false);
  const [msg] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);

  useEffect(() => {
    if (!trigger) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 900);
    return () => clearTimeout(t);
  }, [trigger]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.7, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -8 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-2 text-green-400 text-sm font-medium"
        >
          <CheckCircle2 className="w-4 h-4" />
          {msg}
        </motion.div>
      )}
    </AnimatePresence>
  );
}