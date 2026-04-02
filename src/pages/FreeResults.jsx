import React, { useCallback, useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Lock, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2,
  RefreshCw,
  UserPlus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import DISCRadarChart from '@/components/disc/DISCRadarChart';
import DISCFactorCard from '@/components/disc/DISCFactorCard';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { PRODUCTS, formatPriceBRL } from '@/config/pricing';
import { calculateProfileCompatibility } from '@/modules/disc/compatibility';
import { isSuperAdminAccess } from '@/modules/auth/access-control';
import { findCandidateReportByIdentifier, mapCandidateReports } from '@/modules/report/backendReports.js';
import { buildAssessmentReportPath, ReportValueLadderCard } from '@/modules/reports';
import { markCheckoutPreviewSeen } from '@/modules/checkout/funnel';

const RELATION_LABELS = Object.freeze({
  friend: 'amigo',
  boss: 'chefe',
  partner: 'parceiro',
  coworker: 'colega de trabalho',
});

const FACTOR_INFO = {
  D: {
    name: 'Dominância',
    emoji: '🦁',
    color: 'from-red-500 to-rose-600',
    description: 'Você é orientado a resultados, decidido e competitivo. Gosta de desafios e de estar no controle.',
    strengths: ['Decisivo', 'Direto', 'Competitivo', 'Orientado a metas'],
    challenges: ['Pode ser impaciente', 'Tendência a dominar conversas']
  },
  I: {
    name: 'Influência',
    emoji: '🦊',
    color: 'from-orange-500 to-amber-600',
    description: 'Você é comunicativo, entusiasta e persuasivo. Inspira pessoas e adora trabalhar em equipe.',
    strengths: ['Comunicativo', 'Persuasivo', 'Entusiasta', 'Inspirador'],
    challenges: ['Pode perder foco', 'Tendência a falar demais']
  },
  S: {
    name: 'Estabilidade',
    emoji: '🐢',
    color: 'from-green-500 to-emerald-600',
    description: 'Você é calmo, paciente e confiável. Valoriza harmonia e relacionamentos duradouros.',
    strengths: ['Paciente', 'Confiável', 'Bom ouvinte', 'Colaborativo'],
    challenges: ['Resistência a mudanças', 'Evita conflitos']
  },
  C: {
    name: 'Conformidade',
    emoji: '🦉',
    color: 'from-blue-500 to-indigo-600',
    description: 'Você é analítico, preciso e sistemático. Busca qualidade e excelência em tudo que faz.',
    strengths: ['Analítico', 'Preciso', 'Organizado', 'Qualidade'],
    challenges: ['Pode ser perfeccionista', 'Demora para decidir']
  }
};

function buildCandidateReportUnlockUrl({ assessmentId = '', token = '' } = {}) {
  const params = new URLSearchParams();

  params.set('flow', 'candidate');

  if (assessmentId) {
    params.set('assessmentId', assessmentId);
  }

  if (token) {
    params.set('token', token);
  }

  return '/checkout/plan/personal?' + params.toString();
}

export default function FreeResults() {
  const { access } = useAuth();
  const [searchParams] = useSearchParams();
  const apiBaseUrl = getApiBaseUrl();
  const [assessment, setAssessment] = useState(null);
  const [comparisonAssessment, setComparisonAssessment] = useState(null);
  const [comparisonError, setComparisonError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const requestedAssessmentId = String(searchParams.get('id') || '').trim();
  const requestedAssessmentToken = String(searchParams.get('token') || '').trim();
  const requestedEmail = String(searchParams.get('email') || '').trim();
  const requestedName = String(searchParams.get('name') || '').trim();

  const loadAssessment = useCallback(async () => {
    const assessmentId = requestedAssessmentId;
    const compareWith = searchParams.get('compareWith');
    let loaded = false;
    let loadedComparison = false;
    let apiReports = [];

    setIsLoading(true);
    setAssessment(null);
    setComparisonError('');
    setComparisonAssessment(null);

    if (apiBaseUrl && getApiToken()) {
      try {
        const payload = await apiRequest('/candidate/me/reports', {
          method: 'GET',
          requireAuth: true,
        });
        apiReports = mapCandidateReports(payload?.reports || []);

        if (assessmentId) {
          const matched = findCandidateReportByIdentifier(apiReports, assessmentId);
          if (matched?.results) {
            setAssessment(matched);
            loaded = true;
          }
        }

        if (compareWith) {
          const comparison = findCandidateReportByIdentifier(apiReports, compareWith);
          if (comparison?.results) {
            setComparisonAssessment(comparison);
            loadedComparison = true;
          } else {
            setComparisonError('Não foi possível localizar o perfil de referência para comparação.');
          }
        }
      } catch {
        // fallback Base44/localStorage abaixo
      }
    }
    
    if (assessmentId && !loaded) {
      try {
        const data = await base44.entities.Assessment.filter({ id: assessmentId });
        if (data.length > 0) {
          setAssessment(data[0]);
          loaded = true;
        }
      } catch (error) {
        console.error('Error loading assessment:', error);
      }
    }
    
    // Fallback to localStorage (fix: use local variable, not stale state)
    if (!loaded) {
      const localResults = window.localStorage.getItem('freeAssessmentResults');
      if (localResults) {
        try {
          setAssessment({ results: JSON.parse(localResults) });
        } catch {
          // malformed JSON in localStorage — ignore
        }
      }
    }

    if (compareWith && !loadedComparison && apiReports.length === 0) {
      try {
        const comparisonRows = await base44.entities.Assessment.filter({ id: compareWith });
        if (comparisonRows.length > 0) {
          setComparisonAssessment(comparisonRows[0]);
          loadedComparison = true;
        } else {
          setComparisonError('Não foi possível localizar o perfil de referência para comparação.');
        }
      } catch (error) {
        console.error('Error loading comparison assessment:', error);
        setComparisonError('Falha ao carregar o perfil de comparação.');
      }
    }
    
    setIsLoading(false);
  }, [apiBaseUrl, requestedAssessmentId, searchParams]);

  useEffect(() => {
    const run = async () => {
      await loadAssessment();
    };
    run();
  }, [loadAssessment]);

  useEffect(() => {
    if (!assessment?.results) return;

    markCheckoutPreviewSeen({
      source: 'free_results',
      assessmentId: String(assessment?.id || requestedAssessmentId || '').trim(),
      reportType: 'preview',
    });
  }, [assessment?.id, assessment?.results, requestedAssessmentId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const hasAssessmentContext = Boolean(
    requestedAssessmentId || requestedAssessmentToken || requestedEmail || requestedName
  );
  const hasSuperAdminBypass = isSuperAdminAccess(access);

  if (!assessment?.results) {
    const fallbackCheckoutUrl =
      requestedAssessmentId && requestedAssessmentToken
        ? buildCandidateReportUnlockUrl({
            assessmentId: requestedAssessmentId,
            token: requestedAssessmentToken,
          })
        : '';
    const errorTitle = hasAssessmentContext
      ? 'Não foi possível carregar seu resultado'
      : 'Resultado não encontrado';
    const errorDescription = hasAssessmentContext
      ? 'O link recebido pode estar incompleto, expirado ou inválido. Você pode refazer o teste agora e só seguir para o checkout se quiser.'
      : 'Não encontramos um resultado salvo para esta sessão. Refaça o teste para gerar um novo preview do perfil.';

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <RefreshCw className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">{errorTitle}</h1>
          <p className="text-slate-600 mb-6">{errorDescription}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link to={createPageUrl('StartFree')}>
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <RefreshCw className="w-4 h-4 mr-2" />
                Fazer Teste Novamente
              </Button>
            </Link>
            {fallbackCheckoutUrl ? (
              <Link to={fallbackCheckoutUrl}>
                <Button variant="outline" className="rounded-xl">
                  Ir para checkout
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            ) : null}
          </div>
          {fallbackCheckoutUrl ? (
            <p className="mt-4 text-sm text-slate-500">
              Se você recebeu um link de desbloqueio, use o checkout apenas pelo botão acima.
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  const { results } = assessment;
  const dominant = results.dominant_factor || 'D';
  const dominantInfo = FACTOR_INFO[dominant] || FACTOR_INFO.D;
  const profile = results.natural_profile || {};
  const isUnlocked = Boolean(assessment?.report_unlocked) || hasSuperAdminBypass;
  const currentReportTier = hasSuperAdminBypass ? 'professional' : isUnlocked ? 'premium' : 'standard';
  const assessmentToken = String(
    assessment?.access_token || assessment?.publicToken || assessment?.public_token || requestedAssessmentToken || ''
  ).trim();
  const resolvedAssessmentId = String(
    assessment?.assessmentId || assessment?.id || requestedAssessmentId || ''
  ).trim();
  const pricingUrl = buildCandidateReportUnlockUrl({
    assessmentId: resolvedAssessmentId,
    token: assessmentToken,
  });
  const continueReportUrl = resolvedAssessmentId
    ? buildAssessmentReportPath(resolvedAssessmentId)
    : assessmentToken
        ? '/c/report?token=' + encodeURIComponent(assessmentToken) + '&type=business'
      : createPageUrl('Dashboard');
  const reportUnlockPriceLabel = formatPriceBRL(PRODUCTS.REPORT_UNLOCK.price);
  const compareRelation = searchParams.get('relation') || '';
  const compareFromName = searchParams.get('fromName') || '';
  const currentName = assessment?.respondent_name || assessment?.lead_name || searchParams.get('name') || 'Você';
  const comparisonProfile =
    comparisonAssessment?.results?.natural_profile || comparisonAssessment?.natural_profile || null;
  const compatibilityResult = comparisonProfile
    ? calculateProfileCompatibility(profile, comparisonProfile, {
      relationLabel: RELATION_LABELS[compareRelation] || 'relacionamento',
    })
    : null;

  const buildCompareInviteUrl = (relation) => {
    if (!assessment?.id) return createPageUrl('StartFree');
    const params = new URLSearchParams();
    params.set('compareWith', assessment.id);
    params.set('relation', relation);
    params.set('fromName', currentName);
      return createPageUrl('StartFree') + '?' + params.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Result Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-4">
            <CheckCircle2 className="w-4 h-4" />
            Avaliação Concluída!
          </div>
          {hasSuperAdminBypass ? (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 text-amber-800 text-sm font-semibold mb-4">
            </div>
          ) : null}
          
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Seu Perfil Dominante
          </h1>
        </motion.div>

        {/* Dominant Factor Hero */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`bg-gradient-to-br ${dominantInfo.color} rounded-3xl p-8 text-white mb-10 shadow-2xl`}
        >
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="text-8xl">{dominantInfo.emoji}</div>
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
                <span className="text-6xl font-bold">{profile[dominant]}%</span>
                <span className="text-2xl font-medium opacity-80">{dominant}</span>
              </div>
              <h2 className="text-3xl font-bold mb-2">{dominantInfo.name}</h2>
              <p className="text-lg opacity-90">{dominantInfo.description}</p>
            </div>
          </div>
        </motion.div>

        {/* Chart Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-10">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100"
          >
            <h3 className="text-xl font-bold text-slate-900 mb-4 text-center">
              Seu Perfil DISC
            </h3>
            <DISCRadarChart 
              naturalProfile={profile}
              showAdapted={false}
              size={280}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-slate-100"
          >
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Pontos Fortes
            </h3>
            <div className="flex flex-wrap gap-2 mb-6">
              {dominantInfo.strengths.map((strength, i) => (
                <span 
                  key={i}
                  className="px-4 py-2 rounded-full bg-green-50 text-green-700 font-medium"
                >
                  ✓ {strength}
                </span>
              ))}
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              Áreas de Atenção
            </h3>
            <div className="flex flex-wrap gap-2">
              {dominantInfo.challenges.map((challenge, i) => (
                <span 
                  key={i}
                  className="px-4 py-2 rounded-full bg-amber-50 text-amber-700 font-medium"
                >
                  ⚠️ {challenge}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Factor Cards - Blurred/Locked */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="relative mb-10"
        >
          {!isUnlocked && (
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/90 to-transparent z-10 flex items-center justify-center rounded-3xl">
              <div className="text-center p-8">
                <Lock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">
                  Análise Detalhada Bloqueada
                </h3>
                <p className="text-slate-600 mb-6 max-w-sm mx-auto">
                  Desbloqueie o relatório completo com análise de todos os 4 fatores, 
                  comparativo Natural vs Adaptado e muito mais.
                </p>
                <Link to={pricingUrl}>
                  <Button
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 rounded-xl shadow-lg"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Desbloquear Relatório Completo
                  </Button>
                </Link>
                <p className="mt-3 text-sm text-slate-500">
                  Desbloqueio por {reportUnlockPriceLabel}
                </p>
              </div>
            </div>
          )}
          
          <div className={`grid grid-cols-2 gap-4 ${isUnlocked ? '' : 'blur-sm select-none'}`}>
            {['D', 'I', 'S', 'C'].map(factor => (
              <DISCFactorCard
                key={factor}
                factor={factor}
                naturalValue={profile[factor]}
                isExpanded={false}
              />
            ))}
          </div>
        </motion.div>

        {compatibilityResult ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.58 }}
            className="bg-white rounded-3xl p-6 shadow-lg border border-emerald-200 mb-10"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-xl font-bold text-slate-900">
                Compatibilidade com {compareFromName || 'perfil de referência'}
              </h3>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-700">
                {compatibilityResult.score}%
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600">{compatibilityResult.summary}</p>
            <ul className="mt-4 grid gap-2 text-sm text-slate-700">
              {compatibilityResult.highlights.map((item) => (
                <li key={item} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ) : comparisonError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 mb-10">
            {comparisonError}
          </div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.59 }}
          className="mb-10"
        >
          <ReportValueLadderCard
            currentTier={currentReportTier}
            title="Escada de valor dos relatorios"
            description="Comece no Standard Report, avance para o Premium Report e evolua para o Professional Report conforme o contexto de uso."
          />
        </motion.div>

        {/* Premium CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-600 rounded-3xl p-8 text-white text-center shadow-2xl"
        >
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-80" />
          <h2 className="text-3xl font-bold mb-4">
            {isUnlocked ? 'Relatório completo liberado!' : 'Quer conhecer seu perfil completo?'}
          </h2>
          <p className="text-lg opacity-90 mb-6 max-w-xl mx-auto">
            {isUnlocked
              ? 'Seu acesso PRO foi ativado para este resultado. Você já pode abrir o relatório completo.'
              : 'O relatório premium inclui análise de 20+ páginas com insights profundos sobre seu estilo de liderança, comunicação, motivadores e muito mais.'}
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            {isUnlocked ? (
              <Link to={continueReportUrl}>
                <Button
                  size="lg"
                  className="bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl shadow-lg"
                >
                  👉 Ver meu relatório completo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            ) : (
              <Link to={pricingUrl}>
                <Button
                  size="lg"
                  className="bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl shadow-lg"
                >
                  Desbloquear relatório completo
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            )}
          </div>
          {!isUnlocked ? (
            <p className="mt-4 text-sm text-indigo-100">
              Valor do desbloqueio completo: {reportUnlockPriceLabel}
            </p>
          ) : null}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8 rounded-3xl border border-indigo-200 bg-indigo-50 p-6"
        >
          <div className="flex items-center gap-2 text-indigo-700 mb-2">
            <UserPlus className="w-5 h-5" />
            <h3 className="text-lg font-bold">Descubra como você se comporta em relação a outras pessoas</h3>
          </div>
          <p className="text-sm text-indigo-900/90 mb-4">
            Convide alguém para fazer o teste e receba leitura automática de compatibilidade comportamental.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link to={buildCompareInviteUrl('friend')}>
              <Button variant="outline" className="w-full h-11 rounded-xl border-indigo-300 text-indigo-700 hover:bg-indigo-600 hover:text-white">
                Comparar com amigo
              </Button>
            </Link>
            <Link to={buildCompareInviteUrl('boss')}>
              <Button variant="outline" className="w-full h-11 rounded-xl border-indigo-300 text-indigo-700 hover:bg-indigo-600 hover:text-white">
                Comparar com chefe
              </Button>
            </Link>
            <Link to={buildCompareInviteUrl('partner')}>
              <Button variant="outline" className="w-full h-11 rounded-xl border-indigo-300 text-indigo-700 hover:bg-indigo-600 hover:text-white">
                Comparar com parceiro
              </Button>
            </Link>
            <Link to={buildCompareInviteUrl('coworker')}>
              <Button variant="outline" className="w-full h-11 rounded-xl border-indigo-300 text-indigo-700 hover:bg-indigo-600 hover:text-white">
                Comparar com colega de trabalho
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex justify-center gap-4 mt-8">
          <Link to={createPageUrl('StartFree')}>
            <Button variant="outline" className="rounded-xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refazer Teste
            </Button>
          </Link>
          <Link to={createPageUrl('Home')}>
            <Button variant="outline" className="rounded-xl">
              Voltar ao Início
            </Button>
          </Link>
        </div>
      </div>

    </div>
  );
}
