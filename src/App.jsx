import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { pagesConfig } from './pages.config';
import { BrowserRouter as Router, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import PaletteTest from './pages/PaletteTest';
import PanelArchetypes from '@/pages/PanelArchetypes';
import PanelCoach from '@/pages/PanelCoach';
import PanelAiLab from '@/pages/PanelAiLab';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ProtectedRoute from '@/modules/auth/ProtectedRoute';
import { getPagePolicy } from '@/modules/auth/route-policy';
import CandidateShell from '@/components/shell/CandidateShell';
import CandidateInvite from '@/pages/candidate/CandidateInvite';
import CandidateAssessment from '@/pages/candidate/CandidateAssessment';
import CandidateReport from '@/pages/candidate/CandidateReport';
import CandidatePortal from '@/pages/candidate/CandidatePortal';
import CandidateUpgrade from '@/pages/candidate/CandidateUpgrade';
import InsightChatWidget from '@/components/InsightChatWidget';
import SuperAdminLogin from '@/pages/SuperAdminLogin';
import SuperAdminDashboard from '@/pages/SuperAdminDashboard';
import AiDiscLab from '@/pages/AiDiscLab';
import SuperAdminRoute from '@/modules/auth/SuperAdminRoute';
import ScrollToTopOnRouteChange from '@/components/ScrollToTopOnRouteChange';
import GiftLanding from '@/pages/GiftLanding';
import Checkout from '@/pages/Checkout';
import AuthCallback from './pages/AuthCallback.jsx';
import CheckoutPlanPage from '@/pages/CheckoutPlanPage';
import CheckoutCancel from './pages/CheckoutCancel.jsx';
import DossieComportamentalLandingPage from '@/pages/DossieComportamental';
import PersonalLandingPage from '@/pages/PersonalLanding';
import ProfissionalLandingPage from '@/pages/ProfissionalLanding';
import BusinessLandingPage from '@/pages/BusinessLanding';
import PlanosPage from '@/pages/PlanosPage';
import CompareProfiles from '@/pages/CompareProfiles';
import TeamMap from '@/pages/TeamMap';
import RoleDashboardHome from '@/pages/RoleDashboardHome';
import PanelFeaturePlaceholder from '@/pages/PanelFeaturePlaceholder';
import AssessmentResult from '@/pages/AssessmentResult';
import AssessmentReport from '@/pages/AssessmentReport';
import DiscLibrary from '@/pages/DiscLibrary';
import DemoMode from '@/pages/DemoMode';
import OrganizationalReport from '@/pages/OrganizationalReport';
import SalesPersonaLanding from '@/pages/SalesPersonaLanding';
import MarketingUseCaseLanding from '@/pages/MarketingUseCaseLanding';
import Home from '@/pages/Home';
import AdminDashboardV3 from '@/pages/admin/AdminDashboard';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminCompanies from '@/pages/admin/AdminCompanies';
import AdminAssessments from '@/pages/admin/AdminAssessments';
import AdminBilling from '@/pages/admin/AdminBilling';
import { buildAssessmentResultPath } from '@/modules/assessmentResult/routes';
import { buildAssessmentReportPath } from '@/modules/reports/routes';

const { Pages, Layout } = pagesConfig;
const PublicReportPage = Pages.PublicReport;
const EXCLUDED_AUTO_ROUTES = new Set([
  'SuperAdmin',
  'SuperAdminLogin',
  'SuperAdminDashboard',
  'Dashboard',
  'Home',
]);

const APP_ALIAS_ROUTES = [
  { path: '/app/dossier', pageName: 'Dossier' },
  { path: '/app/dossier/:candidateId', pageName: 'Dossier' },
  { path: '/app/my-assessments', pageName: 'MyAssessments' },
  { path: '/app/send-assessment', pageName: 'SendAssessment' },
  { path: '/app/team-mapping', pageName: 'TeamMapping' },
  { path: '/app/job-matching', pageName: 'JobMatching' },
  { path: '/app/leads', pageName: 'LeadsDashboard' },
  { path: '/app/credits', pageName: 'Credits' },
  { path: '/app/branding', pageName: 'BrandingSettings' },
  { path: '/app/admin', pageName: 'AdminDashboard' },
  { path: '/app/analytics', pageName: 'AnalyticsDashboard' },
];

const MARKETING_USE_CASE_ROUTES = Object.freeze([
  '/disc-para-empresas',
  '/analise-disc-para-rh',
  '/teste-disc-com-relatorio',
  '/comparacao-de-perfis-disc',
  '/mapa-comportamental-de-equipe',
  '/analise-comportamental-para-lideres',
  '/disc-para-recrutamento',
]);

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;

const DashboardHomeRouteElement = (
  <ProtectedRoute pageName="Dashboard" policy={getPagePolicy('Dashboard')}>
    <LayoutWrapper currentPageName="Dashboard">
      <RoleDashboardHome />
    </LayoutWrapper>
  </ProtectedRoute>
);

function AssessmentResultAliasRedirect() {
  const { id } = useParams();
  return <Navigate to={buildAssessmentResultPath(id)} replace />;
}

function AssessmentReportAliasRedirect() {
  const { id } = useParams();
  return <Navigate to={buildAssessmentReportPath(id)} replace />;
}

function renderProtectedPage(path, pageName, PageComponent) {
  if (!PageComponent) return null;

  return (
    <Route
      key={path}
      path={path}
      element={
        <ProtectedRoute pageName={pageName} policy={getPagePolicy(pageName)}>
          <LayoutWrapper currentPageName={pageName}>
            <PageComponent />
          </LayoutWrapper>
        </ProtectedRoute>
      }
    />
  );
}

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();
  const location = useLocation();
  const isCandidatePublicPath = location.pathname.startsWith('/c/');

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (authError && !isCandidatePublicPath) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
  }

  return (
    <Routes>
      <Route path="/c" element={<CandidateShell />}>
        <Route index element={<CandidateInvite />} />
        <Route path="invite" element={<CandidateInvite />} />
        <Route path="upgrade" element={<CandidateUpgrade />} />
        <Route path="assessment" element={<CandidateAssessment />} />
        <Route path="report" element={<CandidateReport />} />
        <Route path="portal" element={<CandidatePortal />} />
      </Route>

      <Route
        path="/gift/:token"
        element={
          <ProtectedRoute pageName="GiftLanding" policy={getPagePolicy('GiftLanding')}>
            <LayoutWrapper currentPageName="GiftLanding">
              <GiftLanding />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />

      <Route path="/dossie-comportamental" element={<Navigate to="/dossie" replace />} />
      <Route
        path="/dossie"
        element={
          <DossieComportamentalLandingPage />
        }
      />
      <Route path="/personal" element={<PersonalLandingPage />} />
      <Route path="/profissional" element={<ProfissionalLandingPage />} />
      <Route path="/business" element={<BusinessLandingPage />} />
      <Route path="/planos" element={<PlanosPage />} />
      <Route
        path="/demo"
        element={
          <LayoutWrapper currentPageName="Demo">
            <DemoMode />
          </LayoutWrapper>
        }
      />

      <Route
        path="/checkout"
        element={
          <ProtectedRoute pageName="Checkout">
            <LayoutWrapper currentPageName="Checkout">
              <Checkout />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/checkout/success"
        element={
          <LayoutWrapper currentPageName="CheckoutSuccess">
            <Pages.CheckoutSuccess />
          </LayoutWrapper>
        }
      />
      <Route
        path="/checkout/cancel"
        element={
          <LayoutWrapper currentPageName="CheckoutCancel">
            <CheckoutCancel />
          </LayoutWrapper>
        }
      />
      <Route
        path="/auth/callback"
        element={
          <LayoutWrapper currentPageName="AuthCallback">
            <AuthCallback />
          </LayoutWrapper>
        }
      />
      <Route
        path="/checkout/:planSlug"
        element={
          <ProtectedRoute pageName="CheckoutPlan" policy={getPagePolicy('CheckoutPlan')}>
            <LayoutWrapper currentPageName="CheckoutPlan">
              <CheckoutPlanPage />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/empresa"
        element={
          <LayoutWrapper currentPageName="SalesLanding">
            <SalesPersonaLanding />
          </LayoutWrapper>
        }
      />
      <Route
        path="/rh"
        element={
          <LayoutWrapper currentPageName="SalesLanding">
            <SalesPersonaLanding />
          </LayoutWrapper>
        }
      />
      <Route
        path="/lideres"
        element={
          <LayoutWrapper currentPageName="SalesLanding">
            <SalesPersonaLanding />
          </LayoutWrapper>
        }
      />
      <Route
        path="/vendas"
        element={
          <LayoutWrapper currentPageName="SalesLanding">
            <SalesPersonaLanding />
          </LayoutWrapper>
        }
      />
      <Route
        path="/consultores"
        element={
          <LayoutWrapper currentPageName="SalesLanding">
            <SalesPersonaLanding />
          </LayoutWrapper>
        }
      />
      <Route
        path="/autoconhecimento"
        element={
          <LayoutWrapper currentPageName="SalesLanding">
            <SalesPersonaLanding />
          </LayoutWrapper>
        }
      />
      <Route
        path="/recrutamento"
        element={
          <LayoutWrapper currentPageName="SalesLanding">
            <SalesPersonaLanding />
          </LayoutWrapper>
        }
      />
      {MARKETING_USE_CASE_ROUTES.map((path) => (
        <Route
          key={path}
          path={path}
          element={
            <LayoutWrapper currentPageName="SalesLanding">
              <MarketingUseCaseLanding />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/Checkout" element={<Navigate to="/checkout" replace />} />
      <Route caseSensitive path="/pricing" element={<Navigate to="/Pricing" replace />} />
      <Route caseSensitive path="/compare" element={<Navigate to="/compare-profiles" replace />} />
      <Route caseSensitive path="/comparison-report" element={<Navigate to="/compare-profiles" replace />} />
      <Route caseSensitive path="/profile-compatibility" element={<Navigate to="/compare-profiles" replace />} />
      <Route caseSensitive path="/team-mapping" element={<Navigate to="/team-map" replace />} />
      <Route caseSensitive path="/organization-map" element={<Navigate to="/team-map" replace />} />
      <Route caseSensitive path="/organizational-map" element={<Navigate to="/team-map" replace />} />
      <Route path="/assessment/:id/result" element={<AssessmentResultAliasRedirect />} />
      <Route path="/assessment/:id/report" element={<AssessmentReportAliasRedirect />} />
      <Route path="/report/:id" element={<AssessmentReportAliasRedirect />} />
      <Route path="/reports/:id" element={<AssessmentReportAliasRedirect />} />
      <Route path="/app/compare-profiles" element={<Navigate to="/compare-profiles" replace />} />
      <Route path="/app/team-map" element={<Navigate to="/team-map" replace />} />

      <Route
        path="/compare-profiles"
        element={
          <ProtectedRoute pageName="CompareProfiles" policy={getPagePolicy('CompareProfiles')}>
            <LayoutWrapper currentPageName="CompareProfiles">
              <CompareProfiles />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/disc-library"
        element={
          <ProtectedRoute pageName="DiscLibrary" policy={getPagePolicy('DiscLibrary')}>
            <LayoutWrapper currentPageName="DiscLibrary">
              <DiscLibrary />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/team-map"
        element={
          <ProtectedRoute pageName="TeamMap" policy={getPagePolicy('TeamMap')}>
            <LayoutWrapper currentPageName="TeamMap">
              <TeamMap />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/organization-report"
        element={
          <ProtectedRoute pageName="OrganizationalReport" policy={getPagePolicy('OrganizationalReport')}>
            <LayoutWrapper currentPageName="OrganizationalReport">
              <OrganizationalReport />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route path="/coach" element={<Navigate to="/painel/coach" replace />} />
      <Route
        path="/archetypes"
        element={<Navigate to="/painel/arquetipos" replace />}
      />

      <Route
        path="/assessments/:id/result"
        element={
          <ProtectedRoute pageName="AssessmentResult" policy={getPagePolicy('AssessmentResult')}>
            <LayoutWrapper currentPageName="AssessmentResult">
              <AssessmentResult />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />

      <Route
        path="/assessments/:id/report"
        element={
          <ProtectedRoute pageName="Report" policy={getPagePolicy('Report')}>
            <LayoutWrapper currentPageName="Report">
              <AssessmentReport />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />

      <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/app/dashboard" element={<Navigate to="/painel" replace />} />
      <Route path="/panel" element={<Navigate to="/painel" replace />} />
      <Route path="/painel" element={DashboardHomeRouteElement} />
      <Route path="/Dashboard" element={DashboardHomeRouteElement} />
      <Route path="/ai-lab" element={<Navigate to="/painel/ai-lab" replace />} />
      <Route
        path="/painel/ai-lab"
        element={
          <ProtectedRoute pageName="PanelAiLab" policy={getPagePolicy('PanelAiLab')}>
            <LayoutWrapper currentPageName="PanelAiLab">
              <PanelAiLab />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/painel/coach"
        element={
          <ProtectedRoute pageName="PanelCoach" policy={getPagePolicy('PanelCoach')}>
            <LayoutWrapper currentPageName="PanelCoach">
              <PanelCoach />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/painel/arquetipos"
        element={
          <ProtectedRoute pageName="PanelArquetipos" policy={getPagePolicy('PanelArquetipos')}>
            <LayoutWrapper currentPageName="PanelArquetipos">
              <PanelArchetypes />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/painel/:featureSlug"
        element={
          <ProtectedRoute pageName="Dashboard" policy={getPagePolicy('Dashboard')}>
            <LayoutWrapper currentPageName="Dashboard">
              <PanelFeaturePlaceholder />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route
        path="/DashboardLegacy"
        element={
          <ProtectedRoute pageName="Dashboard" policy={getPagePolicy('Dashboard')}>
            <LayoutWrapper currentPageName="Dashboard">
              <Pages.Dashboard />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />
      <Route path="/dashboard-legacy" element={<Navigate to="/DashboardLegacy" replace />} />
      {APP_ALIAS_ROUTES.map(({ path, pageName }) =>
        renderProtectedPage(path, pageName, Pages[pageName])
      )}
      {renderProtectedPage('/sendAssessment', 'SendAssessment', Pages.SendAssessment)}
      {renderProtectedPage('/avaliacoes', 'Avaliacoes', Pages.Avaliacoes)}

      <Route
        path="/super-admin-login"
        element={
          <ProtectedRoute pageName="SuperAdminLogin" policy={getPagePolicy('SuperAdminLogin')}>
            <SuperAdminLogin />
          </ProtectedRoute>
        }
      />

      <Route
        path="/super-admin"
        element={
          <SuperAdminRoute>
            <SuperAdminDashboard />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/super-admin/ai-lab"
        element={
          <SuperAdminRoute>
            <AiDiscLab />
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <SuperAdminRoute>
            <LayoutWrapper currentPageName="AdminDashboard">
              <AdminDashboardV3 />
            </LayoutWrapper>
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <SuperAdminRoute>
            <LayoutWrapper currentPageName="AdminDashboard">
              <AdminUsers />
            </LayoutWrapper>
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/companies"
        element={
          <SuperAdminRoute>
            <LayoutWrapper currentPageName="AdminDashboard">
              <AdminCompanies />
            </LayoutWrapper>
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/assessments"
        element={
          <SuperAdminRoute>
            <LayoutWrapper currentPageName="AdminDashboard">
              <AdminAssessments />
            </LayoutWrapper>
          </SuperAdminRoute>
        }
      />
      <Route
        path="/admin/billing"
        element={
          <SuperAdminRoute>
            <LayoutWrapper currentPageName="AdminDashboard">
              <AdminBilling />
            </LayoutWrapper>
          </SuperAdminRoute>
        }
      />

      <Route
        path="/"
        element={<Home />}
      />
      <Route path="/Home" element={<Navigate to="/" replace />} />
      <Route path="/home" element={<Navigate to="/" replace />} />

      {Object.entries(Pages)
        .filter(([path]) => !EXCLUDED_AUTO_ROUTES.has(path))
        .map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <ProtectedRoute pageName={path} policy={getPagePolicy(path)}>
              <LayoutWrapper currentPageName={path}>
                <Page />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />
      ))}

      {PublicReportPage ? (
        <Route
          path="/r/:token"
          element={
            <ProtectedRoute pageName="PublicReport" policy={getPagePolicy('PublicReport')}>
              <LayoutWrapper currentPageName="PublicReport">
                <PublicReportPage />
              </LayoutWrapper>
            </ProtectedRoute>
          }
        />
      ) : null}

      <Route path="/palette-test" element={<PaletteTest />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function RouteAwareChatWidget() {
  const location = useLocation();
  if (
    location.pathname === '/' ||
    location.pathname === '/dossie' ||
    location.pathname === '/personal' ||
    location.pathname === '/profissional' ||
    location.pathname === '/business' ||
    location.pathname === '/planos'
  ) {
    return null;
  }
  return <InsightChatWidget />;
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTopOnRouteChange />
          <AuthenticatedApp />
          <RouteAwareChatWidget />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
