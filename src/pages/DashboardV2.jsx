import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  NotebookPen,
  Send,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getApiBaseUrl } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { PERMISSIONS, hasPermission, isSuperAdminAccess } from '@/modules/auth/access-control';
import { DashboardErrorState, DashboardLoadingState } from '@/modules/dashboard/components/DashboardStates';
import { useDashboardData } from '@/modules/dashboard/useDashboardData';
import { buildAssessmentReportPath } from '@/modules/reports';
import { buildDossierPath } from '@/modules/dossier/routes';
import { startSelfAssessment } from '@/utils/assessmentFlow';
import { createPageUrl } from '@/utils';

// ─── helpers ────────────────────────────────────────────────────────────────

const FACTOR_LABELS = { D: 'Dominância', I: 'Influência', S: 'Estabilidade', C: 'Conformidade' };
const FACTOR_COLORS = {
  D: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  I: { bg: 'bg-sky-50',    text: 'text-sky-700',    dot: 'bg-sky-500'    },
  S: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  C: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
};

function resolvePlanLabel(planCode = '') {
  const labels = {
    disc: 'DISC Individual', personal: 'Personal', professional: 'Profissional',
    business: 'Business', diamond: 'Diamond', enterprise: 'Enterprise', free: 'Gratuito',
  };
  return labels[String(planCode || '').trim().toLowerCase()] || planCode || 'Gratuito';
}

function resolveDisplayName(user = {}) {
  const full = user?.name || user?.full_name || user?.fullName || '';
  return full.split(' ')[0] || user?.email?.split('@')[0] || 'Usuário';
}

function formatDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('pt-BR');
}

// ─── sub-components ─────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, accent = 'indigo' }) {
  const accents = {
    indigo:  { icon: 'bg-indigo-50 text-indigo-600',  val: 'text-slate-900' },
    emerald: { icon: 'bg-emerald-50 text-emerald-600', val: 'text-slate-900' },
    amber:   { icon: 'bg-amber-50 text-amber-600',     val: 'text-slate-900' },
    violet:  { icon: 'bg-violet-50 text-violet-600',   val: 'text-slate-900' },
    sky:     { icon: 'bg-sky-50 text-sky-600',         val: 'text-slate-900' },
  };
  const a = accents[accent] || accents.indigo;
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${a.icon}`}>
          <Icon className="w-4 h-4" />
        </span>
        {sub && <span className="text-xs text-slate-400">{sub}</span>}
      </div>
      <div>
        <p className={`text-2xl font-semibold tracking-tight ${a.val}`}>{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function QuickActionBtn({ icon: Icon, label, onClick, variant = 'outline', disabled = false }) {
  const base = 'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all';
  const styles = {
    primary: `${base} bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600`,
    outline: `${base} bg-white hover:bg-slate-50 text-slate-700 border border-slate-200`,
    ghost:   `${base} bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-100`,
  };
  return (
    <button
      type="button"
      className={styles[variant] || styles.outline}
      onClick={onClick}
      disabled={disabled}
    >
      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 ${
        variant === 'primary' ? 'bg-white/20' : 'bg-slate-100'
      }`}>
        <Icon className="w-4 h-4" />
      </span>
      <span className="flex-1 text-left">{label}</span>
      <ArrowRight className="w-3.5 h-3.5 opacity-40 flex-shrink-0" />
    </button>
  );
}

function DiscTag({ factor }) {
  const c = FACTOR_COLORS[factor];
  if (!c) return <Badge variant="secondary">{factor || 'DISC'}</Badge>;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      {FACTOR_LABELS[factor] || factor}
    </span>
  );
}

