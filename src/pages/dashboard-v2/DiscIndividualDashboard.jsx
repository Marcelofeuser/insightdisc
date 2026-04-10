/**
 * DiscIndividualDashboard.jsx — Painel V3.0 para o plano Disc Individual
 *
 * Painel mínimo e focado: visualizar e exportar o relatório DISC individual.
 * Mostra claramente o que está disponível e o que pode ser desbloqueado.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  FileDown,
  FileText,
  Lock,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/AuthContext';
import { getApiBaseUrl } from '@/lib/apiClient';
import { DashboardErrorState, DashboardLoadingState } from '@/modules/dashboard/components/DashboardStates';
import { useDashboardData } from '@/modules/dashboard/useDashboardData';
import { startSelfAssessment } from '@/utils/assessmentFlow';

const LOCKED_FEATURES = [
  {
    label: 'Histórico',
    description: 'Acompanhe sua evolução comportamental ao longo do tempo.',
    plan: 'Personal',
    icon: TrendingUp,
  },
  {
    label: 'Biblioteca DISC',
    description: 'Acervo completo de conteúdo sobre perfis e comportamentos.',
    plan: 'Insider',
    icon: FileText,
  },
  {
    label: 'Comparação de Perfis',
    description: 'Compare o seu perfil com outros avaliados.',
    plan: 'Insider',
    icon: Sparkles,
  },
  {
    label: 'Coach com IA',
    description: 'Assistente contextualizado no seu relatório DISC.',
    plan: 'Professional',
    icon: Sparkles,
  },
  {
    label: 'AI Lab',
    description: 'Laboratório de prompts aplicado aos seus dados.',
    plan: 'Professional',
    icon: Sparkles,
  },
];

export default function DiscIndividualDashboard() {
  const navigate = useNavigate();
  const { access, user } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const data = useDashboardData({ access, user, scope: 'self' });

  const firstName =
    (user?.name || user?.full_name || user?.fullName || '').split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'você';

  const handleStart = async () => {
    if (isStarting) return;
    setErrorMessage('');
    setIsStarting(true);
    try {
      await startSelfAssessment({
        apiBaseUrl,
        navigate,
        access,
        source: 'dashboard-disc-individual',
      });
    } catch (error) {
      setErrorMessage(
        error?.payload?.message || error?.message || 'Não foi possível iniciar agora.',
      );
    } finally {
      setIsStarting(false);
    }
  };

  if (data.error)
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:px-6">
        <DashboardErrorState message={data.error?.message} />
      </div>
    );
  if (data.isLoading)
    return (
      <div className="w-full max-w-4xl mx-auto px-4 py-8 sm:px-6">
        <DashboardLoadingState />
      </div>
    );

  const hasReport = data.kpis.reportsGenerated > 0;

  return (
    <div
      className="w-full min-w-0 max-w-4xl mx-auto px-4 py-6 space-y-5 sm:px-6 sm:py-8"
      data-testid="dashboard-disc-individual"
    >
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
              Disc Individual
            </p>
            <Badge className="bg-slate-100 text-slate-600 border border-slate-200 rounded-full px-2 py-0 text-[10px]">
              DISC
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Olá, {firstName} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {hasReport
              ? 'Seu relatório DISC está pronto para visualização e exportação.'
              : 'Faça sua avaliação DISC para receber o relatório completo do seu perfil comportamental.'}
          </p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
          onClick={handleStart}
          disabled={isStarting}
        >
          {isStarting ? 'Iniciando...' : 'Fazer minha avaliação'}
        </Button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {/* Ações disponíveis */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/MyAssessments#reports">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group cursor-pointer">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex-shrink-0">
                <FileText className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">Meus Relatórios</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {data.kpis.reportsGenerated > 0
                    ? `${data.kpis.reportsGenerated} relatório${data.kpis.reportsGenerated > 1 ? 's' : ''} disponível${data.kpis.reportsGenerated > 1 ? 'is' : ''}`
                    : 'Nenhum relatório ainda — faça sua avaliação'}
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors flex-shrink-0" />
            </div>
          </div>
        </Link>

        <Link to="/MyAssessments">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group cursor-pointer">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex-shrink-0">
                <FileDown className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">Exportar PDF</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Baixe seu relatório em PDF para compartilhar ou arquivar
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors flex-shrink-0" />
            </div>
          </div>
        </Link>
      </div>

      {/* Recursos bloqueados — escada de valor */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Desbloqueie mais com um upgrade
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Escolha um plano e amplie sua jornada de autoconhecimento.
            </p>
          </div>
          <Link to="/Pricing">
            <Button variant="outline" size="sm" className="rounded-xl text-xs flex-shrink-0">
              Ver planos
            </Button>
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
