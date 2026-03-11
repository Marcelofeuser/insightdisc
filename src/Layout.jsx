import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import AppShell from '@/components/shell/AppShell';
import MainNavigation from '@/components/layout/MainNavigation';
import PanelModeSwitcher from '@/components/layout/PanelModeSwitcher';
import { useAuth } from '@/lib/AuthContext';
import {
  canAccessPremiumSaas,
  PERMISSIONS,
  hasPermission,
} from '@/modules/auth/access-control';
import { buildRoleNavigation, getDashboardHeaderByRole } from '@/modules/navigation/roleNavigationConfig';
import {
  PANEL_MODE_META,
  persistPanelMode,
  resolvePanelMode,
} from '@/modules/navigation/panelMode';
import { buildPanelModeContext, PanelModeProvider } from '@/modules/navigation/panelModeContext';

const PUBLIC_PAGES = [
  'Home',
  'Avaliacoes',
  'FreeAssessment',
  'FreeResults',
  'CandidateOnboarding',
  'CheckoutSuccess',
  'ForgotPassword',
  'Login',
  'Pricing',
  'PublicReport',
  'GiftLanding',
  'Signup',
  'StartFree',
  'DossieComportamentalLanding',
  'SuperAdminLogin',
  'Privacy',
  'Terms',
  'Lgpd',
];

const PAGE_TITLES = {
  Dashboard: { title: 'Dashboard', subtitle: 'Visão geral da sua conta e atividades recentes' },
  MyAssessments: { title: 'Minhas Avaliações', subtitle: 'Acompanhe status, resultados e relatórios' },
  Credits: { title: 'Créditos', subtitle: 'Saldo atual e histórico de consumo' },
  BrandingSettings: { title: 'Marca', subtitle: 'Configuração white-label do workspace' },
  AdminDashboard: { title: 'Admin Console', subtitle: 'Gestão global da plataforma' },
  TeamMapping: { title: 'Mapeamento de Equipes', subtitle: 'Dinâmica e distribuição comportamental' },
  CompareProfiles: { title: 'Comparar Perfis', subtitle: 'Comparação DISC entre avaliações selecionadas' },
  TeamMap: { title: 'Mapa de Equipes', subtitle: 'Distribuição coletiva dos fatores comportamentais' },
  Checkout: { title: 'Checkout', subtitle: 'Compra de créditos e gerenciamento de pacotes' },
  JobMatching: { title: 'Job Matching', subtitle: 'Compatibilidade entre perfis e vagas' },
  LeadsDashboard: { title: 'Leads', subtitle: 'Gestão comercial e captação do chatbot' },
  SendAssessment: { title: 'Enviar Avaliação', subtitle: 'Convites e disparos de testes DISC' },
  Dossier: { title: 'Dossiê Comportamental', subtitle: 'Histórico comportamental completo dos avaliados' },
};

export default function Layout({ children, currentPageName }) {
  const { user, isAuthenticated, access, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const panelModeStorageScope = useMemo(
    () => (user?.id ? `user:${user.id}` : 'anonymous'),
    [user?.id]
  );
  const [panelMode, setPanelMode] = useState(() =>
    resolvePanelMode(access, { scopeKey: panelModeStorageScope })
  );

  const goHomeHash = (hash) => {
    const homeUrl = createPageUrl('Home');

    if (location.pathname === homeUrl) {
      window.location.hash = hash;
      const id = hash.replace('#', '');
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
      return;
    }

    navigate(`${homeUrl}${hash}`);
  };

  const handleLogout = () => {
    logout(true);
  };

  const handlePanelModeChange = useCallback(
    (nextMode) => {
      const nextResolved = resolvePanelMode(access, {
        preferredMode: nextMode,
        scopeKey: panelModeStorageScope,
      });
      setPanelMode(nextResolved);
      persistPanelMode(nextResolved, panelModeStorageScope);
    },
    [access, panelModeStorageScope]
  );

  useEffect(() => {
    const nextResolved = resolvePanelMode(access, {
      preferredMode: panelMode,
      scopeKey: panelModeStorageScope,
    });
    if (panelMode !== nextResolved) {
      setPanelMode(nextResolved);
    }
    persistPanelMode(nextResolved, panelModeStorageScope);
  }, [access, panelMode, panelModeStorageScope]);

  const tokenInQuery = new URLSearchParams(location.search).get('token');
  const isTokenPublicFlow =
    Boolean(tokenInQuery) &&
    ['CandidateOnboarding', 'PremiumAssessment', 'Report', 'CandidateUpgrade', 'CandidateReport'].includes(currentPageName);

  if (PUBLIC_PAGES.includes(currentPageName)) {
    return (
      <div className="min-h-screen flex flex-col">
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to={createPageUrl('Home')} className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="leading-tight">
                  <div className="text-xl font-bold text-slate-900">InsightDISC</div>
                  <div className="text-xs text-slate-500">Plataforma de Análise Comportamental</div>
                </div>
              </Link>

              <MainNavigation goHomeHash={goHomeHash} navigate={navigate} />

              <div className="flex items-center gap-4">
                {isAuthenticated ? (
                  <Link to={createPageUrl('Dashboard')}>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">Meu Painel</Button>
                  </Link>
                ) : (
                  <>
                    <Link to={createPageUrl('Login')} className="hidden md:inline-flex">
                      <Button variant="ghost">Entrar</Button>
                    </Link>
                    <Link to={createPageUrl('StartFree')}>
                      <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">Teste Grátis</Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="pt-20 flex-1">{children}</main>

        <footer className="py-6 text-center space-y-2">
          <div className="text-xs text-slate-400">© {new Date().getFullYear()} InsightDISC</div>
        </footer>
      </div>
    );
  }

  if (isTokenPublicFlow) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  const canAccessPremium = canAccessPremiumSaas(access);
  const canManageAssessments =
    canAccessPremium && hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE);
  const navItems = buildRoleNavigation(access, { panelMode });

  const dashboardTitle = getDashboardHeaderByRole(access, { panelMode });
  const pageTitle =
    currentPageName === 'Dashboard'
      ? dashboardTitle
      : PAGE_TITLES[currentPageName] || {
          title: currentPageName,
          subtitle: 'Gestão da plataforma DISC',
        };

  const primaryAction =
    currentPageName === 'Dashboard' && canManageAssessments ? (
      <Link to={createPageUrl('SendAssessment')}>
        <Button className="bg-indigo-600 hover:bg-indigo-700">Enviar avaliação</Button>
      </Link>
    ) : null;

  const panelModeSwitcher =
    isAuthenticated && !PUBLIC_PAGES.includes(currentPageName) ? (
      <PanelModeSwitcher value={panelMode} onChange={handlePanelModeChange} />
    ) : null;

  const topbarActions =
    panelModeSwitcher || primaryAction ? (
      <div className="flex flex-wrap items-center gap-2">
        {panelModeSwitcher}
        {primaryAction}
      </div>
    ) : null;

  const panelModeContextValue = buildPanelModeContext(access, panelMode, handlePanelModeChange);

  return (
    <PanelModeProvider value={panelModeContextValue}>
      <AppShell
        currentPageName={currentPageName}
        currentPath={location.pathname}
        navItems={navItems}
        user={user}
        onLogout={handleLogout}
        title={pageTitle.title}
        subtitle={pageTitle.subtitle}
        actions={topbarActions}
        modeLabel={PANEL_MODE_META[panelMode]?.label}
      >
        {children}
      </AppShell>
    </PanelModeProvider>
  );
}
