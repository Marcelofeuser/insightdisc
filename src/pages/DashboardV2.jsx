import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, CreditCard, FileText, Sparkles, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { PERMISSIONS, hasPermission } from '@/modules/auth/access-control';
import { DashboardErrorState, DashboardLoadingState } from '@/modules/dashboard/components/DashboardStates';
import { useDashboardData } from '@/modules/dashboard/useDashboardData';
import { startSelfAssessment } from '@/utils/assessmentFlow';

function resolvePlanLabel(planCode = '') {
  const labels = {
    disc: 'DISC Individual',
    personal: 'Personal',
    professional: 'Profissional',
    business: 'Business',
    diamond: 'Diamond',
    enterprise: 'Enterprise',
    free: 'Sem plano',
  };
  const key = String(planCode || '').trim().toLowerCase();
  return labels[key] || key || 'Sem plano';
}

function resolveDisplayName(user = {}) {
  return (
    user?.name ||
    user?.full_name ||
    user?.fullName ||
    user?.email ||
    'Usuário'
  );
}

function formatDateLabel(value) {
  if (!value) return 'Sem data';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sem data';
  return parsed.toLocaleDateString('pt-BR');
}

export default function DashboardV2() {
  const navigate = useNavigate();
  const { access, user } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const data = useDashboardData({ access, user });
  const canCreateAssessment = hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE);

  const userName = useMemo(() => resolveDisplayName(user), [user]);
  const planLabel = useMemo(
    () => resolvePlanLabel(data.billing?.planCode || access?.plan || user?.plan || 'free'),
    [data.billing?.planCode, access?.plan, user?.plan],
  );

  const monthlyCredits = data.billing?.isUnlimited
    ? 'Ilimitado'
    : String(data.billing?.monthlyCredits?.remaining || 0);
  const purchasedCredits = data.billing?.isUnlimited
    ? 'Ilimitado'
    : String(data.billing?.purchasedCredits?.balance || 0);
  const nextRenewal = data.billing?.nextRenewalAt
    ? new Date(data.billing.nextRenewalAt).toLocaleDateString('pt-BR')
    : 'Sem renovação';

  const historyItems = (Array.isArray(data.reportsRecent) ? data.reportsRecent : []).slice(0, 8);

  const handleGenerateReport = async () => {
    if (isStarting) return;
    setErrorMessage('');

    if (canCreateAssessment) {
      navigate('/SendAssessment');
      return;
    }

    setIsStarting(true);
    try {
      await startSelfAssessment({
        apiBaseUrl,
        navigate,
        access,
        source: 'dashboard-v2',
      });
    } catch (error) {
      setErrorMessage(error?.payload?.message || error?.message || 'Não foi possível iniciar agora.');
    } finally {
      setIsStarting(false);
    }
  };

  if (data.error) {
    return (
      <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <DashboardErrorState message={data.error?.message} />
      </div>
    );
  }

  if (data.isLoading) {
    return (
      <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-8 sm:px-6">
        <DashboardLoadingState
          title="Carregando Dashboard V2"
          description="Estamos preparando seus dados de plano, créditos e histórico."
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8" data-testid="dashboard-v2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Dashboard V2</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">Olá, {userName}</h1>
            <p className="mt-1 text-sm text-slate-600">
              Visão rápida para acompanhar plano, créditos e relatórios.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
              <Sparkles className="h-4 w-4" />
              Plano: {planLabel}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm text-indigo-700">
              <Wallet className="h-4 w-4" />
              Créditos: {data.billing?.isUnlimited ? 'Ilimitado' : data.creditsBalance}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Ação principal</h2>
            <p className="mt-1 text-sm text-slate-600">
              Inicie agora um novo fluxo de avaliação e geração de relatório.
            </p>
          </div>
          <Button
            className="h-12 px-8 text-base bg-indigo-600 hover:bg-indigo-700"
            onClick={handleGenerateReport}
            disabled={isStarting}
          >
            {isStarting ? 'Iniciando...' : 'Gerar novo relatório'}
          </Button>
        </div>

        {errorMessage ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-500">
            <CreditCard className="h-4 w-4" />
            Créditos do mês
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{monthlyCredits}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-500">
            <Wallet className="h-4 w-4" />
            Créditos comprados
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{purchasedCredits}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-slate-500">
            <CalendarClock className="h-4 w-4" />
            Próxima renovação
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{nextRenewal}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Histórico de relatórios</h2>
            <p className="mt-1 text-sm text-slate-600">Seus relatórios mais recentes em ordem cronológica.</p>
          </div>
          <Link to="/MyAssessments" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
            Ver todos
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {historyItems.length ? (
            historyItems.map((item, index) => (
              <article
                key={item.id || `${item.candidateName || 'report'}-${index}`}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-900">
                    <FileText className="h-4 w-4 text-slate-500" />
                    <p className="font-medium">{item.candidateName || 'Participante'}</p>
                  </div>
                  <p className="text-xs text-slate-500">{formatDateLabel(item.date)}</p>
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  Perfil dominante: <span className="font-semibold text-slate-800">{item.dominantFactor || 'DISC'}</span>
                </p>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
              Ainda não há relatórios no histórico.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
