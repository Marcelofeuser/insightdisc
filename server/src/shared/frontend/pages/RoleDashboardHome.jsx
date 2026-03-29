import React from 'react';
import BusinessDashboardV2 from '@/pages/dashboard-v2/BusinessDashboardV2';
import ProfessionalDashboardV2 from '@/pages/dashboard-v2/ProfessionalDashboardV2';
import UserDashboardV2 from '@/pages/dashboard-v2/UserDashboardV2';
import { useAuth } from '@/lib/AuthContext';
import { isSuperAdminAccess } from '@/modules/auth/access-control';
import {
  PANEL_MODE,
  PANEL_MODE_META,
  PANEL_MODE_ORDER,
  normalizePanelMode,
} from '@/modules/navigation/panelMode';
import { usePanelMode } from '@/modules/navigation/panelModeContext';
import { OnboardingTour } from '@/modules/onboarding';

function ModeCard({ mode, activeMode, onSelect }) {
  const isActive = activeMode === mode;
  const content = PANEL_MODE_META[mode] || PANEL_MODE_META[PANEL_MODE.BUSINESS];

  return (
    <article
      className={`rounded-2xl border p-5 shadow-sm transition-all ${
        isActive
          ? 'border-indigo-300 bg-indigo-50/70 shadow-indigo-100'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      <p className="inline-flex rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
        {content.label}
      </p>
      <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">{content.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{content.description}</p>
      <button
        type="button"
        onClick={() => onSelect?.(mode)}
        className={`mt-4 inline-flex rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive
            ? 'bg-indigo-600 text-white'
            : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
        }`}
      >
        {isActive ? 'Modo ativo' : 'Entrar neste modo'}
      </button>
    </article>
  );
}

function renderDashboardByMode(mode) {
  if (mode === PANEL_MODE.BUSINESS) {
    return <BusinessDashboardV2 />;
  }

  if (mode === PANEL_MODE.PROFESSIONAL) {
    return <ProfessionalDashboardV2 />;
  }

  return <UserDashboardV2 />;
}

export default function RoleDashboardHome() {
  const { access } = useAuth();
  const { panelMode, autoPanelMode, setPanelMode } = usePanelMode();
  const isSuperAdmin = isSuperAdminAccess(access);
  const activeMode = normalizePanelMode(
    isSuperAdmin ? panelMode : autoPanelMode,
    autoPanelMode || PANEL_MODE.BUSINESS,
  );

  return (
    <div className="w-full min-w-0 space-y-8 pb-8">
      {isSuperAdmin ? (
        <section className="w-full min-w-0 max-w-7xl mx-auto px-4 pt-6 sm:px-6 sm:pt-8">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white via-white to-slate-50/70 p-6 shadow-sm">
            <p className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Painel V2 InsightDISC
            </p>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">Escolha a experiência do seu painel</h2>
            <p className="mt-2.5 max-w-4xl text-sm leading-relaxed text-slate-600">
              Como super admin, você pode alternar entre os modos Business, Professional e Personal para auditoria de UX.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {PANEL_MODE_ORDER.map((mode) => (
                <ModeCard key={mode} mode={mode} activeMode={activeMode} onSelect={setPanelMode} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6">
        <OnboardingTour />
      </section>

      {renderDashboardByMode(activeMode)}
    </div>
  );
}
