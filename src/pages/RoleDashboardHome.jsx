/**
 * RoleDashboardHome.jsx
 *
 * V3.0: Quando V3_FLAGS.PLAN_DIFFERENTIATION está ativo, roteia pelo plano real
 * do usuário em vez do experience role. Nunca mais há fallback indevido para
 * o painel Professional quando o plano for corporation ou diamond_consulting.
 *
 * V2 legado mantido intacto (panelMode switcher para super admins).
 */

import React from 'react';
import BusinessDashboardV2 from '@/pages/dashboard-v2/BusinessDashboardV2';
import ProfessionalDashboardV2 from '@/pages/dashboard-v2/ProfessionalDashboardV2';
import UserDashboardV2 from '@/pages/dashboard-v2/UserDashboardV2';
import DiscIndividualDashboard from '@/pages/dashboard-v2/DiscIndividualDashboard';
import InsiderDashboard from '@/pages/dashboard-v2/InsiderDashboard';
import CorporationDashboard from '@/pages/dashboard-v2/CorporationDashboard';
import DiamondDashboard from '@/pages/dashboard-v2/DiamondDashboard';
import PanelModeSwitcher from '@/components/layout/PanelModeSwitcher';
import { useAuth } from '@/lib/AuthContext';
import {
  PANEL_MODE,
  PANEL_MODE_META,
  PANEL_MODE_ORDER,
  normalizePanelMode,
} from '@/modules/navigation/panelMode';
import { usePanelMode } from '@/modules/navigation/panelModeContext';
import { OnboardingTour } from '@/modules/onboarding';
import { isSuperAdminAccess } from '@/modules/auth/access-control';
import { V3_FLAGS, V3_PLAN_KEYS, v3ResolvePlanFromAccess } from '@/modules/billing/v3Config';

// ---------------------------------------------------------------------------
// V3.0 — Roteamento por plano
// ---------------------------------------------------------------------------

function renderDashboardByPlan(plan) {
  switch (plan) {
    case V3_PLAN_KEYS.DISC_INDIVIDUAL:
      return <DiscIndividualDashboard />;
    case V3_PLAN_KEYS.PERSONAL:
      return <UserDashboardV2 />;
    case V3_PLAN_KEYS.INSIDER:
      return <InsiderDashboard />;
    case V3_PLAN_KEYS.PROFESSIONAL:
      return <ProfessionalDashboardV2 />;
    case V3_PLAN_KEYS.BUSINESS:
      return <BusinessDashboardV2 />;
    case V3_PLAN_KEYS.CORPORATION:
      return <CorporationDashboard />;
    case V3_PLAN_KEYS.DIAMOND_CONSULTING:
      return <DiamondDashboard />;
    default:
      // Fallback seguro: plano desconhecido → painel personal, nunca professional
      return <UserDashboardV2 />;
  }
}

// ---------------------------------------------------------------------------
// V2 legado — Roteamento por panelMode (mantido para super admins)
// ---------------------------------------------------------------------------

function renderDashboardByMode(mode) {
  if (mode === PANEL_MODE.BUSINESS) return <BusinessDashboardV2 />;
  if (mode === PANEL_MODE.PROFESSIONAL) return <ProfessionalDashboardV2 />;
  return <UserDashboardV2 />;
}

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

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function RoleDashboardHome() {
  const { access, isAuthenticated } = useAuth();
  const { panelMode, autoPanelMode, setPanelMode } = usePanelMode();
  const canSwitchModes = isSuperAdminAccess(access);

  // V3.0 — Quando a flag está ativa, super admins também veem o painel do seu plano real,
  // mas ainda podem usar o switcher de modo para testar outros painéis.
  if (V3_FLAGS.PLAN_DIFFERENTIATION) {
    const plan = v3ResolvePlanFromAccess(access);

    // Super admins em V3 têm switcher especial por plano (não por modo legado)
    // Mas para simplificar o teste inicial, usamos o plano real diretamente.
    return (
      <div className="w-full min-w-0 space-y-8 pb-8">
        <section className="w-full min-w-0 max-w-7xl mx-auto px-4 sm:px-6">
          <OnboardingTour />
        </section>
        {renderDashboardByPlan(plan)}
      </div>
    );
  }

  // V2 legado — mantido intacto
  const activeMode = normalizePanelMode(
    panelMode,
    autoPanelMode || PANEL_MODE.BUSINESS,
  );

  return (
    <div className="w-full min-w-0 space-y-8 pb-8">
      {isAuthenticated && canSwitchModes ? (
        <section className="w-full min-w-0 max-w-7xl mx-auto px-4 pt-6 sm:px-6 sm:pt-8">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white via-white to-slate-50/70 p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Painel V2 InsightDISC
              </p>
              <PanelModeSwitcher value={activeMode} onChange={setPanelMode} />
            </div>
            <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
              Escolha a experiência do seu painel
            </h2>
            <p className="mt-2.5 max-w-4xl text-sm leading-relaxed text-slate-600">
              Alterne entre Business, Professional e Personal para ajustar sua visão de operação,
              análise e execução.
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
