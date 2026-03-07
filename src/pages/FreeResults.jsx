import React, { useState, useEffect } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Lock, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import DISCRadarChart from '@/components/disc/DISCRadarChart';
import DISCFactorCard from '@/components/disc/DISCFactorCard';
import { base44 } from '@/api/base44Client';

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
    description: 'Você é comunicativo, entusiasta e otimista. Adora interagir com pessoas e criar conexões.',
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

export default function FreeResults() {
  const [searchParams] = useSearchParams();
  const [assessment, setAssessment] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAssessment();
  }, []);

  const loadAssessment = async () => {
    const assessmentId = searchParams.get('id');
    let loaded = false;
    
    if (assessmentId) {
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
      const localResults = localStorage.getItem('freeAssessmentResults');
      if (localResults) {
        try {
          setAssessment({ results: JSON.parse(localResults) });
        } catch {
          // malformed JSON in localStorage — ignore
        }
      }
    }
    
    setIsLoading(false);
  };

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
    searchParams.get('id') || searchParams.get('token') || searchParams.get('email') || searchParams.get('name')
  );

  if (!assessment?.results) {
    if (hasAssessmentContext) {
      return <Navigate to="/checkout?product=report-unlock" replace />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Resultado não encontrado</h1>
          <Link to={createPageUrl('StartFree')}>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Fazer Teste Novamente
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { results } = assessment;
  const dominant = results.dominant_factor;
  const dominantInfo = FACTOR_INFO[dominant];
  const profile = results.natural_profile;
  const isUnlocked = Boolean(assessment?.report_unlocked);
  const assessmentToken = assessment?.access_token || '';
  const pricingUrl = `/checkout?product=report-unlock&assessmentId=${encodeURIComponent(assessment?.id || '')}${assessmentToken ? `&token=${encodeURIComponent(assessmentToken)}` : ''}&flow=candidate`;
  const upgradeUrl = `/c/upgrade?assessmentId=${encodeURIComponent(assessment?.id || '')}${assessmentToken ? `&token=${encodeURIComponent(assessmentToken)}` : ''}`;

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
              <Link to={upgradeUrl}>
                <Button
                  size="lg"
                  className="bg-white text-indigo-600 hover:bg-indigo-50 rounded-xl shadow-lg"
                >
                  Continuar para Relatório Completo
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
