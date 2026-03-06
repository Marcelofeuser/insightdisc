import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  CreditCard,
  LayoutDashboard,
  Palette,
  Send,
  Settings,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import AppShell from '@/components/shell/AppShell';
import {
  GLOBAL_ROLES,
  PERMISSIONS,
  createAccessContext,
  hasAnyGlobalRole,
  hasPermission,
} from '@/modules/auth/access-control';

const PUBLIC_PAGES = [
  'Home',
  'Avaliacoes',
  'FreeAssessment',
  'FreeResults',
  'CandidateOnboarding',
  'CheckoutSuccess',
  'Login',
  'Pricing',
  'PublicReport',
  'StartFree',
  'SuperAdmin',
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
  JobMatching: { title: 'Job Matching', subtitle: 'Compatibilidade entre perfis e vagas' },
  SendAssessment: { title: 'Enviar Avaliação', subtitle: 'Convites e disparos de testes DISC' },
};

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
      }
    };

    checkAuth();
  }, [location.pathname]);

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
    base44.auth.logout(createPageUrl('Home'));
  };

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

              <nav className="hidden md:flex items-center gap-6">
                <button
                  type="button"
                  onClick={() => goHomeHash('#top')}
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Início
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/avaliacoes')}
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Avaliações
                </button>
                <button
                  type="button"
                  onClick={() => goHomeHash('#features')}
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Recursos
                </button>
                <button
                  type="button"
                  onClick={() => goHomeHash('#pricing')}
                  className="text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Preços
                </button>
              </nav>

              <div className="flex items-center gap-4">
                {user ? (
                  <Link to={createPageUrl('Dashboard')}>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">Meu Painel</Button>
                  </Link>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      onClick={() => base44.auth.redirectToLogin()}
                      className="hidden md:inline-flex"
                    >
                      Entrar
                    </Button>
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
          <Link
            to={createPageUrl('SuperAdmin')}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Admin da Plataforma
          </Link>
        </footer>
      </div>
    );
  }

  if (isTokenPublicFlow) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  const access = createAccessContext(user);
  const canManageAssessments = hasPermission(access, PERMISSIONS.ASSESSMENT_CREATE);
  const canViewAssessments =
    hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_TENANT) ||
    hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_SELF);
  const canSeeTenantAnalytics = hasPermission(access, PERMISSIONS.ASSESSMENT_VIEW_TENANT);
  const canViewCredits = hasPermission(access, PERMISSIONS.CREDIT_VIEW);
  const canManageCredits = hasPermission(access, PERMISSIONS.CREDIT_MANAGE);
  const canAccessPlatformAdmin = hasAnyGlobalRole(access, [
    GLOBAL_ROLES.SUPER_ADMIN,
    GLOBAL_ROLES.PLATFORM_ADMIN,
  ]);

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', page: 'Dashboard', to: createPageUrl('Dashboard') },
    ...(canViewAssessments
      ? [{ icon: Users, label: 'Minhas Avaliações', page: 'MyAssessments', to: createPageUrl('MyAssessments') }]
      : []),
    ...(canManageAssessments
      ? [{ icon: Send, label: 'Enviar Avaliação', page: 'SendAssessment', to: createPageUrl('SendAssessment') }]
      : []),
    ...(canSeeTenantAnalytics
      ? [
          { icon: Users, label: 'Equipes', page: 'TeamMapping', to: createPageUrl('TeamMapping') },
          { icon: Briefcase, label: 'Job Matching', page: 'JobMatching', to: createPageUrl('JobMatching') },
        ]
      : []),
    ...(canViewCredits || canManageCredits
      ? [{ icon: CreditCard, label: 'Créditos', page: 'Credits', to: createPageUrl('Credits') }]
      : []),
    ...(canManageAssessments
      ? [{ icon: Palette, label: 'Marca', page: 'BrandingSettings', to: '/app/branding' }]
      : []),
    ...(canAccessPlatformAdmin
      ? [{ icon: Settings, label: 'Admin', page: 'AdminDashboard', to: createPageUrl('AdminDashboard') }]
      : []),
  ];

  const pageTitle = PAGE_TITLES[currentPageName] || {
    title: currentPageName,
    subtitle: 'Gestão da plataforma DISC',
  };

  const topbarActions =
    currentPageName === 'Dashboard' && canManageAssessments ? (
      <Link to={createPageUrl('SendAssessment')}>
        <Button className="bg-indigo-600 hover:bg-indigo-700">Enviar avaliação</Button>
      </Link>
    ) : null;

  return (
    <AppShell
      currentPageName={currentPageName}
      navItems={navItems}
      user={user}
      onLogout={handleLogout}
      title={pageTitle.title}
      subtitle={pageTitle.subtitle}
      actions={topbarActions}
    >
      {children}
    </AppShell>
  );
}
