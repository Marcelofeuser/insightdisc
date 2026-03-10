import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ArrowLeft, Download, FileSpreadsheet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest, getApiAuthHeaders, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { trackEvent } from '@/lib/analytics';
import CreditPaywallCard from '@/components/billing/CreditPaywallCard';
import {
  PERMISSIONS,
  canViewReport,
  createAccessContext,
  hasPermission,
  isSuperAdminAccess,
} from '@/modules/auth/access-control';
import { buildDiscReportModel } from '@/modules/disc/discReportBuilder';
import { findCandidateReportByIdentifier, mapCandidateReports } from '@/modules/report/backendReports.js';
import { renderReportHtml } from '@/reports/renderers/renderReportHtml';

async function exportLocalPdfFromHtml(html, fileName) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-100000px';
  host.style.top = '0';
  host.style.width = '210mm';
  host.style.zIndex = '-1';

  const style = document.createElement('style');
  style.textContent = parsed.querySelector('style')?.textContent || '';

  const content = document.createElement('div');
  content.innerHTML = parsed.body?.innerHTML || '';

  host.appendChild(style);
  host.appendChild(content);
  document.body.appendChild(host);

  try {
    const pages = Array.from(host.querySelectorAll('.page, .report-page'));
    if (!pages.length) {
      throw new Error('Nenhuma página encontrada para exportação.');
    }

    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let index = 0; index < pages.length; index += 1) {
      const pageEl = pages[index];
      const canvas = await html2canvas(pageEl, {
        scale: window.devicePixelRatio || 2,
        useCORS: true,
        backgroundColor: '#fff',
      });

      const image = canvas.toDataURL('image/png');
      const ratio = Math.min(pageWidth / canvas.width, pageHeight / canvas.height);
      const imageWidth = canvas.width * ratio;
      const imageHeight = canvas.height * ratio;
      const x = (pageWidth - imageWidth) / 2;
      const y = (pageHeight - imageHeight) / 2;

      if (index > 0) {
        pdf.addPage();
      }

      pdf.addImage(image, 'PNG', x, y, imageWidth, imageHeight);
    }

    pdf.save(fileName);
  } finally {
    document.body.removeChild(host);
  }
}

