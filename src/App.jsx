import { Toaster } from '@/components/ui/toaster';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import { pagesConfig } from './pages.config';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import PaletteTest from './pages/PaletteTest';
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
import SuperAdminRoute from '@/modules/auth/SuperAdminRoute';
import ScrollToTopOnRouteChange from '@/components/ScrollToTopOnRouteChange';
import GiftLanding from '@/pages/GiftLanding';
import Checkout from '@/pages/Checkout';
import DossieComportamentalLandingPage from '@/pages/DossieComportamental';
import CompareProfiles from '@/pages/CompareProfiles';
import TeamMap from '@/pages/TeamMap';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;
const PublicReportPage = Pages.PublicReport;
const EXCLUDED_AUTO_ROUTES = new Set(['SuperAdmin', 'SuperAdminLogin', 'SuperAdminDashboard']);

const APP_ALIAS_ROUTES = [
  { path: '/app/dashboard', pageName: 'Dashboard' },
  { path: '/app/dossier', pageName: 'Dossier' },
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

const LayoutWrapper = ({ children, currentPageName }) =>
  Layout ? <Layout currentPageName={currentPageName}>{children}</Layout> : <>{children}</>;

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
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
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
    if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
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

      <Route
        path="/dossie-comportamental"
        element={
          <LayoutWrapper currentPageName="DossieComportamentalLanding">
            <DossieComportamentalLandingPage />
          </LayoutWrapper>
        }
      />

      <Route
        path="/checkout"
        element={
          <LayoutWrapper currentPageName="Checkout">
            <Checkout />
          </LayoutWrapper>
        }
      />
      <Route path="/Checkout" element={<Navigate to="/checkout" replace />} />
      <Route caseSensitive path="/pricing" element={<Navigate to="/Pricing" replace />} />

      <Route
        path="/compare"
        element={
          <ProtectedRoute pageName="CompareProfiles" policy={getPagePolicy('CompareProfiles')}>
            <LayoutWrapper currentPageName="CompareProfiles">
              <CompareProfiles />
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

      <Route path="/app" element={<Navigate to="/app/dashboard" replace />} />
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
        path="/"
        element={
          <ProtectedRoute pageName={mainPageKey} policy={getPagePolicy(mainPageKey)}>
            <LayoutWrapper currentPageName={mainPageKey}>
              <MainPage />
            </LayoutWrapper>
          </ProtectedRoute>
        }
      />

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

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <ScrollToTopOnRouteChange />
          <AuthenticatedApp />
          <InsightChatWidget />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
