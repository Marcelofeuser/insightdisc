import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Shield,
  Clock,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  WifiOff,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import QuestionCard from '@/components/disc/QuestionCard';
import AssessmentProgress from '@/components/disc/AssessmentProgress';
import AssessmentAchievements from '@/components/disc/AssessmentAchievements';
import AnswerFeedback from '@/components/disc/AnswerFeedback';
import { FULL_QUESTION_BANK, calculateDISCResults } from '@/components/disc/discEngine';
import { base44 } from '@/api/base44Client';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';

const DRAFT_KEY = (id) => `disc_draft_${id}`;
const QUICK_CONTEXT_STEP_KEY = (id) => `disc_quick_context_done_${id}`;
const QUICK_CONTEXT_DATA_KEY = (id) => `disc_quick_context_data_${id}`;
const TOTAL_QUESTIONS = 40;

const QUICK_CONTEXT_DEFAULT = {
  sex: '',
  maritalStatus: '',
  city: '',
  smoker: '',
  alcoholConsumption: '',
  stressLevel: '',
  sleepQuality: '',
  physicalActivity: '',
  usesMedication: '',
  healthConditions: '',
};

function normalizeAnswer(answer) {
  if (!answer) return null;
  const questionId = answer.question_id || answer.questionId;
  if (!questionId || !answer.most || !answer.least) return null;
  return {
    question_id: String(questionId),
    most: String(answer.most),
    least: String(answer.least),
    answered_at: answer.answered_at || answer.answeredAt || new Date().toISOString(),
  };
}

function normalizeAnswerList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(normalizeAnswer).filter(Boolean);
}

function optionIndexFromLegacyId(optionId) {
  const match = String(optionId || '')
    .toLowerCase()
    .match(/([a-d])$/);
  if (!match) return -1;
  return { a: 0, b: 1, c: 2, d: 3 }[match[1]] ?? -1;
}

function mergeAnswerLists(importedAnswers = [], mappedAnswers = []) {
  const merged = new Map();
  [...importedAnswers, ...mappedAnswers]
    .map(normalizeAnswer)
    .filter(Boolean)
    .forEach((answer) => {
      merged.set(answer.question_id, answer);
    });
  return Array.from(merged.values());
}

function parseDraft(raw) {
  try {
    const parsed = JSON.parse(raw || '{}');
    return {
      savedAnswers:
        parsed?.savedAnswers && typeof parsed.savedAnswers === 'object'
          ? parsed.savedAnswers
          : {},
      savedQuestion:
        typeof parsed?.savedQuestion === 'number' ? parsed.savedQuestion : null,
    };
  } catch {
    return { savedAnswers: {}, savedQuestion: null };
  }
}

