import { base44 } from '@/api/base44Client';
import { apiRequest, getApiToken } from '@/lib/apiClient';
import { canViewReport, createAccessContext } from '@/modules/auth/access-control';
import { findCandidateReportByIdentifier, mapCandidateReports } from '@/modules/report/backendReports';

export const REPORT_LOAD_STATE = Object.freeze({
  LOADING: 'loading',
  READY: 'ready',
  FORBIDDEN: 'forbidden',
  NOT_FOUND: 'not_found',
  ERROR: 'error',
});

function mapReportDataPayload(payload = {}, assessmentId = '') {
  const publicAccess = payload?.publicAccess || null;
  const reportItem =
    payload?.reportItem ||
    (payload?.assessment?.id
      ? {
          assessmentId: payload.assessment.id,
          reportId: payload?.report?.id || '',
          candidateUserId: payload?.assessment?.candidateUserId || '',
          candidateName: payload?.assessment?.candidateName || '',
          candidateEmail: payload?.assessment?.candidateEmail || '',
          createdAt: payload?.assessment?.createdAt || null,
          completedAt: payload?.assessment?.completedAt || null,
          pdfUrl: publicAccess?.publicPdfUrl || payload?.report?.pdfUrl || '',
          reportType: publicAccess?.reportType || payload?.report?.reportType || 'business',
          publicToken: publicAccess?.token || '',
          publicReportUrl: publicAccess?.publicReportUrl || '',
          publicPdfUrl: publicAccess?.publicPdfUrl || '',
          discProfile: payload?.report?.discProfile || null,
        }
      : null);

  if (!reportItem) return null;

  const mappedReports = mapCandidateReports([reportItem]);
  const mapped =
    findCandidateReportByIdentifier(mappedReports, assessmentId) || mappedReports[0] || null;

  if (!mapped || !publicAccess) return mapped;

  return {
    ...mapped,
    publicAccess,
    reportType: publicAccess.reportType || mapped.reportType || mapped.report_type || 'business',
    publicToken: publicAccess.token || mapped.publicToken || mapped.public_token || '',
    publicReportUrl:
      publicAccess.publicReportUrl || mapped.publicReportUrl || mapped.public_report_url || '',
    publicPdfUrl:
      publicAccess.publicPdfUrl || mapped.publicPdfUrl || mapped.public_pdf_url || mapped.pdfUrl || '',
  };
}

export async function loadAssessmentReportData({
  assessmentId,
  apiBaseUrl,
  authAccess,
}) {
  const trimmedId = String(assessmentId || '').trim();
  if (!trimmedId) {
    return { status: REPORT_LOAD_STATE.NOT_FOUND, message: 'ID da avaliação não informado.' };
  }

  if (apiBaseUrl) {
    const hasApiSession = Boolean(getApiToken() || authAccess?.email);

    if (hasApiSession) {
      try {
        const payload = await apiRequest(`/assessment/report-data?id=${encodeURIComponent(trimmedId)}`, {
          method: 'GET',
          requireAuth: true,
        });
        let enrichedPayload = payload;

        try {
          const publicAccess = await apiRequest(
            `/assessment/public-token/${encodeURIComponent(trimmedId)}`,
            {
              method: 'GET',
              requireAuth: true,
            },
          );
          enrichedPayload = {
            ...payload,
            publicAccess,
          };
        } catch {
          enrichedPayload = payload;
        }

        const assessment = mapReportDataPayload(enrichedPayload, trimmedId);
        if (assessment) {
          return { status: REPORT_LOAD_STATE.READY, assessment };
        }
      } catch (error) {
        const status = Number(error?.status);
        if ((status === 401 || status === 403) && !base44?.__isMock) {
          return {
            status: REPORT_LOAD_STATE.FORBIDDEN,
            message: 'Sem permissão para visualizar este relatório.',
          };
        }
      }

      try {
        const payload = await apiRequest('/candidate/me/reports', {
          method: 'GET',
          requireAuth: true,
        });
        const reports = mapCandidateReports(payload?.reports || []);
        const assessment = findCandidateReportByIdentifier(reports, trimmedId);
        if (assessment) {
          return { status: REPORT_LOAD_STATE.READY, assessment };
        }
      } catch (error) {
        const status = Number(error?.status);
        if ((status === 401 || status === 403) && !base44?.__isMock) {
          return {
            status: REPORT_LOAD_STATE.FORBIDDEN,
            message: 'Sem permissão para visualizar este relatório.',
          };
        }
      }
    }

    if (!base44?.__isMock) {
      return {
        status: REPORT_LOAD_STATE.NOT_FOUND,
        message: 'Relatório não encontrado na base atual.',
      };
    }
  }

  try {
    const records = await base44.entities.Assessment.filter({ id: trimmedId });
    if (records.length > 0) {
      const assessment = records[0];
      const fallbackUser = authAccess?.userId ? null : await base44.auth.me().catch(() => null);
      const accessContext = authAccess?.userId ? authAccess : createAccessContext(fallbackUser);
      const requiresPro = Boolean(assessment?.type === 'premium' || assessment?.report_unlocked);

      if (!canViewReport(accessContext, assessment, { requiresPro })) {
        return {
          status: REPORT_LOAD_STATE.FORBIDDEN,
          message: 'Sem permissão para visualizar este relatório.',
        };
      }

      return { status: REPORT_LOAD_STATE.READY, assessment };
    }
  } catch (error) {
    return {
      status: REPORT_LOAD_STATE.ERROR,
      message: error?.message || 'Falha ao carregar relatório.',
    };
  }

  return {
    status: REPORT_LOAD_STATE.NOT_FOUND,
    message: 'Relatório não encontrado para o ID informado.',
  };
}
