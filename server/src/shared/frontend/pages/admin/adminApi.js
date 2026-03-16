import { apiRequest } from '@/lib/apiClient';

const EMPTY_OVERVIEW = Object.freeze({
  usersTotal: 0,
  assessmentsTotal: 0,
  reportsTotal: 0,
  leadsTotal: 0,
  paymentsTotal: 0,
  paymentsApproved: 0,
  revenueTotal: 0,
  workspacesTotal: 0,
  creditsConsumed: 0,
  latestUsers: [],
  latestReports: [],
  latestLeads: [],
  latestPayments: [],
  latestWorkspaces: [],
  latestAssessments: [],
});

export async function fetchAdminOverview() {
  const payload = await apiRequest('/super-admin/overview', {
    method: 'GET',
    requireAuth: true,
  });
  return {
    ...EMPTY_OVERVIEW,
    ...(payload || {}),
  };
}

export function formatCurrency(value = 0) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export function formatDateTime(value = '') {
  const parsed = new Date(value || Date.now());
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('pt-BR');
}
