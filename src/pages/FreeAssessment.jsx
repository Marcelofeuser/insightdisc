import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import QuestionCard from '@/components/disc/QuestionCard';
import AssessmentProgress from '@/components/disc/AssessmentProgress';
import LGPDConsent from '@/components/disc/LGPDConsent';
import CFPDisclaimer from '@/components/disc/CFPDisclaimer';
import { useToast } from '@/components/ui/use-toast';
import { base44 } from '@/api/base44Client';
import { getFreeLead, setFreeLead } from '@/modules/freeLead/freeLeadStorage';
import { generateInviteToken, hashInviteToken } from '@/modules/invites/invite-token';

// Simplified free assessment questions (10-12 questions)
const FREE_QUESTIONS = [
  {
    id: 'f1',
    question_text: 'Em um ambiente de trabalho, eu prefiro...',
    options: [
      { id: 'f1a', text: 'Liderar e tomar decisões rápidas', factor: 'D', weight: 3 },
      { id: 'f1b', text: 'Interagir e motivar pessoas', factor: 'I', weight: 3 },
      { id: 'f1c', text: 'Manter um ritmo constante e seguro', factor: 'S', weight: 3 },
      { id: 'f1d', text: 'Analisar dados antes de agir', factor: 'C', weight: 3 }
    ]
  },
  {
    id: 'f2',
    question_text: 'Quando enfrento um desafio, geralmente...',
    options: [
      { id: 'f2a', text: 'Vou direto ao ponto e resolvo', factor: 'D', weight: 3 },
      { id: 'f2b', text: 'Busco apoio e opiniões dos outros', factor: 'I', weight: 3 },
      { id: 'f2c', text: 'Penso com calma antes de agir', factor: 'S', weight: 3 },
      { id: 'f2d', text: 'Pesquiso todas as possibilidades', factor: 'C', weight: 3 }
    ]
  },
  {
    id: 'f3',
    question_text: 'As pessoas me descrevem como...',
    options: [
      { id: 'f3a', text: 'Determinado e competitivo', factor: 'D', weight: 3 },
      { id: 'f3b', text: 'Entusiasta e comunicativo', factor: 'I', weight: 3 },
      { id: 'f3c', text: 'Calmo e confiável', factor: 'S', weight: 3 },
      { id: 'f3d', text: 'Detalhista e organizado', factor: 'C', weight: 3 }
    ]
  },
  {
    id: 'f4',
    question_text: 'Em reuniões, eu costumo...',
    options: [
      { id: 'f4a', text: 'Ir direto ao assunto principal', factor: 'D', weight: 3 },
      { id: 'f4b', text: 'Criar um clima descontraído', factor: 'I', weight: 3 },
      { id: 'f4c', text: 'Ouvir mais do que falar', factor: 'S', weight: 3 },
      { id: 'f4d', text: 'Fazer perguntas detalhadas', factor: 'C', weight: 3 }
    ]
  },
  {
    id: 'f5',
    question_text: 'Sob pressão, eu tendo a...',
    options: [
      { id: 'f5a', text: 'Ficar mais impaciente e direto', factor: 'D', weight: 3 },
      { id: 'f5b', text: 'Falar mais e buscar apoio', factor: 'I', weight: 3 },
      { id: 'f5c', text: 'Me fechar e evitar conflitos', factor: 'S', weight: 3 },
      { id: 'f5d', text: 'Me tornar mais crítico', factor: 'C', weight: 3 }
    ]
  },
  {
    id: 'f6',
    question_text: 'O que mais me motiva é...',
    options: [
      { id: 'f6a', text: 'Resultados e conquistas', factor: 'D', weight: 3 },
      { id: 'f6b', text: 'Reconhecimento e diversão', factor: 'I', weight: 3 },
      { id: 'f6c', text: 'Harmonia e segurança', factor: 'S', weight: 3 },
      { id: 'f6d', text: 'Qualidade e perfeição', factor: 'C', weight: 3 }
    ]
  },
  {
    id: 'f7',
    question_text: 'Ao tomar decisões, eu...',
    options: [
      { id: 'f7a', text: 'Decido rapidamente', factor: 'D', weight: 3 },
      { id: 'f7b', text: 'Consulto várias pessoas', factor: 'I', weight: 3 },
      { id: 'f7c', text: 'Penso nas consequências', factor: 'S', weight: 3 },
      { id: 'f7d', text: 'Analiso todos os dados', factor: 'C', weight: 3 }
    ]
  },
  {
    id: 'f8',
    question_text: 'Em um time, eu prefiro ser...',
    options: [
      { id: 'f8a', text: 'O líder que define direção', factor: 'D', weight: 3 },
      { id: 'f8b', text: 'O motivador do grupo', factor: 'I', weight: 3 },
      { id: 'f8c', text: 'O apoio confiável', factor: 'S', weight: 3 },
      { id: 'f8d', text: 'O especialista técnico', factor: 'C', weight: 3 }
    ]
  },
  {
    id: 'f9',
    question_text: 'Mudanças me fazem sentir...',
    options: [
      { id: 'f9a', text: 'Empolgado com novas oportunidades', factor: 'D', weight: 3 },
      { id: 'f9b', text: 'Animado com novas pessoas', factor: 'I', weight: 3 },
      { id: 'f9c', text: 'Desconfortável inicialmente', factor: 'S', weight: 3 },
      { id: 'f9d', text: 'Preocupado com os detalhes', factor: 'C', weight: 3 }
    ]
  },
  {
    id: 'f10',
    question_text: 'Meu maior medo é...',
    options: [
      { id: 'f10a', text: 'Perder o controle da situação', factor: 'D', weight: 3 },
      { id: 'f10b', text: 'Ser rejeitado ou ignorado', factor: 'I', weight: 3 },
      { id: 'f10c', text: 'Conflitos e instabilidade', factor: 'S', weight: 3 },
      { id: 'f10d', text: 'Cometer erros ou falhas', factor: 'C', weight: 3 }
    ]
  }
];

