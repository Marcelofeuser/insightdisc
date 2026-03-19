import { apiRequest, getApiBaseUrl, resolveApiRequestUrl } from '@/lib/apiClient';

function parseFileNameFromContentDisposition(header = '') {
  const value = String(header || '');
  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]).replaceAll('"', '');
  }

  const simpleMatch = value.match(/filename="?([^";]+)"?/i);
  if (simpleMatch?.[1]) {
    return simpleMatch[1].trim();
  }

  return '';
}

function resolveExportErrorMessage({ status, reason = '', payloadMessage = '' } = {}) {
  const key = String(reason || '').toUpperCase();

  if (status === 401) return 'Sua sessão expirou. Faça login novamente para exportar o PDF.';
  if (status === 403 || key.includes('FORBIDDEN') || key.includes('REPORT_EXPORT')) {
    return 'Sua conta não possui permissão para exportar o PDF deste relatório.';
  }
  if (status === 404 || key.includes('NOT_FOUND')) {
    return 'Não localizamos a avaliação para gerar o PDF oficial.';
  }
  if (status === 503 || key.includes('PDF_UNAVAILABLE')) {
    return 'O serviço de PDF está indisponível no momento. Tente novamente em instantes.';
  }
  if (status === 400 || key.includes('ASSESSMENT_ID_REQUIRED')) {
    return 'Não foi possível exportar: identificação da avaliação ausente.';
  }

  if (payloadMessage) return payloadMessage;
  return 'Não foi possível exportar o PDF do relatório oficial.';
}

export function downloadPdfBlob(blob, fileName = 'insightdisc-relatorio-oficial.pdf') {
  const objectUrl = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function resolvePublicPdfEndpoint(publicAccess = {}, apiBaseUrl = '') {
  const directUrl = resolveApiRequestUrl(
    publicAccess?.publicPdfUrl || publicAccess?.publicPdfPath || '',
    { baseUrl: apiBaseUrl },
  );
  if (directUrl) return directUrl;

  const token = String(publicAccess?.token || '').trim();
  if (!token) return '';

  return resolveApiRequestUrl(
    `/api/report/pdf?token=${encodeURIComponent(token)}`,
    { baseUrl: apiBaseUrl },
  );
}

export async function exportAssessmentReportPdf({
  assessmentId,
  apiBaseUrl: apiBaseUrlOverride,
  publicAccess: publicAccessFromState = null,
} = {}) {
  const normalizedAssessmentId = String(assessmentId || '').trim();
  if (!normalizedAssessmentId) {
    const error = new Error('ASSESSMENT_ID_REQUIRED');
    error.status = 400;
    throw error;
  }

  const apiBaseUrl = String(apiBaseUrlOverride || getApiBaseUrl() || '').trim();
  if (!apiBaseUrl) {
    const error = new Error('API_BASE_URL_NOT_CONFIGURED');
    error.status = 503;
    throw error;
  }

  let publicAccess = publicAccessFromState;
  let endpoint = resolvePublicPdfEndpoint(publicAccess, apiBaseUrl);

  if (!endpoint) {
    publicAccess = await apiRequest(`/assessment/public-token/${encodeURIComponent(normalizedAssessmentId)}`, {
      method: 'GET',
      requireAuth: true,
      baseUrl: apiBaseUrl,
    });
    endpoint = resolvePublicPdfEndpoint(publicAccess, apiBaseUrl);
  }

  if (!endpoint) {
    const error = new Error('PUBLIC_PDF_URL_REQUIRED');
    error.status = 503;
    throw error;
  }

  const response = await fetch(endpoint, {
    method: 'GET',
  });

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!response.ok) {
    let payload = {};
    try {
      payload = await response.json();
    } catch {
      payload = {};
    }

    const error = new Error(
      resolveExportErrorMessage({
        status: response.status,
        reason: payload?.reason || payload?.error,
        payloadMessage: payload?.message,
      }),
    );
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  if (!contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
    const error = new Error('PDF_INVALID_CONTENT_TYPE');
    error.status = 500;
    throw error;
  }

  const blob = await response.blob();
  if (!blob || blob.size === 0) {
    const error = new Error('PDF_EMPTY');
    error.status = 503;
    throw error;
  }

  const fileName =
    parseFileNameFromContentDisposition(response.headers.get('content-disposition') || '') ||
    `insightdisc-relatorio-oficial-${normalizedAssessmentId}.pdf`;

  return {
    blob,
    fileName,
    bytes: blob.size,
  };
}