export default function Report() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [assessment, setAssessment] = useState(null);
  const [remoteReportHtml, setRemoteReportHtml] = useState('');
  const [remoteReportError, setRemoteReportError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isAddingToDossier, setIsAddingToDossier] = useState(false);
  const [exportError, setExportError] = useState('');
  const { access: authAccess } = useAuth();
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    console.info('[Report] runtime context', {
      mode: import.meta.env.MODE,
      apiBaseUrl,
    });
  }, [apiBaseUrl]);

  useEffect(() => {
    const loadAssessment = async () => {
      const assessmentId = searchParams.get('id');
      setIsLoading(true);
      setAssessment(null);
      if (!assessmentId) {
        setAssessment(null);
        setIsLoading(false);
        return;
      }

      if (apiBaseUrl) {
        let shouldFallbackToLegacyReports = false;
        const hasApiSession = Boolean(getApiToken() || authAccess?.email);

        if (!hasApiSession && base44?.__isMock) {
          shouldFallbackToLegacyReports = true;
        } else {
          try {
            setAccessDenied(false);
            console.info('[Report] loading report data', { assessmentId });
            const reportDataPayload = await apiRequest(
              `/assessment/report-data?id=${encodeURIComponent(assessmentId)}`,
              {
                method: 'GET',
                requireAuth: true,
              },
            );

            const reportItem =
              reportDataPayload?.reportItem ||
              (reportDataPayload?.assessment?.id
                ? {
                    assessmentId: reportDataPayload.assessment.id,
                    reportId: reportDataPayload?.report?.id || null,
                    candidateUserId: reportDataPayload?.assessment?.candidateUserId || '',
                    candidateName: reportDataPayload?.assessment?.candidateName || '',
                    candidateEmail: reportDataPayload?.assessment?.candidateEmail || '',
                    createdAt: reportDataPayload?.assessment?.createdAt || null,
                    completedAt: reportDataPayload?.assessment?.completedAt || null,
                    pdfUrl: reportDataPayload?.report?.pdfUrl || null,
                    discProfile: reportDataPayload?.report?.discProfile || null,
                  }
                : null);

            if (reportItem) {
              const reports = mapCandidateReports([reportItem]);
              const matched = findCandidateReportByIdentifier(reports, assessmentId) || reports[0];
              if (matched) {
                setAssessment({
                  ...matched,
                  id: matched?.assessmentId || matched?.id,
                  organizationId:
                    reportDataPayload?.assessment?.organizationId ||
                    matched?.organizationId ||
                    '',
                  workspace_credits: Number(authAccess?.user?.credits ?? 0),
                });
                setIsLoading(false);
                return;
              }
            }

            // Em modo API, se o endpoint respondeu sem reportItem, tratamos como ausência de relatório.
            if (base44?.__isMock) {
              shouldFallbackToLegacyReports = true;
            } else {
              setAssessment(null);
              setIsLoading(false);
              return;
            }
          } catch (error) {
            const status = Number(error?.status);
            const reason = String(error?.message || '').trim().toUpperCase();
            const rawMessage = String(error?.message || '').trim().toLowerCase();
            const shouldFallbackMockFromApiError = Boolean(base44?.__isMock) && (
              !Number.isFinite(status) ||
              status === 0 ||
              reason === 'API_AUTH_MISSING' ||
              reason === 'API_BASE_URL_NOT_CONFIGURED' ||
              rawMessage.includes('failed to fetch') ||
              rawMessage.includes('networkerror')
            );

            if (status === 401 || status === 403) {
              if (base44?.__isMock || reason === 'API_AUTH_MISSING') {
                shouldFallbackToLegacyReports = true;
              } else {
                setAccessDenied(true);
                setAssessment(null);
                setIsLoading(false);
                return;
              }
            } else if (status === 404) {
              shouldFallbackToLegacyReports = true;
            } else if (shouldFallbackMockFromApiError) {
              console.warn('[Report] API unavailable in mock/dev mode, using legacy fallback', {
                status,
                reason,
                message: error?.message,
              });
              shouldFallbackToLegacyReports = true;
            } else {
              console.error('Error loading report data from API:', error);
              setAssessment(null);
              setIsLoading(false);
              return;
            }
          }
        }

        if (shouldFallbackToLegacyReports) {
          try {
            if (hasApiSession) {
              const payload = await apiRequest('/candidate/me/reports', {
                method: 'GET',
                requireAuth: true,
              });

              const reports = mapCandidateReports(payload?.reports || []);
              const matched = findCandidateReportByIdentifier(reports, assessmentId);

              if (matched) {
                setAssessment({
                  ...matched,
                  id: matched?.assessmentId || matched?.id,
                  workspace_credits: Number(authAccess?.user?.credits ?? 0),
                });
                setIsLoading(false);
                return;
              }
            }
          } catch (error) {
            if (Number(error?.status) === 401 || Number(error?.status) === 403) {
              if (!base44?.__isMock) {
                setAccessDenied(true);
                setAssessment(null);
                setIsLoading(false);
                return;
              }
            } else {
              console.error('Error loading assessment from API fallback:', error);
            }
          }
        }

        if (!base44?.__isMock && !shouldFallbackToLegacyReports) {
          setAssessment(null);
          setIsLoading(false);
          return;
        }

        if (!base44?.__isMock && shouldFallbackToLegacyReports) {
            setAssessment(null);
            setIsLoading(false);
            return;
          }
      }

      try {
        setAccessDenied(false);
        const data = await base44.entities.Assessment.filter({ id: assessmentId });
        if (data.length > 0) {
          const foundAssessment = { ...data[0] };
          if (foundAssessment?.workspace_id) {
            try {
              const workspaces = await base44.entities.Workspace.filter({
                id: foundAssessment.workspace_id,
              });
              if (workspaces.length > 0) {
                const workspace = workspaces[0];
                foundAssessment.workspace_name = workspace?.name || '';
                foundAssessment.workspace_credits = Number(workspace?.credits_balance || 0);
                foundAssessment.workspace_branding = {
                  company_name: workspace?.company_name || workspace?.name || 'InsightDISC',
                  logo_url: workspace?.logo_url || '/brand/insightdisc-report-logo.png',
                  brand_primary_color: workspace?.brand_primary_color || '#0b1f3b',
                  brand_secondary_color: workspace?.brand_secondary_color || '#f7b500',
                  report_footer_text:
                    workspace?.report_footer_text ||
                    'InsightDISC - Plataforma de Análise Comportamental',
                };
              }
            } catch {
              // fallback sem branding custom
            }
          }
          const fallbackUser = authAccess?.userId ? null : await base44.auth.me().catch(() => null);
          const access = authAccess?.userId ? authAccess : createAccessContext(fallbackUser);
          const requiresPro = Boolean(
            foundAssessment?.type === 'premium' || foundAssessment?.report_unlocked
          );

          if (!canViewReport(access, foundAssessment, { requiresPro })) {
            setAccessDenied(true);
            setAssessment(null);
          } else {
            setAssessment(foundAssessment);
          }
        }
      } catch (error) {
        console.error('Error loading assessment:', error);
      }

      setIsLoading(false);
    };

    loadAssessment();
  }, [searchParams, authAccess, apiBaseUrl]);

  const hasDiscData = Boolean(
    assessment?.results ||
      assessment?.disc_results ||
      assessment?.disc_profile ||
      assessment?.natural_profile ||
      assessment?.scores
  );

  const reportModel = useMemo(
    () => (assessment && hasDiscData ? buildDiscReportModel(assessment) : null),
    [assessment, hasDiscData]
  );

  const reportHtml = useMemo(
    () =>
      remoteReportHtml ||
      (assessment && reportModel ? renderReportHtml({ assessment, reportModel }) : ''),
    [assessment, reportModel, remoteReportHtml]
  );

  useEffect(() => {
    const fetchRemoteHtml = async () => {
      const assessmentId = assessment?.assessmentId || assessment?.id || '';
      if (!apiBaseUrl || !assessmentId) {
        setRemoteReportHtml('');
        setRemoteReportError('');
        return;
      }

      try {
        setRemoteReportError('');
        const payload = await apiRequest(`/report/${assessmentId}/html`, {
          method: 'GET',
          requireAuth: true,
        });
        if (payload?.html) {
          setRemoteReportHtml(payload.html);
          return;
        }
      } catch (error) {
        if (error?.status === 400) {
          setRemoteReportError(
            error?.payload?.error || error?.message || 'Dados obrigatórios ausentes para gerar relatório.'
          );
        } else if (error?.status === 403) {
          setRemoteReportError('Sem permissão para gerar relatório premium.');
        } else {
          setRemoteReportError('');
        }
      }
      setRemoteReportHtml('');
    };

    fetchRemoteHtml();
  }, [apiBaseUrl, assessment?.assessmentId, assessment?.id]);

  const canExportReport = hasPermission(authAccess, PERMISSIONS.REPORT_EXPORT);
  const hasSuperAdminBypass = isSuperAdminAccess(authAccess);
  const availableCredits = Number(
    assessment?.workspace_credits ??
      authAccess?.user?.credits ??
      0
  );
  const hasCreditsForPremium = hasSuperAdminBypass || availableCredits > 0;
  const canShowExport = Boolean(canExportReport) && hasCreditsForPremium;
  const dossierCandidateId = String(
    assessment?.candidate_user_id ||
      assessment?.candidateUserId ||
      assessment?.candidate_user?.id ||
      assessment?.candidateUser?.id ||
      ''
  ).trim();
  const blockedByRemoteError = Boolean(apiBaseUrl && remoteReportError && !reportModel);
  const canRenderReport = blockedByRemoteError
    ? false
    : Boolean(remoteReportHtml || reportModel);

  const handleAddToDossier = () => {
    const openLinkedDossier = (candidateId, assessmentId) => {
      const params = new URLSearchParams({
        candidateId,
        assessmentId,
      });
      navigate(`/Dossier?${params.toString()}`);
    };

    const run = async () => {
      const assessmentId = resolveAssessmentId();
      if (!assessmentId) {
        setExportError('Não foi possível abrir o dossiê: avaliação sem identificação válida.');
        return;
      }

      trackEvent('dossier_cta_click', {
        source: 'report_header_action',
        path: '/dossie-comportamental',
        assessmentId,
      });

      if (!apiBaseUrl) {
        if (!dossierCandidateId) {
          setExportError('Este avaliado ainda não está vinculado a um usuário para abrir o dossiê.');
          return;
        }
        setExportError('');
        openLinkedDossier(dossierCandidateId, assessmentId);
        return;
      }

      setIsAddingToDossier(true);
      setExportError('');

      try {
        const payload = await apiRequest('/api/dossier/add', {
          method: 'POST',
          requireAuth: true,
          body: {
            assessmentId,
            candidateId: dossierCandidateId || undefined,
            workspaceId:
              assessment?.organizationId ||
              authAccess?.tenantId ||
              authAccess?.workspaceId ||
              authAccess?.user?.active_workspace_id ||
              '',
          },
        });

        const resolvedCandidateId = String(
          payload?.candidate?.id ||
            payload?.assessment?.candidateId ||
            dossierCandidateId ||
            '',
        ).trim();

        if (!resolvedCandidateId) {
          throw new Error('CANDIDATE_ID_REQUIRED');
        }

        toast({
          title: payload?.alreadyLinked ? 'Dossiê já atualizado' : 'Avaliação adicionada ao Dossiê',
          description: payload?.alreadyLinked
            ? 'A avaliação já estava vinculada a este dossiê.'
            : 'A avaliação foi vinculada com sucesso.',
        });

        openLinkedDossier(resolvedCandidateId, assessmentId);
      } catch (error) {
        const reason = String(error?.payload?.error || error?.message || '').toUpperCase();
        const nextMessage =
          reason.includes('ASSESSMENT_ID_REQUIRED')
            ? 'Não foi possível vincular ao dossiê: assessmentId ausente.'
            : reason.includes('CANDIDATE_NOT_FOUND') || reason.includes('CANDIDATE_ID_REQUIRED')
              ? 'Não foi possível localizar o avaliado para vincular este relatório ao dossiê.'
              : reason.includes('ASSESSMENT_NOT_FOUND')
                ? 'Não foi possível localizar a avaliação para vincular ao dossiê.'
                : reason.includes('ASSESSMENT_CANDIDATE_MISMATCH')
                  ? 'Esta avaliação já está vinculada a outro avaliado.'
                  : 'Não foi possível adicionar este relatório ao dossiê agora.';
        setExportError(nextMessage);
      } finally {
        setIsAddingToDossier(false);
      }
    };

    run();
  };

  const exportCSV = (sectionName, rows) => {
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `disc-${sectionName}-${assessment?.id?.slice(0, 8) || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportProfileCSV = () => {
    const natural = reportModel?.charts?.natural || {};
    const adapted = reportModel?.charts?.adapted || {};
    const summary = reportModel?.charts?.summary || {};

    exportCSV('perfil', [
      ['Fator', 'Perfil Natural', 'Perfil Adaptado', 'Perfil Resumo'],
      ['D', natural.D || 0, adapted.D || 0, summary.D || 0],
      ['I', natural.I || 0, adapted.I || 0, summary.I || 0],
      ['S', natural.S || 0, adapted.S || 0, summary.S || 0],
      ['C', natural.C || 0, adapted.C || 0, summary.C || 0],
      ['Dominante', reportModel?.meta?.dominant || '-', '—', '—'],
      ['Secundário', reportModel?.meta?.secondary || '-', '—', '—'],
    ]);
  };

  const exportInsightsCSV = () => {
    const pages = reportModel?.pages || [];
    const profileSummary = pages.find((item) => item.key === 'profile_summary');
    const leadership = pages.find((item) => item.key === 'leadership');
    const communication = pages.find((item) => item.key === 'communication');
    const strengths = pages.find((item) => item.key === 'strengths');
    const risks = pages.find((item) => item.key === 'risks');
    const environment = pages.find((item) => item.key === 'environment');

    exportCSV('insights', [
      ['Categoria', 'Item'],
      ['Resumo', profileSummary?.paragraphs?.[0] || '-'],
      ['Liderança', leadership?.paragraphs?.[0] || '-'],
      ['Comunicação', communication?.paragraphs?.[0] || '-'],
      ...(strengths?.bullets || []).map((item) => ['Força', item]),
      ...(risks?.bullets || []).map((item) => ['Ponto de atenção', item]),
      ['Ambiente ideal', environment?.paragraphs?.[0] || '-'],
    ]);
  };

  const downloadPdfBlob = (blob, fileName) => {
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
  };

  const resolveAssessmentId = () =>
    String(assessment?.assessmentId || assessment?.id || '').trim();

  const resolveApiErrorMessage = (error, fallback = 'Falha ao gerar PDF.') => {
    const status = Number(error?.status || 0);
    const payload = error?.payload || {};
    const reason = String(payload?.reason || payload?.error || error?.message || '').toUpperCase();
    const message = String(payload?.message || '').trim();

    if (status === 401) return 'Sua sessão expirou. Faça login novamente.';
    if (status === 402 || reason.includes('PAYWALL') || reason.includes('CREDIT')) {
      return 'Créditos insuficientes para gerar o PDF.';
    }
    if (status === 403 || reason.includes('FORBIDDEN') || reason.includes('REPORT_EXPORT')) {
      return 'Sua conta não possui permissão para exportar este relatório.';
    }
    if (status === 404 || reason.includes('CANNOT GET') || reason.includes('NOT_FOUND')) {
      return 'Endpoint de PDF indisponível no backend. Verifique o deploy da API.';
    }
    if (reason.includes('PDF_FOLLOW_UP_LOOP')) {
      return 'URL de download inválida retornada pelo backend.';
    }
    if (reason.includes('PDF_INVALID_CONTENT_TYPE') || reason.includes('PDF_JSON_RESPONSE')) {
      return 'Resposta inválida ao baixar PDF. Tente novamente em instantes.';
    }
    if (message && /<html|<!doctype/i.test(message)) {
      return 'Resposta inválida ao baixar PDF. Tente novamente em instantes.';
    }
    if (message) return message;
    return fallback;
  };

  const toApiAbsoluteUrl = (rawUrl = '') => {
    const normalized = String(rawUrl || '').trim();
    if (!normalized) return '';
    if (/^https?:\/\//i.test(normalized)) return normalized;
    if (!apiBaseUrl) return normalized;
    return `${apiBaseUrl}${normalized.startsWith('/') ? '' : '/'}${normalized}`;
  };

  const extractPdfFollowUpUrl = (payload = {}) => {
    const safePayload = payload && typeof payload === 'object' ? payload : {};
    return toApiAbsoluteUrl(
      safePayload?.pdfUrl ||
        safePayload?.pdfPath ||
        safePayload?.report?.pdfUrl ||
        safePayload?.report?.pdfPath ||
        ''
    );
  };

  const fetchPdfEndpoint = async (endpoint, depth = 0, visited = new Set()) => {
    const normalizedEndpoint = String(endpoint || '').trim();
    if (!normalizedEndpoint) {
      const error = new Error('PDF_ENDPOINT_REQUIRED');
      error.status = 400;
      throw error;
    }
    if (visited.has(normalizedEndpoint) || depth > 4) {
      const error = new Error('PDF_FOLLOW_UP_LOOP');
      error.status = 500;
      throw error;
    }
    visited.add(normalizedEndpoint);

    const response = await fetch(normalizedEndpoint, {
      method: 'GET',
      headers: {
        ...getApiAuthHeaders(),
      },
    });
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();

    console.info('[Report] pdf endpoint response', {
      endpoint: normalizedEndpoint,
      status: response.status,
      contentType,
    });

    if (!response.ok) {
      const rawBody = await response.text().catch(() => '');
      let payload = {};
      try {
        payload = rawBody ? JSON.parse(rawBody) : {};
      } catch {
        payload = rawBody ? { message: rawBody.slice(0, 300) } : {};
      }
      const error = new Error(payload?.reason || payload?.error || `HTTP_${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    if (contentType.includes('application/json')) {
      const payload = await response.json().catch(() => ({}));
      const nextPdfUrl = extractPdfFollowUpUrl(payload);
      if (nextPdfUrl && depth < 4) {
        console.info('[Report] pdf endpoint returned JSON with pdfUrl, retrying', {
          nextPdfUrl,
          depth,
        });
        return fetchPdfEndpoint(nextPdfUrl, depth + 1, visited);
      }
      const error = new Error(payload?.reason || payload?.error || 'PDF_JSON_RESPONSE');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }

    const blob = await response.blob();
    if (!blob || blob.size === 0) {
      const error = new Error('PDF_EMPTY');
      error.status = 503;
      throw error;
    }

    if (!contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
      const bodyText = await blob.text().catch(() => '');
      const error = new Error('PDF_INVALID_CONTENT_TYPE');
      error.status = 500;
      error.payload = {
        message:
          bodyText && bodyText.length < 800
            ? bodyText
            : 'Resposta inválida ao baixar PDF.',
      };
      throw error;
    }

    return blob;
  };

  const downloadTierPdfFromApi = async (reportType = 'standard') => {
    const assessmentId = resolveAssessmentId();
    if (!assessmentId) {
      const error = new Error('ASSESSMENT_ID_REQUIRED');
      error.status = 400;
      throw error;
    }

    const authHeaders = getApiAuthHeaders();
    if (!authHeaders.Authorization && !authHeaders['x-insight-user-email']) {
      const error = new Error('API_AUTH_MISSING');
      error.status = 401;
      throw error;
    }

    const params = new URLSearchParams({
      assessmentId,
      type: reportType,
    });
    const endpoint = toApiAbsoluteUrl(`/assessment/report-pdf?${params.toString()}`);
    console.info('[Report] downloading pdf', {
      assessmentId,
      reportType,
      endpoint,
    });

    try {
      const blob = await fetchPdfEndpoint(endpoint);
      downloadPdfBlob(
        blob,
        `insightdisc-relatorio-${reportType}-${assessmentId || 'export'}.pdf`
      );
      return;
    } catch (error) {
      const status = Number(error?.status || 0);
      const reason = String(error?.message || '').toUpperCase();
      const shouldTryFallback =
        status === 404 ||
        status === 405 ||
        reason.includes('PDF_INVALID_CONTENT_TYPE') ||
        reason.includes('PDF_JSON_RESPONSE');
      if (!shouldTryFallback) {
        throw error;
      }
    }

    console.info('[Report] /assessment/report-pdf not available, trying regeneration fallback', {
      assessmentId,
      reportType,
    });

    const generated = await apiRequest('/assessment/generate-report', {
      method: 'POST',
      requireAuth: true,
      body: {
        assessmentId,
        type: reportType,
      },
    });

    const generatedPdfUrl = String(
      generated?.pdfUrl || generated?.pdfPath || generated?.report?.pdfUrl || generated?.report?.pdfPath || ''
    ).trim();
    const regeneratedEndpoint = generatedPdfUrl ? toApiAbsoluteUrl(generatedPdfUrl) : endpoint;
    console.info('[Report] regeneration payload', {
      assessmentId,
      reportType,
      regeneratedEndpoint,
      generatedPdfUrl,
    });
    const blob = await fetchPdfEndpoint(regeneratedEndpoint);

    downloadPdfBlob(
      blob,
      `insightdisc-relatorio-${reportType}-${assessmentId || 'export'}.pdf`
    );
  };

  const handleDownloadByType = async (reportType = 'standard') => {
    if (!assessment) return;
    if (!canShowExport) {
      setExportError(
        canExportReport
          ? 'Créditos insuficientes para exportar relatório.'
          : 'Sem permissão para exportar relatório.'
      );
      return;
    }

    setIsPreparingPdf(true);
    setExportError('');

    try {
      if (apiBaseUrl) {
        await downloadTierPdfFromApi(reportType);
        return;
      }

      const localTierModel = {
        ...(reportModel || {}),
        reportType,
        meta: {
          ...(reportModel?.meta || {}),
          reportType,
        },
      };
      const localTierHtml = renderReportHtml({
        assessment,
        reportModel: localTierModel,
      });
      await exportLocalPdfFromHtml(
        localTierHtml,
        `insightdisc-relatorio-${reportType}-${assessment?.id || 'export'}.pdf`
      );
    } catch (error) {
      if (error?.status === 403) {
        setExportError('Sem permissão para exportar relatório.');
        return;
      }
      setExportError(resolveApiErrorMessage(error, 'Falha ao gerar PDF.'));
      console.error('[Report] pdf download failed', {
        reportType,
        assessmentId: resolveAssessmentId(),
        status: error?.status,
        payload: error?.payload,
        message: error?.message,
      });
    } finally {
      setIsPreparingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full min-w-0 min-h-[60vh] flex items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!assessment || !canRenderReport) {
    const title = accessDenied ? 'Acesso negado' : 'Relatório não encontrado';
    const message = accessDenied
      ? 'Sua conta não possui permissão para visualizar este relatório. Se você é Admin do tenant, verifique se o relatório pertence ao mesmo workspace.'
      : remoteReportError || 'O assessment não possui dados suficientes para gerar o relatório premium.';

    return (
      <div className="w-full min-w-0 min-h-[60vh] flex items-center justify-center bg-slate-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">{title}</h1>
          {message && <p className="text-slate-500 mb-4">{message}</p>}
          <Link to={createPageUrl('Dashboard')}>
            <Button className="bg-indigo-600 hover:bg-indigo-700">Voltar ao Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Relatório DISC</h1>
                <p className="text-sm text-slate-500">
                  Gerado em{' '}
                  {reportModel?.meta?.generatedAt
                    ? new Date(reportModel.meta.generatedAt).toLocaleDateString('pt-BR')
                    : assessment?.completed_at
                      ? new Date(assessment.completed_at).toLocaleDateString('pt-BR')
                      : '-'}
                </p>
                {hasSuperAdminBypass ? (
                  <p className="text-xs font-semibold text-amber-700 mt-1">SUPER ADMIN — ACESSO TOTAL</p>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <Button
                onClick={handleAddToDossier}
                variant="outline"
                className="rounded-xl"
                disabled={!resolveAssessmentId() || isAddingToDossier}
              >
                {isAddingToDossier ? 'Vinculando...' : 'Adicionar ao Dossiê'}
              </Button>
              {canShowExport ? (
                <>
                <Button onClick={exportInsightsCSV} variant="outline" className="rounded-xl hidden sm:inline-flex">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  CSV Insights
                </Button>
                <Button onClick={exportProfileCSV} variant="outline" className="rounded-xl hidden sm:inline-flex">
                  <Download className="w-4 h-4 mr-2" />
                  CSV Perfil
                </Button>
                <Button
                  onClick={() => handleDownloadByType('standard')}
                  disabled={isPreparingPdf}
                  variant="outline"
                  className="rounded-xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isPreparingPdf ? 'Preparando...' : 'Baixar Relatório DISC Completo'}
                </Button>
                <Button
                  onClick={() => handleDownloadByType('premium')}
                  disabled={isPreparingPdf}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isPreparingPdf ? 'Preparando...' : 'Baixar Relatório DISC Premium'}
                </Button>
                </>
              ) : null}
            </div>
          </div>
          {exportError ? (
            <p className="mt-2 text-sm text-red-600">{exportError}</p>
          ) : null}
          {canExportReport && !hasCreditsForPremium ? (
            <div className="mt-3">
              <CreditPaywallCard
                title="Exportação bloqueada por falta de créditos"
                description="Compre créditos para gerar e baixar o PDF premium."
              />
            </div>
          ) : null}
        </div>
      </header>

      <main className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <iframe
            title="Prévia do relatório"
            srcDoc={reportHtml}
            className="w-full h-[80vh] border-0"
          />
        </div>

        <div className="mt-8">
          {dossierCandidateId || apiBaseUrl ? (
            <Button variant="outline" onClick={handleAddToDossier} disabled={!resolveAssessmentId() || isAddingToDossier}>
              {isAddingToDossier ? 'Vinculando...' : 'Abrir Dossiê Comportamental'}
            </Button>
          ) : (
            <Link
              to="/dossie-comportamental"
              className="btn-secondary inline-flex"
              onClick={() =>
                trackEvent('dossier_cta_click', {
                  source: 'report_footer_link',
                  path: '/dossie-comportamental',
                  assessmentId: resolveAssessmentId(),
                })
              }
            >
              <Button variant="outline">Conhecer Dossiê Comportamental</Button>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
