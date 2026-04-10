/**
 * InsiderDashboard.jsx — Painel V3.0 para o plano Insider
 *
 * Ponte entre Personal e Professional. Foco em entendimento guiado,
 * leitura complementar e início da jornada de aprofundamento.
 * Não herda recursos do Professional.
 */

import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Clock,
  FileText,
  Lock,
  Radar,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { getApiBaseUrl } from '@/lib/apiClient';
import { DashboardErrorState, DashboardLoadingState } from '@/modules/dashboard/components/DashboardStates';
import { dashboardFactorLabels, useDashboardData } from '@/modules/dashboard/useDashboardData';
import { buildDiscInterpretation } from '@/modules/discEngine';
import { startSelfAssessment } from '@/utils/assessmentFlow';

const LOCKED_FEATURES = [
  { label: 'Dossiê', description: 'Histórico comportamental completo por avaliado.', plan: 'Professional', icon: FileText },
  { label: 'Arquétipos', description: 'Leitura de arquétipos com resumo e PDF.', plan: 'Professional', icon: Sparkles },
  { label: 'Coach com IA', description: 'Assistente contextualizado no seu relatório.', plan: 'Professional', icon: Sparkles },
  { label: 'AI Lab', description: 'Laboratório de prompts sobre seus dados DISC.', plan: 'Professional', icon: Sparkles },
  { label: 'Team Map', description: 'Distribuição comportamental de equipes.', plan: 'Corporation', icon: TrendingUp },
];

function QuickNav({ icon: Icon, label, to }) {
  return (
    <Link to={to}>
      <span className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors group">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors flex-shrink-0">
          <Icon className="w-3.5 h-3.5" />
        </span>
        {label}
        <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-40 transition-opacity ml-auto" />
      </span>
    </Link>
  );
}

export default function InsiderDashboard() {
  const navigate = useNavigate();
  const { access, user } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const data = useDashboardData({ access, user, scope: 'self' });
  const personalProfile = data.latestIndividualSummary || data.distribution || {};
  const interpretation = useMemo(
    () => buildDiscInterpretation(personalProfile, { context: 'personal_dashboard', detailLevel: 'medium' }),
    [personalProfile],
  );
  const dominantFactor = interpretation?.primaryFactor || data.predominantFactor || 'D';

  const handleStart = async () => {
    if (isStarting) return;
    setErrorMessage('');
    setIsStarting(true);
    try {
      await startSelfAssessment({ apiBaseUrl, navigate, access, source: 'dashboard-insider' });
    } catch (error) {
      setErrorMessage(error?.payload?.message || error?.message || 'Não foi possível iniciar agora.');
    } finally {
      setIsStarting(false);
    }
  };

  if (data.error)
    return <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:px-6"><DashboardErrorState message={data.error?.message} /></div>;
  if (data.isLoading)
    return <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:px-6"><DashboardLoadingState /></div>;

  const firstName =
    (user?.name || user?.full_name || user?.fullName || '').split(' ')[0] ||
    user?.email?.split('@')[0] || 'você';

  return (
    <div
      className="w-full min-w-0 max-w-4xl mx-auto px-4 py-6 space-y-5 sm:px-6 sm:py-8"
      data-testid="dashboard-insider"
    >
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">Insider</p>
            <Badge className="bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0 text-[10px]">
              INSIDER
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Olá, {firstName} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Explore o seu perfil em profundidade, compare perspectivas e amplie seu autoconhecimento.
          </p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
          onClick={handleStart}
          disabled={isStarting}
        >
          {isStarting ? 'Iniciando...' : 'Nova avaliação'}
        </Button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {/* Perfil resumido */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Meu perfil atual</p>
          <div className="space-y-2">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Perfil DISC</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {interpretation?.profileCode || dominantFactor} — {interpretation?.styleLabel || dashboardFactorLabels[dominantFactor] || 'DISC'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Avaliações</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {data.kpis.reportsGenerated} relatório{data.kpis.reportsGenerated !== 1 ? 's' : ''} disponível{data.kpis.reportsGenerated !== 1 ? 'is' : ''}
              </p>
            </div>
            {interpretation?.strengths?.[0] && (
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-[11px] uppercase tracking-wide text-slate-400">Ponto forte</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{interpretation.strengths[0]}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Explorar</p>
          <QuickNav icon={FileText} label="Relatórios" to="/MyAssessments#reports" />
          <QuickNav icon={Radar} label="Comparação de perfis" to="/compare-profiles" />
          <QuickNav icon={BookOpen} label="Biblioteca DISC" to="/disc-library" />
          <QuickNav icon={Clock} label="Histórico" to="/painel/historico" />
        </div>
      </div>

      {/* Recursos bloqueados — escada de valor */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Recursos disponíveis acima do Insider</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Aprofunde sua prática com IA, Dossiê e ferramentas organizacionais.
            </p>
          </div>
          <Link to="/Pricing">
            <Button variant="outline" size="sm" className="rounded-xl text-xs flex-shrink-0">Ver planos</Button>
          </Link>
        </div>
        <div className="space-y-2">
          {LOCKED_FEATURES.map((feature) => (
            <div
              key={feature.label}
              className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-200/60 text-slate-400 flex-shrink-0">
                <feature.icon className="w-4 h-4" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700">{feature.label}</p>
                <p className="text-[11px] text-slate-500 truncate">{feature.description}</p>
              </div>
              <Badge className="bg-slate-200 text-slate-500 border-0 rounded-full px-2 py-0 text-[10px] flex-shrink-0 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                {feature.plan}+
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
