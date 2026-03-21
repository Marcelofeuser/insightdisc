import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import AppShell from '@/components/shell/AppShell';
import MainNavigation, { HOME_HASH_ITEMS } from '@/components/layout/MainNavigation';
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
  'Demo',
  'SalesLanding',
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
  OrganizationalReport: {
    title: 'Relatório Organizacional',
    subtitle: 'Leitura executiva de cultura comportamental, benchmark e recomendações estratégicas',
  },
  Coach: {
    title: 'Coach Comportamental',
    subtitle: 'Perguntas práticas e recomendações baseadas no DISC Engine',
  },
  Demo: {
    title: 'Modo Demo',
    subtitle: 'Explore a plataforma com dados de demonstração sem cadastro',
  },
  Checkout: { title: 'Checkout', subtitle: 'Compra de créditos e gerenciamento de pacotes' },
  JobMatching: { title: 'Job Matching', subtitle: 'Compatibilidade entre perfis e vagas' },
  LeadsDashboard: { title: 'Leads', subtitle: 'Gestão comercial e captação do chatbot' },
  SendAssessment: { title: 'Enviar Avaliação', subtitle: 'Convites e disparos de testes DISC' },
  Dossier: { title: 'Dossiê Comportamental', subtitle: 'Histórico comportamental completo dos avaliados' },
  AssessmentResult: {
    title: 'Resultado da Avaliação DISC',
    subtitle: 'Leitura oficial do perfil comportamental com interpretação estruturada',
  },
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
  const [homeMenuOpen, setHomeMenuOpen] = useState(false);
  const [homeScrolled, setHomeScrolled] = useState(false);
  const isHomePage = currentPageName === 'Home';

  const scrollToHashTarget = useCallback((hash) => {
    const id = hash.replace('#', '');
    const target = document.getElementById(id);
    if (!target) return;
    const offsetTop = target.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({
      top: offsetTop,
      behavior: 'smooth',
    });
  }, []);

  const goHomeHash = (hash) => {
    const homeUrl = createPageUrl('Home');

    if (location.pathname === homeUrl) {
      window.location.hash = hash;
      setTimeout(() => {
        scrollToHashTarget(hash);
      }, 0);
      setHomeMenuOpen(false);
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

  useEffect(() => {
    if (!isHomePage) return undefined;

    const handleScroll = () => {
      setHomeScrolled(window.scrollY > 50);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isHomePage]);

  useEffect(() => {
    if (!isHomePage || !location.hash) return;
    const timeout = window.setTimeout(() => scrollToHashTarget(location.hash), 40);
    return () => window.clearTimeout(timeout);
  }, [isHomePage, location.hash, scrollToHashTarget]);

  if (PUBLIC_PAGES.includes(currentPageName)) {
    return (
      <div className="min-h-screen flex flex-col">
        <header
          id={isHomePage ? 'navbar' : undefined}
          className={
            isHomePage
              ? `fixed left-0 right-0 top-0 z-50 glass-card transition-all duration-300 ${homeScrolled ? 'nav-sticky' : ''}`
              : 'fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100'
          }
        >
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link to={createPageUrl('Home')} className="flex items-center gap-2">
                <div className={isHomePage ? 'disc-gradient w-10 h-10 rounded-xl flex items-center justify-center' : 'w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center'}>
                  {isHomePage ? <span className="text-lg font-extrabold text-white">ID</span> : <Sparkles className="w-5 h-5 text-white" />}
                </div>
                <div className="leading-tight">
                  <div className={isHomePage ? 'text-xl font-bold text-white' : 'text-xl font-bold text-slate-900'}>InsightDISC</div>
                  {isHomePage ? null : <div className="text-xs text-slate-500">Plataforma de Análise Comportamental</div>}
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
                      <Button variant="ghost" className={isHomePage ? 'text-slate-300 hover:text-white' : ''}>Entrar</Button>
                    </Link>
                    <Link to={createPageUrl('StartFree')}>
                      <Button className={isHomePage ? 'btn-primary rounded-xl px-5 py-2.5 text-sm font-semibold' : 'bg-indigo-600 hover:bg-indigo-700 rounded-xl'}>
                        {isHomePage ? 'Começar Gratuitamente' : 'Teste Grátis'}
                      </Button>
                    </Link>
                  </>
                )}

                {isHomePage ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="md:hidden text-slate-300 hover:text-white"
                    onClick={() => setHomeMenuOpen((prev) => !prev)}
                    aria-label="Alternar menu"
                  >
                    {homeMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                  </Button>
                ) : null}
              </div>
            </div>

            {isHomePage ? (
              <div className={`${homeMenuOpen ? 'block' : 'hidden'} md:hidden mt-4 space-y-2 border-t border-slate-700 pt-4`}>
                {HOME_HASH_ITEMS.map((item) => (
                  <Button
                    key={item.hash}
                    type="button"
                    variant="ghost"
                    className="w-full justify-start text-slate-300 hover:text-white"
                    onClick={() => {
                      goHomeHash(item.hash);
                      setHomeMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </header>

        <main className="pt-20 flex-1">{children}</main>

        {isHomePage ? (
          <footer className="py-14 px-6 border-t border-slate-800">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="disc-gradient w-10 h-10 rounded-xl flex items-center justify-center">
                  <span className="text-lg font-extrabold text-white">ID</span>
                </div>
                <span className="text-xl font-bold text-white">InsightDISC</span>
              </div>
              <p className="text-sm text-slate-500 text-center md:text-right">
                © {new Date().getFullYear()} InsightDISC. Plataforma de inteligência comportamental.
              </p>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
              <Link to={createPageUrl('Privacy')} className="hover:text-white transition-colors">
                Privacidade
              </Link>
              <Link to={createPageUrl('Terms')} className="hover:text-white transition-colors">
                Termos de Uso
              </Link>
              <Link to={createPageUrl('Lgpd')} className="hover:text-white transition-colors">
                LGPD
              </Link>
            </div>
          </footer>
        ) : (
          <footer className="py-6 text-center space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
              <Link to={createPageUrl('Privacy')} className="hover:text-slate-900 transition-colors">
                Privacidade
              </Link>
              <Link to={createPageUrl('Terms')} className="hover:text-slate-900 transition-colors">
                Termos de Uso
              </Link>
              <Link to={createPageUrl('Lgpd')} className="hover:text-slate-900 transition-colors">
                LGPD
              </Link>
            </div>
            <div className="text-xs text-slate-400">© {new Date().getFullYear()} InsightDISC</div>
          </footer>
        )}
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
        currentPath={`${location.pathname}${location.hash || ''}`}
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
