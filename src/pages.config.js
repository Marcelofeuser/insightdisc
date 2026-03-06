/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AdminDashboard from './pages/AdminDashboard';
import Avaliacoes from './pages/Avaliacoes';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import CandidateOnboarding from './pages/CandidateOnboarding';
import CreditCenter from './pages/CreditCenter';
import Dashboard from './pages/Dashboard';
import CheckoutSuccess from './pages/CheckoutSuccess';
import BrandingSettings from './pages/BrandingSettings';
import ForgotPassword from './pages/ForgotPassword';
import FreeAssessment from './pages/FreeAssessment';
import FreeResults from './pages/FreeResults';
import Home from './pages/Home';
import JobMatching from './pages/JobMatching';
import LeadsDashboard from './pages/LeadsDashboard';
import Lgpd from './pages/Lgpd';
import Login from './pages/Login';
import MyAssessments from './pages/MyAssessments';
import Privacy from './pages/Privacy';
import PremiumAssessment from './pages/PremiumAssessment';
import Pricing from './pages/Pricing';
import PublicReport from './pages/PublicReport';
import Report from './pages/Report';
import SendAssessment from './pages/SendAssessment';
import Signup from './pages/Signup';
import StartFree from './pages/StartFree';
import TeamMapping from './pages/TeamMapping';
import Terms from './pages/Terms';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AdminDashboard": AdminDashboard,
    "Avaliacoes": Avaliacoes,
    "AnalyticsDashboard": AnalyticsDashboard,
    "CandidateOnboarding": CandidateOnboarding,
    "BrandingSettings": BrandingSettings,
    "CheckoutSuccess": CheckoutSuccess,
    "Credits": CreditCenter,
    "Dashboard": Dashboard,
    "ForgotPassword": ForgotPassword,
    "FreeAssessment": FreeAssessment,
    "FreeResults": FreeResults,
    "Home": Home,
    "JobMatching": JobMatching,
    "LeadsDashboard": LeadsDashboard,
    "Lgpd": Lgpd,
    "Login": Login,
    "MyAssessments": MyAssessments,
    "PremiumAssessment": PremiumAssessment,
    "Privacy": Privacy,
    "Pricing": Pricing,
    "PublicReport": PublicReport,
    "Report": Report,
    "SendAssessment": SendAssessment,
    "Signup": Signup,
    "StartFree": StartFree,
    "TeamMapping": TeamMapping,
    "Terms": Terms,
}

export const pagesConfig = {
    mainPage: "Home",
    Pages: PAGES,
    Layout: __Layout,
};
