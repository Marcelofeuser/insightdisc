import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, CheckCircle2, AlertTriangle, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { apiRequest, getApiBaseUrl } from '@/lib/apiClient';
import { validateInviteToken } from '@/modules/invites/invite-validation';

export default function CandidateOnboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const apiBaseUrl = getApiBaseUrl();

  const [tokenStatus, setTokenStatus] = useState('checking'); // checking | valid | used | expired | invalid
  const [assessment, setAssessment] = useState(null);
  const [tokenReason, setTokenReason] = useState('');
  const [validationSource, setValidationSource] = useState('mock'); // api | mock
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [cfpAccepted, setCfpAccepted] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!token) {
      setTokenReason('TOKEN_REQUIRED');
      setTokenStatus('invalid');
      return;
    }
    validateToken();
  }, [token]);

  const validateToken = async () => {
    const rawToken = String(token || '').trim();
    if (!rawToken) {
      setTokenReason('TOKEN_REQUIRED');
      setTokenStatus('invalid');
      return;
    }

    if (apiBaseUrl) {
      try {
        const payload = await apiRequest(
          `/assessment/validate-token?token=${encodeURIComponent(rawToken)}`
        );

        if (payload?.valid) {
          setValidationSource('api');
          setTokenReason('VALID');
          setAssessment({
            id: payload?.assessment?.id,
            user_id: payload?.assessment?.candidateEmail || payload?.assessment?.user_id || 'pending',
            respondent_email: payload?.assessment?.candidateEmail || '',
            respondent_name: payload?.assessment?.candidateName || '',
            status: payload?.assessment?.status || 'pending',
          });
          if (payload?.assessment?.candidateEmail) setEmail(payload.assessment.candidateEmail);
          setTokenStatus('valid');
          return;
        }
      } catch (apiError) {
        const reason = String(
          apiError?.payload?.reason || apiError?.message || ''
        ).toUpperCase();

        if (reason.includes('EXPIRED')) {
          setTokenReason('EXPIRED');
          setTokenStatus('expired');
          return;
        }
        if (reason.includes('USED')) {
          setTokenReason('USED');
          setTokenStatus('used');
          return;
        }
        if (reason === 'TOKEN_REQUIRED') {
          setTokenReason('TOKEN_REQUIRED');
          setTokenStatus('invalid');
          return;
        }

        console.warn('[CandidateOnboarding] backend validate-token unavailable, using fallback', apiError);
      }
    }

    try {
      const result = await validateInviteToken(rawToken, base44.entities.Assessment);
      if (result.status === 'invalid') {
        console.log('[CandidateOnboarding] invite invalid', { reason: result.reason, source: result.source });
        setTokenReason('NOT_FOUND');
        setTokenStatus('invalid');
        return;
      }
      if (result.status === 'expired') {
        setTokenReason('EXPIRED');
        setTokenStatus('expired');
        return;
      }
      if (result.status === 'used') {
        setTokenReason('USED');
        setTokenStatus('used');
        return;
      }

      const a = result.assessment;
      if (!a) {
        setTokenStatus('invalid');
        return;
      }

      setAssessment(a);
      setValidationSource('mock');
      setTokenReason('VALID');
      // Pre-fill email if invite was sent to a known email
      if (a.user_id && a.user_id !== 'pending' && a.user_id.includes('@')) {
        setEmail(a.user_id);
      } else if (a.respondent_email && a.respondent_email.includes('@')) {
        setEmail(a.respondent_email);
      }
      setTokenStatus('valid');
    } catch (error) {
      console.error('[CandidateOnboarding] token validation failed', error);
      setTokenStatus('invalid');
    }
  };

  const validate = () => {
    const errs = {};
    if (!name.trim() || name.trim().length < 2) errs.name = 'Nome deve ter pelo menos 2 caracteres';
    if (!email.trim() || !email.includes('@')) errs.email = 'Email inválido';
    if (!privacyAccepted) errs.privacy = 'Aceite obrigatório';
    if (!termsAccepted) errs.terms = 'Aceite obrigatório';
    if (!cfpAccepted) errs.cfp = 'Aceite obrigatório';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleStart = async () => {
    if (!validate()) return;
    setIsStarting(true);

    try {
      if (validationSource === 'api' && apiBaseUrl) {
        const payload = await apiRequest('/assessment/consume', {
          method: 'POST',
          body: {
            token,
            respondentName: name,
            respondentEmail: email,
          },
        });
        if (!payload?.ok) {
          throw new Error(payload?.error || 'Não foi possível iniciar a avaliação.');
        }
        const resolvedAssessmentId = payload.assessmentId || assessment?.id;
        if (!resolvedAssessmentId) {
          throw new Error('Assessment não encontrado para iniciar avaliação.');
        }
        sessionStorage.setItem('candidate_name', name);
        sessionStorage.setItem('candidate_email', email);
        const assessmentPath = location.pathname.startsWith('/c')
          ? '/c/assessment'
          : createPageUrl('PremiumAssessment');
        navigate(
          `${assessmentPath}?token=${encodeURIComponent(token)}&assessment_id=${encodeURIComponent(resolvedAssessmentId)}`
        );
        return;
      }

      // Mark assessment as in_progress and attach candidate info
      await base44.entities.Assessment.update(assessment.id, {
        status: 'in_progress',
        user_id: email,
        started_at: new Date().toISOString(),
        invite_status: 'used',
        invite_used_at: new Date().toISOString(),
      });
      // Store candidate name in sessionStorage for use in the assessment
      sessionStorage.setItem('candidate_name', name);
      sessionStorage.setItem('candidate_email', email);
      const assessmentPath = location.pathname.startsWith('/c')
        ? '/c/assessment'
        : createPageUrl('PremiumAssessment');
      navigate(
        `${assessmentPath}?token=${encodeURIComponent(token)}&assessment_id=${encodeURIComponent(assessment.id)}`
      );
    } catch (error) {
      console.error('[CandidateOnboarding] start failed', error);
      setIsStarting(false);
    }
  };

  // ── STATES ──────────────────────────────────────────────

  if (tokenStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-violet-50">
        <div className="text-center">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-600">Validando seu link...</p>
        </div>
      </div>
    );
  }

  if (tokenStatus === 'used') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-10 max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Teste já finalizado</h1>
          <p className="text-slate-600">Este link de avaliação já foi utilizado e o teste foi concluído. Cada link só pode ser usado uma vez.</p>
          <p className="text-sm text-slate-400 mt-4">Caso precise de um novo link, entre em contato com o profissional que te enviou o convite.</p>
        </motion.div>
      </div>
    );
  }

  if (tokenStatus === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-red-50 p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-10 max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Link inválido</h1>
          <p className="text-slate-600">Este link de avaliação é inválido ou expirou. Solicite um novo link ao profissional responsável.</p>
          {tokenReason ? (
            <p className="text-xs text-slate-400 mt-3">Motivo técnico: {tokenReason}</p>
          ) : null}
        </motion.div>
      </div>
    );
  }

  if (tokenStatus === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-amber-50 p-4">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl shadow-2xl p-10 max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Link expirado</h1>
          <p className="text-slate-600">Este convite expirou. Solicite um novo link ao profissional responsável.</p>
          {tokenReason ? (
            <p className="text-xs text-slate-400 mt-3">Motivo técnico: {tokenReason}</p>
          ) : null}
        </motion.div>
      </div>
    );
  }

  // ── VALID: ONBOARDING FORM ──────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-8 text-white text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Avaliação Comportamental DISC</h1>
          <p className="text-indigo-100 text-sm">Você foi convidado(a) para realizar uma avaliação de perfil comportamental</p>
          <div className="flex items-center justify-center gap-4 mt-4 text-xs text-white/70">
            <span>⏱ ~15 minutos</span>
            <span>•</span>
            <span>40 questões</span>
            <span>•</span>
            <span>🔒 Dados protegidos</span>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {/* Personal Info */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-900">Seus dados</h2>
            <div>
              <Label htmlFor="name" className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-slate-400" /> Nome completo *
              </Label>
              <Input
                id="name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Digite seu nome completo"
                className={`rounded-xl ${errors.name ? 'border-red-400' : ''}`}
              />
              {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="email" className="flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4 text-slate-400" /> E-mail *
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className={`rounded-xl ${errors.email ? 'border-red-400' : ''}`}
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* LGPD Consents */}
          <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-slate-800">Consentimento e Política de Privacidade (LGPD)</h3>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox id="privacy" checked={privacyAccepted} onCheckedChange={setPrivacyAccepted} className="mt-0.5" />
              <label htmlFor="privacy" className="text-sm text-slate-700 cursor-pointer leading-relaxed">
                Li e aceito a <span className="text-indigo-600 underline">Política de Privacidade</span> e autorizo o tratamento dos meus dados pessoais para fins de avaliação comportamental, conforme a LGPD (Lei 13.709/2018).
              </label>
            </div>
            {errors.privacy && <p className="text-xs text-red-500">{errors.privacy}</p>}

            <div className="flex items-start gap-3">
              <Checkbox id="terms" checked={termsAccepted} onCheckedChange={setTermsAccepted} className="mt-0.5" />
              <label htmlFor="terms" className="text-sm text-slate-700 cursor-pointer leading-relaxed">
                Li e aceito os <span className="text-indigo-600 underline">Termos de Uso</span> da plataforma.
              </label>
            </div>
            {errors.terms && <p className="text-xs text-red-500">{errors.terms}</p>}

            <div className="flex items-start gap-3">
              <Checkbox id="cfp" checked={cfpAccepted} onCheckedChange={setCfpAccepted} className="mt-0.5" />
              <label htmlFor="cfp" className="text-sm text-slate-700 cursor-pointer leading-relaxed">
                Compreendo que esta avaliação é uma <strong>ferramenta de mapeamento comportamental</strong>, não constitui diagnóstico clínico psicológico e não substitui avaliação de psicólogo habilitado (CFP).
              </label>
            </div>
            {errors.cfp && <p className="text-xs text-red-500">{errors.cfp}</p>}
          </div>

          <Button
            onClick={handleStart}
            disabled={isStarting}
            className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-xl shadow-lg"
          >
            {isStarting ? (
              <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" /> Iniciando...</>
            ) : (
              <><CheckCircle2 className="w-5 h-5 mr-2" /> Aceitar e Iniciar Avaliação</>
            )}
          </Button>

          <p className="text-xs text-center text-slate-400">
            Seus dados são tratados com segurança. Você pode solicitar a exclusão a qualquer momento via suporte.com
          </p>
        </div>
      </motion.div>
    </div>
  );
}