export default function PremiumAssessment() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { access: authAccess, user: authUser } = useAuth();

  const token = searchParams.get('token');
  const prefetchedId = searchParams.get('assessment_id');
  const reportType = String(searchParams.get('type') || searchParams.get('reportType') || 'business')
    .trim()
    .toLowerCase();
  const resumeMode = searchParams.get('resume') === '1';
  const queryAnsweredCount = Number(searchParams.get('answeredCount') || 0);
  const apiBaseUrl = getApiBaseUrl();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [importedAnswers, setImportedAnswers] = useState([]);
  const [resumeFloor, setResumeFloor] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assessmentId, setAssessmentId] = useState(prefetchedId || null);
  const [initError, setInitError] = useState(null);
  const [feedbackTrigger, setFeedbackTrigger] = useState(0);
  const [isProgressReady, setIsProgressReady] = useState(false);
  const [showContextIntro, setShowContextIntro] = useState(false);
  const [showQuickContextForm, setShowQuickContextForm] = useState(false);
  const [isQuickContextSaving, setIsQuickContextSaving] = useState(false);
  const [quickContextError, setQuickContextError] = useState('');
  const [quickContext, setQuickContext] = useState(QUICK_CONTEXT_DEFAULT);
  const advanceTimeoutRef = useRef(null);

  const questions = useMemo(() => FULL_QUESTION_BANK.slice(0, TOTAL_QUESTIONS), []);

  useEffect(() => {
    const timer = setInterval(() => setTimeSpent((prev) => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(
    () => () => {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }
    },
    []
  );

  useEffect(() => {
    if (prefetchedId) {
      setAssessmentId(prefetchedId);
      return;
    }
    initAssessment();
  }, [prefetchedId]);

  useEffect(() => {
    if (!assessmentId) return;

    let mounted = true;

    const hydrateProgress = async () => {
      setIsProgressReady(false);
      const questionIds = new Set(questions.map((question) => question.id));

      let existingAnswers = [];
      let respondentName = '';
      let respondentEmail = '';

      if (apiBaseUrl && token) {
        try {
          const payload = await apiRequest(
            `/assessment/report-by-token?token=${encodeURIComponent(token)}&type=${encodeURIComponent(reportType)}`
          );
          existingAnswers = normalizeAnswerList(payload?.answers || []);
          respondentName = payload?.assessment?.candidateName || '';
          respondentEmail = payload?.assessment?.candidateEmail || '';
        } catch {
          // fallback below
        }
      }

      if (!apiBaseUrl && existingAnswers.length === 0) {
        try {
          const local = await base44.entities.Assessment.filter({ id: assessmentId });
          if (local?.length) {
            existingAnswers = normalizeAnswerList(local[0]?.answers || []);
            respondentName =
              local[0]?.respondent_name || local[0]?.candidateName || respondentName;
            respondentEmail =
              local[0]?.respondent_email || local[0]?.candidateEmail || respondentEmail;
          }
        } catch {
          // ignore local fallback errors
        }
      }

      if (respondentName) {
        sessionStorage.setItem('candidate_name', respondentName);
      }
      if (respondentEmail) {
        sessionStorage.setItem('candidate_email', respondentEmail);
      }

      const mappedExisting = {};
      const importedExtra = [];
      let legacyCursor = 0;
      existingAnswers.forEach((answer) => {
        if (questionIds.has(answer.question_id)) {
          mappedExisting[answer.question_id] = answer;
        } else {
          const targetQuestion = questions[legacyCursor];
          const mostIdx = optionIndexFromLegacyId(answer.most);
          const leastIdx = optionIndexFromLegacyId(answer.least);

          if (
            targetQuestion &&
            mostIdx >= 0 &&
            leastIdx >= 0 &&
            targetQuestion.options?.[mostIdx]?.id &&
            targetQuestion.options?.[leastIdx]?.id
          ) {
            mappedExisting[targetQuestion.id] = {
              question_id: targetQuestion.id,
              most: targetQuestion.options[mostIdx].id,
              least: targetQuestion.options[leastIdx].id,
              answered_at: answer.answered_at || new Date().toISOString(),
            };
            legacyCursor += 1;
          } else {
            importedExtra.push(answer);
          }
        }
      });

      const draftRaw = localStorage.getItem(DRAFT_KEY(assessmentId));
      const { savedAnswers, savedQuestion } = parseDraft(draftRaw);

      const mergedMap = { ...mappedExisting, ...savedAnswers };
      const inferredAnsweredCount = importedExtra.length + Object.keys(mergedMap).length;
      const resumeStart = resumeMode
        ? Math.min(
            questions.length - 1,
            Math.max(queryAnsweredCount || 0, inferredAnsweredCount)
          )
        : 0;

      let shouldShowContextIntro = false;
      let resolvedQuickContext = { ...QUICK_CONTEXT_DEFAULT };
      let hasRemoteQuickContext = false;
      const quickContextDoneLocally = localStorage.getItem(QUICK_CONTEXT_STEP_KEY(assessmentId)) === '1';

      if (apiBaseUrl && token) {
        try {
          const quickPayload = await apiRequest(
            `/api/anamnesis/quick/${encodeURIComponent(
              assessmentId,
            )}?token=${encodeURIComponent(token)}`,
            { method: 'GET' },
          );
          if (quickPayload?.quickContext) {
            hasRemoteQuickContext = true;
            resolvedQuickContext = {
              ...QUICK_CONTEXT_DEFAULT,
              ...quickPayload.quickContext,
            };
          }
        } catch {
          // segue fluxo normal; contexto é opcional.
        }
      } else {
        try {
          const localQuickRaw = localStorage.getItem(QUICK_CONTEXT_DATA_KEY(assessmentId));
          if (localQuickRaw) {
            const parsed = JSON.parse(localQuickRaw);
            if (parsed && typeof parsed === 'object') {
              hasRemoteQuickContext = true;
              resolvedQuickContext = {
                ...QUICK_CONTEXT_DEFAULT,
                ...parsed,
              };
            }
          }
        } catch {
          // ignora falha de parse local
        }
      }

      if (!quickContextDoneLocally && !hasRemoteQuickContext && inferredAnsweredCount === 0) {
        shouldShowContextIntro = true;
      }

      if (!mounted) return;

      setImportedAnswers(importedExtra);
      setAnswers(mergedMap);
      setResumeFloor(resumeStart);
      setQuickContext(resolvedQuickContext);
      setShowContextIntro(shouldShowContextIntro);
      setShowQuickContextForm(false);

      if (savedQuestion !== null) {
        const clamped = Math.max(0, Math.min(questions.length - 1, savedQuestion));
        setCurrentQuestion(resumeMode ? Math.max(clamped, resumeStart) : clamped);
      } else {
        setCurrentQuestion(resumeStart);
      }

      setIsProgressReady(true);
    };

    hydrateProgress();

    return () => {
      mounted = false;
    };
  }, [assessmentId, apiBaseUrl, token, resumeMode, queryAnsweredCount, questions]);

  const initAssessment = async () => {
    try {
      if (apiBaseUrl) {
        if (token) {
          try {
            const validationPayload = await apiRequest(
              `/assessment/validate-token?token=${encodeURIComponent(token)}`,
              { method: 'GET' },
            );
            const resolvedAssessmentId = validationPayload?.assessment?.id || '';
            if (resolvedAssessmentId) {
              setAssessmentId(resolvedAssessmentId);
              return;
            }
          } catch {
            // Fallback below: some tokens can be used/legacy but still resolvable via report endpoint.
          }

          try {
            const reportPayload = await apiRequest(
              `/assessment/report-by-token?token=${encodeURIComponent(token)}&type=${encodeURIComponent(reportType)}`,
              { method: 'GET' },
            );
            const resolvedAssessmentId = reportPayload?.assessment?.id || '';
            if (resolvedAssessmentId) {
              setAssessmentId(resolvedAssessmentId);
              return;
            }
          } catch {
            // Handled with friendly initError below.
          }

          setInitError('Não foi possível validar o link da avaliação.');
          return;
        }

        const apiToken = getApiToken();
        if (!apiToken) {
          setInitError('Sessão não encontrada. Faça login novamente para iniciar sua avaliação.');
          return;
        }

        const payload = await apiRequest('/assessment/self/start', {
          method: 'POST',
          requireAuth: true,
        });
        if (!payload?.token) {
          throw new Error('Falha ao iniciar autoavaliação interna.');
        }

        const assessmentPath = location.pathname.startsWith('/c')
          ? '/c/assessment'
          : createPageUrl('PremiumAssessment');

        navigate(
          `${assessmentPath}?token=${encodeURIComponent(payload.token)}&self=1&from=assessment`,
          { replace: true },
        );
        return;
      }

      const fallbackUserId =
        authAccess?.userId ||
        authUser?.id ||
        authUser?.email ||
        (typeof window !== 'undefined'
          ? String(window.localStorage.getItem('disc_mock_user_email') || '').trim()
          : '') ||
        null;

      let resolvedUserId = fallbackUserId;
      if (!resolvedUserId) {
        try {
          const currentUser = await base44.auth.me();
          resolvedUserId = currentUser?.id || currentUser?.email || null;
        } catch {
          resolvedUserId = null;
        }
      }

      if (!resolvedUserId) {
        setInitError('Sessão não encontrada. Faça login novamente para iniciar sua avaliação.');
        return;
      }

      const assessment = await base44.entities.Assessment.create({
        user_id: resolvedUserId,
        type: 'business',
        status: 'in_progress',
        access_token: token || null,
        started_at: new Date().toISOString(),
      });
      setAssessmentId(assessment.id);
    } catch {
      setInitError('Não foi possível iniciar a avaliação. Verifique sua conexão.');
    }
  };

  const handleSubmit = async (answersOverride = null) => {
    if (!assessmentId || isSubmitting) return;

    const answerSource =
      answersOverride && typeof answersOverride === 'object' ? answersOverride : answers;
    const answerList = mergeAnswerLists(importedAnswers, Object.values(answerSource));
    if (answerList.length < questions.length) {
      return;
    }

    setIsSubmitting(true);
    const results = calculateDISCResults(answerList, questions);

    try {
      if (apiBaseUrl) {
        if (!token) {
          throw new Error('TOKEN_REQUIRED_FOR_API_SUBMIT');
        }

        const payload = await apiRequest('/assessment/submit', {
          method: 'POST',
          body: {
            token,
            respondentName: sessionStorage.getItem('candidate_name') || 'Participante',
            respondentEmail:
              sessionStorage.getItem('candidate_email') || 'participante@example.com',
            answers: answerList.map((answer) => ({
              questionId: answer.question_id || answer.questionId,
              most: answer.most,
              least: answer.least,
            })),
          },
        });
        if (!payload?.ok) {
          throw new Error(payload?.error || payload?.reason || 'Falha ao enviar respostas.');
        }

        localStorage.removeItem(DRAFT_KEY(assessmentId));
        const resolvedAssessmentId = payload.assessmentId || assessmentId;
        const reportPath =
          token && location.pathname.startsWith('/c')
            ? payload?.publicAccess?.publicReportPath || `/c/report?token=${encodeURIComponent(token)}&type=${encodeURIComponent(reportType)}`
            : `${createPageUrl('Report')}?id=${encodeURIComponent(resolvedAssessmentId)}`;
        navigate(reportPath);
        return;
      }

      await base44.entities.Assessment.update(assessmentId, {
        status: 'completed',
        answers: answerList,
        results,
        respondent_name: sessionStorage.getItem('candidate_name') || 'Participante',
        respondent_email:
          sessionStorage.getItem('candidate_email') || 'participante@example.com',
        candidateName: sessionStorage.getItem('candidate_name') || 'Participante',
        candidateEmail:
          sessionStorage.getItem('candidate_email') || 'participante@example.com',
        completed_at: new Date().toISOString(),
        time_spent_seconds: timeSpent,
        report_unlocked: true,
      });

      localStorage.removeItem(DRAFT_KEY(assessmentId));

      const reportPath =
        token && location.pathname.startsWith('/c')
          ? `/c/report?token=${encodeURIComponent(token)}&type=${encodeURIComponent(reportType)}`
          : `${createPageUrl('Report')}?id=${encodeURIComponent(assessmentId)}`;
      navigate(reportPath);
    } catch (error) {
      console.error('Submit failed:', error);
      setIsSubmitting(false);
    }
  };

  const markQuickContextDone = () => {
    if (assessmentId) {
      localStorage.setItem(QUICK_CONTEXT_STEP_KEY(assessmentId), '1');
    }
    setShowQuickContextForm(false);
    setShowContextIntro(false);
    setQuickContextError('');
  };

  const handleQuickContextChange = (field, value) => {
    setQuickContext((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuickContextSave = async () => {
    if (!assessmentId) {
      markQuickContextDone();
      return;
    }

    setIsQuickContextSaving(true);
    setQuickContextError('');

    try {
      if (apiBaseUrl) {
        await apiRequest('/api/anamnesis/quick', {
          method: 'POST',
          body: {
            assessmentId,
            token: token || undefined,
            ...quickContext,
          },
        });
      } else {
        localStorage.setItem(QUICK_CONTEXT_DATA_KEY(assessmentId), JSON.stringify(quickContext));
      }

      markQuickContextDone();
    } catch (error) {
      setQuickContextError(
        String(error?.payload?.message || error?.message || '').trim() ||
          'Não foi possível salvar o contexto agora.',
      );
    } finally {
      setIsQuickContextSaving(false);
    }
  };

  const handleNextQuestion = () => {
    const nextIndex = currentQuestion + 1;
    console.log('[PremiumAssessment] Current question:', currentQuestion);
    console.log('[PremiumAssessment] Total questions:', questions.length);

    if (nextIndex >= questions.length) {
      void handleSubmit();
      return;
    }

    setCurrentQuestion(nextIndex);
  };

  const handleAnswer = (answer) => {
    const normalized = normalizeAnswer(answer);
    if (!normalized) return;

    const nextAnswers = { ...answers, [normalized.question_id]: normalized };
    setAnswers(nextAnswers);

    if (assessmentId) {
      localStorage.setItem(
        DRAFT_KEY(assessmentId),
        JSON.stringify({
          savedAnswers: nextAnswers,
          savedQuestion: currentQuestion,
        })
      );
    }

    setFeedbackTrigger((prev) => prev + 1);

    if (currentQuestion >= questions.length - 3) {
      console.log('[PremiumAssessment] Current question:', currentQuestion);
      console.log('[PremiumAssessment] Total questions:', questions.length);
    }

    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
    }

    if (currentQuestion >= questions.length - 1) {
      advanceTimeoutRef.current = setTimeout(() => {
        void handleSubmit(nextAnswers);
      }, 300);
      return;
    }

    advanceTimeoutRef.current = setTimeout(() => {
      handleNextQuestion();
    }, 450);
  };

  const answeredCount = importedAnswers.length + Object.keys(answers).length;
  const isComplete = answeredCount >= questions.length;
  const currentQuestionData = questions[currentQuestion];
  const currentQuestionId = currentQuestionData?.id;
  const currentAnswered =
    currentQuestion < resumeFloor || Boolean(answers[currentQuestionId]);
  const minQuestionIndex = resumeMode ? resumeFloor : 0;
  const canGoBack = currentQuestion > minQuestionIndex;

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="text-center text-white">
          <WifiOff className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h2 className="text-xl font-bold mb-2">Erro ao iniciar</h2>
          <p className="text-white/70 mb-6">{initError}</p>
          <Button onClick={initAssessment} className="bg-indigo-600 hover:bg-indigo-700">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  if (!isProgressReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="text-center text-white">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-2 border-white border-t-transparent rounded-full mx-auto mb-3"
          />
          <p className="text-sm text-white/70">Carregando seu progresso...</p>
        </div>
      </div>
    );
  }

  if (!currentQuestionData) {
    console.error('[PremiumAssessment] Invalid question index', {
      currentQuestion,
      totalQuestions: questions.length,
    });
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="text-center text-white">
          <p className="text-sm text-white/70">Carregando pergunta...</p>
        </div>
      </div>
    );
  }

  if (showContextIntro || showQuickContextForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur text-white text-sm font-medium mb-3">
              <Sparkles className="w-4 h-4" />
              Avaliação Premium DISC
            </div>
          </motion.div>

          <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8">
            {showContextIntro ? (
              <div className="space-y-5">
                <h2 className="text-2xl font-bold text-slate-900">Contexto Pessoal (Opcional)</h2>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Antes de iniciar sua avaliação DISC, você pode responder uma breve ficha de
                  contexto pessoal.
                </p>
                <p className="text-sm text-slate-700 leading-relaxed">
                  Essas informações ajudam profissionais a interpretar melhor o relatório
                  comportamental.
                </p>
                <p className="text-sm text-slate-500">Tempo estimado: menos de 1 minuto.</p>
                <p className="text-xs text-slate-500">
                  Estas informações são utilizadas apenas para contextualização da avaliação
                  comportamental.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => {
                      setQuickContextError('');
                      setShowContextIntro(false);
                      setShowQuickContextForm(true);
                    }}
                  >
                    Responder contexto
                  </Button>
                  <Button variant="outline" onClick={markQuickContextDone}>
                    Pular e iniciar avaliação
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold text-slate-900">Contexto Pessoal (Opcional)</h2>
                  <p className="text-sm text-slate-600">
                    Responda apenas o que desejar. Nenhuma resposta altera o cálculo DISC.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Sexo</span>
                    <select
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                      value={quickContext.sex}
                      onChange={(event) => handleQuickContextChange('sex', event.target.value)}
                    >
                      <option value="">Selecionar</option>
                      <option value="feminino">Feminino</option>
                      <option value="masculino">Masculino</option>
                      <option value="outro">Outro</option>
                      <option value="prefiro não informar">Prefiro não informar</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Estado civil</span>
                    <select
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                      value={quickContext.maritalStatus}
                      onChange={(event) =>
                        handleQuickContextChange('maritalStatus', event.target.value)
                      }
                    >
                      <option value="">Selecionar</option>
                      <option value="solteiro(a)">Solteiro(a)</option>
                      <option value="casado(a)">Casado(a)</option>
                      <option value="união estável">União estável</option>
                      <option value="divorciado(a)">Divorciado(a)</option>
                      <option value="viúvo(a)">Viúvo(a)</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                    <span>Cidade onde reside</span>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                      value={quickContext.city}
                      onChange={(event) => handleQuickContextChange('city', event.target.value)}
                      placeholder="Ex: São Paulo - SP"
                    />
                  </label>

                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Você fuma?</span>
                    <select
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                      value={quickContext.smoker}
                      onChange={(event) => handleQuickContextChange('smoker', event.target.value)}
                    >
                      <option value="">Selecionar</option>
                      <option value="não">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Consome álcool?</span>
                    <select
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                      value={quickContext.alcoholConsumption}
                      onChange={(event) =>
                        handleQuickContextChange('alcoholConsumption', event.target.value)
                      }
                    >
                      <option value="">Selecionar</option>
                      <option value="não">Não</option>
                      <option value="ocasionalmente">Ocasionalmente</option>
                      <option value="frequentemente">Frequentemente</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Nível de estresse atual</span>
                    <select
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                      value={quickContext.stressLevel}
                      onChange={(event) =>
                        handleQuickContextChange('stressLevel', event.target.value)
                      }
                    >
                      <option value="">Selecionar</option>
                      <option value="baixo">Baixo</option>
                      <option value="moderado">Moderado</option>
                      <option value="alto">Alto</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Qualidade do sono</span>
                    <select
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                      value={quickContext.sleepQuality}
                      onChange={(event) =>
                        handleQuickContextChange('sleepQuality', event.target.value)
                      }
                    >
                      <option value="">Selecionar</option>
                      <option value="boa">Boa</option>
                      <option value="regular">Regular</option>
                      <option value="ruim">Ruim</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Pratica atividade física?</span>
                    <select
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                      value={quickContext.physicalActivity}
                      onChange={(event) =>
                        handleQuickContextChange('physicalActivity', event.target.value)
                      }
                    >
                      <option value="">Selecionar</option>
                      <option value="não">Não</option>
                      <option value="1-2x semana">1-2x semana</option>
                      <option value="3+ vezes semana">3+ vezes semana</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-sm text-slate-700">
                    <span>Usa medicamento contínuo?</span>
                    <select
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                      value={quickContext.usesMedication}
                      onChange={(event) =>
                        handleQuickContextChange('usesMedication', event.target.value)
                      }
                    >
                      <option value="">Selecionar</option>
                      <option value="não">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-sm text-slate-700 md:col-span-2">
                    <span>Condição de saúde relevante (opcional)</span>
                    <textarea
                      rows={3}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900"
                      value={quickContext.healthConditions}
                      onChange={(event) =>
                        handleQuickContextChange('healthConditions', event.target.value)
                      }
                      placeholder="Digite apenas se desejar compartilhar contexto adicional."
                    />
                  </label>
                </div>

                {quickContextError ? (
                  <p className="text-sm text-red-600">{quickContextError}</p>
                ) : null}

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="bg-indigo-600 hover:bg-indigo-700"
                    onClick={handleQuickContextSave}
                    disabled={isQuickContextSaving}
                  >
                    {isQuickContextSaving ? 'Salvando...' : 'Salvar contexto e iniciar avaliação'}
                  </Button>
                  <Button variant="outline" onClick={markQuickContextDone} disabled={isQuickContextSaving}>
                    Pular e iniciar avaliação
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-violet-900 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur text-white text-sm font-medium mb-3">
            <Sparkles className="w-4 h-4" />
            Avaliação Premium DISC
          </div>
          <div className="flex items-center justify-center gap-4 text-white/60 text-sm">
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> ~15 min
            </span>
            <span className="flex items-center gap-1">
              <Shield className="w-4 h-4" /> Dados protegidos
            </span>
          </div>
        </motion.div>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-6 space-y-3">
          <AssessmentProgress current={answeredCount} total={questions.length} timeSpent={timeSpent} />
          <div className="flex items-center justify-between">
            <AssessmentAchievements answered={answeredCount} total={questions.length} />
            <AnswerFeedback trigger={feedbackTrigger} />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8">
          <AnimatePresence mode="wait">
            <QuestionCard
              key={currentQuestion}
              question={currentQuestionData}
              questionNumber={currentQuestion + 1}
              totalQuestions={questions.length}
              onAnswer={handleAnswer}
              initialAnswer={answers[currentQuestionId]}
            />
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion((prev) => Math.max(minQuestionIndex, prev - 1))}
            disabled={!canGoBack}
            className="rounded-xl bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Anterior
          </Button>

          {currentQuestion < questions.length - 1 ? (
            <Button
              onClick={handleNextQuestion}
              disabled={!currentAnswered}
              className="rounded-xl bg-white text-indigo-900 hover:bg-white/90 font-semibold"
            >
              Próxima <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!isComplete || isSubmitting}
              className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold hover:from-amber-500 hover:to-orange-600"
            >
              {isSubmitting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full mr-2"
                  />
                  Gerando Relatório...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Finalizar e Ver Relatório
                </>
              )}
            </Button>
          )}
        </div>

        <div className="flex justify-center gap-1.5 mt-6 flex-wrap max-w-sm mx-auto">
          {questions.map((question, index) => {
            const isAnswered = index < resumeFloor || Boolean(answers[question.id]);
            const isLocked = resumeMode && index < resumeFloor;

            return (
              <button
                key={question.id}
                onClick={() => {
                  if (!isLocked) setCurrentQuestion(index);
                }}
                title={`Questão ${index + 1}`}
                className={`w-3 h-3 rounded-full transition-all ${
                  index === currentQuestion
                    ? 'bg-white scale-125'
                    : isAnswered
                      ? 'bg-indigo-400'
                      : 'bg-white/20'
                } ${isLocked ? 'cursor-default' : ''}`}
              />
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-white/40 text-xs">
          <AlertTriangle className="w-3 h-3" />
          Progresso salvo automaticamente. Não feche até finalizar.
        </div>
      </div>
    </div>
  );
}