export default function FreeAssessment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeSpent, setTimeSpent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const redirectedRef = useRef(false);
  const [consentGiven, setConsentGiven] = useState(() => {
    return localStorage.getItem('disc_consent_given') === 'true';
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const qpName = params.get('name')?.trim() || '';
    const qpEmail = params.get('email')?.trim() || '';
    if (qpName && qpEmail) {
      setFreeLead({ name: qpName, email: qpEmail, consent: true });
    }

    const lead = getFreeLead();

    if (!lead) {
      if (!redirectedRef.current) {
        redirectedRef.current = true;
        toast({
          title: 'Cadastro obrigatório',
          description: 'Informe nome/e-mail para iniciar o teste.',
        });
      }
      navigate(createPageUrl('StartFree'), { replace: true });
      return;
    }

    setLeadName(lead.name);
    setLeadEmail(lead.email);
  }, [location.search, navigate]);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleAnswer = (answer) => {
    setAnswers(prev => ({
      ...prev,
      [answer.question_id]: answer
    }));
    
    // Auto-advance to next question after a short delay
    if (currentQuestion < FREE_QUESTIONS.length - 1) {
      setTimeout(() => {
        setCurrentQuestion(prev => prev + 1);
      }, 500);
    }
  };

  const calculateResults = () => {
    const scores = { D: 0, I: 0, S: 0, C: 0 };
    
    Object.values(answers).forEach(answer => {
      const question = FREE_QUESTIONS.find(q => q.id === answer.question_id);
      if (question) {
        const mostOption = question.options.find(o => o.id === answer.most);
        const leastOption = question.options.find(o => o.id === answer.least);
        
        if (mostOption) scores[mostOption.factor] += mostOption.weight;
        if (leastOption) scores[leastOption.factor] -= 1;
      }
    });

    // Normalize to percentages
    const total = Object.values(scores).reduce((a, b) => a + Math.max(0, b), 0) || 1;
    const normalized = {};
    Object.keys(scores).forEach(key => {
      normalized[key] = Math.round(Math.max(0, scores[key]) / total * 100);
    });

    // Find dominant factor
    const dominant = Object.entries(normalized).reduce((a, b) => a[1] > b[1] ? a : b)[0];

    return {
      natural_profile: normalized,
      dominant_factor: dominant,
      raw_scores: scores
    };
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length < FREE_QUESTIONS.length) {
      return;
    }

    setIsSubmitting(true);
    const results = calculateResults();

    try {
      // Check if user is authenticated
      const isAuth = await base44.auth.isAuthenticated();
      let userId = leadEmail || 'anonymous';
      const accessToken = generateInviteToken();
      const accessTokenHash = await hashInviteToken(accessToken);
      
      if (isAuth) {
        const user = await base44.auth.me();
        userId = user.id;
      }

      // Save assessment
      const assessment = await base44.entities.Assessment.create({
        user_id: userId,
        type: 'free',
        status: 'completed',
        answers: Object.values(answers),
        results: results,
        started_at: new Date(Date.now() - timeSpent * 1000).toISOString(),
        completed_at: new Date().toISOString(),
        time_spent_seconds: timeSpent,
        report_unlocked: false,
        ...(leadName ? { respondent_name: leadName } : {}),
        ...(leadEmail ? { respondent_email: leadEmail } : {}),
        ...(leadName ? { lead_name: leadName } : {}),
        ...(leadEmail ? { lead_email: leadEmail } : {}),
        access_token: accessToken,
        access_token_hash: accessTokenHash,
        invite_status: 'used',
        invite_used_at: new Date().toISOString(),
      });

      // Navigate to results page
      navigate(createPageUrl('FreeResults') + `?id=${assessment.id}`);
    } catch (error) {
      console.error('Error saving assessment:', error);
      // Still navigate but store results in localStorage as backup
      localStorage.setItem('freeAssessmentResults', JSON.stringify(results));
      navigate(createPageUrl('FreeResults'));
    }
  };

  const canGoBack = currentQuestion > 0;
  const canGoForward = answers[FREE_QUESTIONS[currentQuestion]?.id];
  const isComplete = Object.keys(answers).length === FREE_QUESTIONS.length;

  const handleConsentAccept = () => {
    localStorage.setItem('disc_consent_given', 'true');
    setConsentGiven(true);
  };

  const handleConsentDecline = () => {
    navigate(createPageUrl('Home'));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8 px-4">
      {!consentGiven && (
        <LGPDConsent onAccept={handleConsentAccept} onDecline={handleConsentDecline} />
      )}
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Avaliação DISC Rápida
          </h1>
          <p className="text-slate-600">
            Descubra seu perfil dominante em apenas 3 minutos
          </p>
          {(leadName || leadEmail) && (
            <p className="text-xs text-slate-500 mt-2">
              Participante: {leadName || '—'}{leadEmail ? ` (${leadEmail})` : ''}
            </p>
          )}
        </motion.div>

        {/* Progress */}
        <AssessmentProgress
          current={Object.keys(answers).length}
          total={FREE_QUESTIONS.length}
          timeSpent={timeSpent}
        />

        {/* Question */}
        <AnimatePresence mode="wait">
          <QuestionCard
            key={currentQuestion}
            question={FREE_QUESTIONS[currentQuestion]}
            questionNumber={currentQuestion + 1}
            totalQuestions={FREE_QUESTIONS.length}
            onAnswer={handleAnswer}
            initialAnswer={answers[FREE_QUESTIONS[currentQuestion]?.id]}
          />
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(prev => prev - 1)}
            disabled={!canGoBack}
            className="rounded-xl"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          {currentQuestion < FREE_QUESTIONS.length - 1 ? (
            <Button
              onClick={() => setCurrentQuestion(prev => prev + 1)}
              disabled={!canGoForward}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
            >
              Próxima
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!isComplete || isSubmitting}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                  />
                  Calculando...
                </>
              ) : (
                <>
                  Ver Resultado
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>

        {/* Question indicators */}
        <div className="flex justify-center gap-2 mt-8">
          {FREE_QUESTIONS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentQuestion(index)}
              className={`w-3 h-3 rounded-full transition-all ${
                index === currentQuestion
                  ? 'bg-indigo-600 scale-125'
                  : answers[FREE_QUESTIONS[index]?.id]
                  ? 'bg-indigo-400'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        <CFPDisclaimer compact />
      </div>
    </div>
  );
}