function ActivityRow({ item, reportPath }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-all group">
      <div className="flex items-center gap-3 min-w-0">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex-shrink-0">
          <FileText className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 truncate">{item.candidateName || 'Participante'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-400">{formatDate(item.date)}</span>
            {item.dominantFactor && <DiscTag factor={item.dominantFactor} />}
          </div>
        </div>
      </div>
      {reportPath && (
        <Link
          to={reportPath}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          Ver →
        </Link>
      )}
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export default function DashboardV2() {
  const navigate = useNavigate();
  const { access, user } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const data = useDashboardData({ access, user });

  const canCreateAssessment  = hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE);
  const canViewCredits       = hasPermission(access, PERMISSIONS.CREDIT_VIEW) || hasPermission(access, PERMISSIONS.CREDIT_MANAGE);
  const canViewTeam          = hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_TENANT);
  const isSuperAdmin         = isSuperAdminAccess(access);
  const dossierPath          = buildDossierPath();

  const userName  = useMemo(() => resolveDisplayName(user), [user]);
  const planLabel = useMemo(
    () => resolvePlanLabel(access?.plan || user?.plan || 'free'),
    [access?.plan, user?.plan],
  );

  const credits = isSuperAdmin
    ? 'Ilimitado'
    : data.creditsBalance ?? 0;

  const recentCompleted = useMemo(
    () => (Array.isArray(data.reportsRecent) ? data.reportsRecent : []).slice(0, 6),
    [data.reportsRecent],
  );

  // KPI derivados
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const completedLast30 = data.completedLast30 ?? 0;
  const pendingCount = data.kpis?.pendingAssessments ?? 0;
  const conversionRate = data.kpis?.totalAssessments
    ? Math.round((data.kpis.completedAssessments / data.kpis.totalAssessments) * 100)
    : 0;

  const handleSelfAssessment = async () => {
    if (isStarting) return;
    setErrorMessage('');
    setIsStarting(true);
    try {
      await startSelfAssessment({ apiBaseUrl, navigate, access, source: 'dashboard-v2' });
    } catch (error) {
      setErrorMessage(error?.payload?.message || error?.message || 'Não foi possível iniciar agora.');
    } finally {
      setIsStarting(false);
    }
  };

  // ── loading / error ──
  if (data.error) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <DashboardErrorState message={data.error?.message} />
      </div>
    );
  }

  if (data.isLoading) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <DashboardLoadingState
          title="Carregando painel"
          description="Preparando suas métricas, créditos e atividade recente."
        />
      </div>
    );
  }

  // ── render ──
  return (
    <div
      className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6"
      data-testid="dashboard-v2"
    >

      {/* ── Hero ── */}
      <div className="bg-white rounded-2xl border border-slate-200/80 px-6 py-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-slate-400 mb-1">Painel</p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Olá, {userName} 👋
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Aqui está o resumo da sua conta InsightDISC.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && (
            <Badge className="bg-amber-100 text-amber-800 border border-amber-200 rounded-full px-3">
              Super Admin
            </Badge>
          )}
          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
            <Sparkles className="w-3.5 h-3.5" />
            {planLabel}
          </span>
          {canViewCredits && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 text-slate-600">
              <Wallet className="w-3.5 h-3.5" />
              {credits} créditos
            </span>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={CheckCircle2}
          label="Concluídas (30 dias)"
          value={completedLast30}
          accent="emerald"
        />
        <KpiCard
          icon={Clock3}
          label="Pendentes / em andamento"
          value={pendingCount}
          accent="amber"
        />
        {canViewCredits && (
          <KpiCard
            icon={CreditCard}
            label="Créditos disponíveis"
            value={credits}
            accent="violet"
          />
        )}
        <KpiCard
          icon={Zap}
          label="Taxa de conversão"
          value={`${conversionRate}%`}
          accent="sky"
        />
      </div>

      {/* ── Corpo principal: Ações + Atividade ── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Ações rápidas */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
            Ações rápidas
          </p>

          <QuickActionBtn
            icon={Sparkles}
            label={isStarting ? 'Iniciando...' : 'Fazer minha avaliação'}
            onClick={handleSelfAssessment}
            variant="primary"
            disabled={isStarting}
          />

          {canCreateAssessment && (
            <QuickActionBtn
              icon={Send}
              label="Enviar convite"
              onClick={() => navigate(createPageUrl('SendAssessment'))}
            />
          )}

          <QuickActionBtn
            icon={FileText}
            label="Minhas avaliações"
            onClick={() => navigate(createPageUrl('MyAssessments'))}
          />

          {canViewTeam && (
            <QuickActionBtn
              icon={Users}
              label="Comparar perfis"
              onClick={() => navigate(createPageUrl('CompareProfiles'))}
            />
          )}

          {canViewTeam && (
            <QuickActionBtn
              icon={Users}
              label="Mapa de equipes"
              onClick={() => navigate(createPageUrl('TeamMap'))}
            />
          )}

          <QuickActionBtn
            icon={NotebookPen}
            label="Dossiê comportamental"
            onClick={() => navigate(dossierPath)}
            variant="ghost"
          />

          {errorMessage && (
            <p className="mt-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Atividade recente */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Atividade recente
            </p>
            <Link
              to={createPageUrl('MyAssessments')}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
            >
              Ver todas →
            </Link>
          </div>

          {recentCompleted.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-slate-100 mb-3">
                <Users className="w-5 h-5 text-slate-400" />
              </span>
              <p className="text-sm font-medium text-slate-600">Sem avaliações concluídas</p>
              <p className="text-xs text-slate-400 mt-1">
                Quando alguém finalizar, aparecerá aqui.
              </p>
              {canCreateAssessment && (
                <Button
                  size="sm"
                  className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                  onClick={() => navigate(createPageUrl('SendAssessment'))}
                >
                  Enviar convite
                </Button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {recentCompleted.map((item) => (
                <ActivityRow
                  key={item.id || item.candidateName}
                  item={item}
                  reportPath={
                    item.id
                      ? buildAssessmentReportPath(item.assessmentId || item.id)
                      : null
                  }
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Dossiê reminder (só para quem pode criar avaliações) ── */}
      {canCreateAssessment && (
        <div className="bg-white rounded-2xl border border-slate-200/80 px-5 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex-shrink-0">
              <CalendarClock className="w-5 h-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-slate-900">
                {data.dossier?.scheduledThisMonth ?? 0} reavaliações agendadas este mês
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {data.dossier?.activeDossiers ?? 0} dossiês ativos — acompanhe pelo módulo.
              </p>
            </div>
          </div>
          <Link to={dossierPath}>
            <Button variant="outline" size="sm" className="rounded-xl">
              Abrir Dossiê
            </Button>
          </Link>
        </div>
      )}

    </div>
  );
}
