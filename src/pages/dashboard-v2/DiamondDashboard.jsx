/**
 * DiamondDashboard.jsx — Painel V3.0 para o plano Diamond Consulting
 *
 * Herda tudo do Corporation + camada consultiva premium:
 * Consultório & Ferramentas e Estratégia Executiva desbloqueados.
 * Nenhuma aba estratégica fica bloqueada neste plano.
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileBarChart2,
  Network,
  Palette,
  Sparkles,
  Stethoscope,
  TrendingUp,
  UserCog,
  Users,
  Users2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';
import { getApiBaseUrl } from '@/lib/apiClient';
import { PERMISSIONS, hasPermission, isSuperAdminAccess } from '@/modules/auth/access-control';
import {
  BehaviorInsightsPanel,
  DiscDistributionChart,
  DiscRadarChart,
  DiscTrendsChart,
  DominantProfilesPanel,
  TeamDiscMap,
} from '@/modules/analytics/components';
import { DashboardErrorState, DashboardLoadingState } from '@/modules/dashboard/components/DashboardStates';
import { dashboardFactorLabels, useDashboardData } from '@/modules/dashboard/useDashboardData';
import { buildDossierPath } from '@/modules/dossier/routes';
import { startSelfAssessment } from '@/utils/assessmentFlow';

function KpiCard({ icon: Icon, label, value, accent = 'indigo' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    rose: 'bg-rose-50 text-rose-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-4 flex items-center gap-4">
      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 ${colors[accent] || colors.indigo}`}>
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xl font-semibold text-slate-900 leading-tight">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

function QuickLink({ icon: Icon, label, to }) {
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

export default function DiamondDashboard() {
  const navigate = useNavigate();
  const { access, user } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const dossierPath = buildDossierPath();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const data = useDashboardData({ access, user });
  const canCreateAssessment = hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE);
  const isSuperAdmin = isSuperAdminAccess(access);

  const firstName =
    (user?.name || user?.full_name || user?.fullName || '').split(' ')[0] ||
    user?.email?.split('@')[0] || 'Consultor';

  const predominantLabel =
    data.predominantFactor && dashboardFactorLabels[data.predominantFactor]
      ? `${data.predominantFactor} — ${dashboardFactorLabels[data.predominantFactor]}`
      : '—';

  const credits = isSuperAdmin ? 'Ilimitado' : (data.creditsBalance ?? 0);

  const handleStart = async () => {
    if (isStarting) return;
    setErrorMessage('');
    setIsStarting(true);
    try {
      await startSelfAssessment({ apiBaseUrl, navigate, access, source: 'dashboard-diamond' });
    } catch (error) {
      setErrorMessage(error?.payload?.message || error?.message || 'Não foi possível iniciar agora.');
    } finally {
      setIsStarting(false);
    }
  };

  if (data.error)
    return <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6"><DashboardErrorState message={data.error?.message} /></div>;
  if (data.isLoading)
    return <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:px-6"><DashboardLoadingState /></div>;

  return (
    <div
      className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8"
      data-testid="dashboard-diamond"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-50 to-white rounded-2xl border border-amber-200/60 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <p className="text-xs font-medium uppercase tracking-widest text-amber-600">Diamond Consulting</p>
            <Badge className="bg-amber-100 text-amber-800 border border-amber-300 rounded-full px-2 py-0 text-[10px]">
              DIAMOND
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Olá, {firstName} 👋</h1>
          <p className="text-sm text-slate-500 mt-1">
            Plataforma consultiva premium — prática profissional, estratégia executiva e inteligência organizacional.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && <Badge className="bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-3">Super Admin</Badge>}
          <Badge variant="outline" className="rounded-full px-3 text-xs">Créditos: {credits}</Badge>
          <Button className="bg-amber-600 hover:bg-amber-700 rounded-xl" onClick={handleStart} disabled={isStarting}>
            {isStarting ? 'Iniciando...' : 'Fazer minha avaliação'}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>
      )}

      {/* Acesso rápido — módulos premium Diamond */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/painel/consultorio">
          <div className="bg-white rounded-2xl border border-amber-200/60 p-5 hover:border-amber-300 hover:bg-amber-50/30 transition-all group cursor-pointer">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex-shrink-0">
                <Stethoscope className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">Consultório & Ferramentas</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pacientes, prontuário comportamental, devolutiva e plano de acompanhamento
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors flex-shrink-0" />
            </div>
          </div>
        </Link>

        <Link to="/painel/estrategia-executiva">
          <div className="bg-white rounded-2xl border border-amber-200/60 p-5 hover:border-amber-300 hover:bg-amber-50/30 transition-all group cursor-pointer">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">Estratégia Executiva</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Visão macro, leitura estratégica, cultura, liderança e recomendações executivas
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-500 transition-colors flex-shrink-0" />
            </div>
          </div>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={ClipboardList} label="Total avaliações"       value={data.kpis.totalAssessments}      accent="indigo"  />
        <KpiCard icon={Users}         label="Colaboradores"           value={data.kpis.collaboratorsAssessed} accent="emerald" />
        <KpiCard icon={CheckCircle2}  label="Concluídas (30d)"        value={data.completedLast30}            accent="sky"     />
        <KpiCard icon={FileBarChart2} label="Relatórios"              value={data.kpis.reportsGenerated}      accent="violet"  />
        <KpiCard icon={Sparkles}      label="Alertas"                 value={data.insights.length}            accent="rose"    />
        <KpiCard icon={CreditCard}    label="Créditos"                value={credits}                         accent="amber"   />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DiscDistributionChart
          title="Distribuição DISC"
          subtitle="Percentual médio dos fatores D, I, S e C na base analisada."
          distribution={data.distribution}
          predominantFactor={data.predominantFactor}
        />
        <DiscRadarChart
          title="Radar comportamental coletivo"
          subtitle="Intensidade média dos fatores DISC para leitura organizacional rápida."
          profile={data.distribution}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TeamDiscMap
          title="Mapa de perfis da equipe"
          subtitle="Composição comportamental dos participantes recentes."
          members={data.teamProfiles}
        />
        <BehaviorInsightsPanel
          title="Insights comportamentais"
          subtitle="Sinais automáticos para liderança, cultura e comunicação."
          items={data.insights}
          distribution={data.distribution}
          sampleSize={data.kpis.profilesAnalyzed}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DiscTrendsChart
          title="Tendências comportamentais"
          subtitle="Evolução mensal dos fatores DISC nas avaliações concluídas."
          trends={data.trends}
        />
        <DominantProfilesPanel
          title="Perfis predominantes"
          subtitle="Combinações DISC mais frequentes na base."
          profiles={data.profileFrequencies}
        />
      </div>

      {/* Navegação completa Diamond */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Resumo executivo</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Predominância</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{predominantLabel}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Dossiês ativos</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{data.dossier.activeDossiers}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Reavaliações</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{data.dossier.scheduledThisMonth}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Equipes</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{data.teamsMonitored}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Navegar para</p>
          <QuickLink icon={Stethoscope}  label="Consultório"          to="/painel/consultorio"          />
          <QuickLink icon={TrendingUp}   label="Estratégia Executiva" to="/painel/estrategia-executiva"  />
          <QuickLink icon={Network}      label="Team Map"             to="/team-map"                    />
          <QuickLink icon={Users2}       label="RH & Gestão"          to="/painel/rh-gestao"            />
          <QuickLink icon={UserCog}      label="Usuários"             to="/painel/usuarios"             />
          <QuickLink icon={BarChart3}    label="Analytics"            to="/app/analytics"               />
          <QuickLink icon={Palette}      label="White Label"          to="/app/branding"                />
          <QuickLink icon={BookOpen}     label="Dossiê"               to={dossierPath}                  />
        </div>
      </div>

      {canCreateAssessment && (
        <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex-shrink-0">
              <CalendarClock className="w-5 h-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900">
                {data.dossier.scheduledThisMonth} reavaliações agendadas este mês
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {data.dossier.activeDossiers} dossiês ativos — acompanhe pelo módulo.
              </p>
            </div>
          </div>
          <Link to={dossierPath}>
            <Button variant="outline" size="sm" className="rounded-xl">Abrir Dossiê</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
