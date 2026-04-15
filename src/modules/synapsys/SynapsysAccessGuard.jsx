import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { hasSynapsysAccess } from '@/modules/synapsys/access';
import {
  buildSynapsysEntryPath,
  buildSynapsysPricingPath,
  buildSynapsysSignupPath,
} from '@/modules/synapsys/routes';

function buildCurrentPath(location) {
  return `${String(location?.pathname || '')}${String(location?.search || '')}`;
}

export default function SynapsysAccessGuard({ children }) {
  const location = useLocation();
  const { isAuthenticated, isLoadingAuth, user, access } = useAuth();
  const searchParams = new URLSearchParams(location.search || '');
  const requestedPlan = String(searchParams.get('plan') || 'free').trim().toLowerCase();

  if (isLoadingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#02040b]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-cyan-200" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        replace
        to={buildSynapsysSignupPath({
          intent: requestedPlan === 'premium' ? 'premium' : 'free',
          next: buildCurrentPath(location),
        })}
      />
    );
  }

  if (!hasSynapsysAccess(user, access)) {
    return (
      <Navigate
        replace
        to={requestedPlan === 'premium' ? buildSynapsysPricingPath({ plan: 'premium' }) : buildSynapsysEntryPath()}
      />
    );
  }

  return children;
}
