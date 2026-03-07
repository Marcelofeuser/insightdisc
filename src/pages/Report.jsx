import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { ArrowLeft, Download, FileSpreadsheet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest, getApiBaseUrl } from '@/lib/apiClient';
import CreditPaywallCard from '@/components/billing/CreditPaywallCard';
import {
  PERMISSIONS,
  canViewReport,
  createAccessContext,
  hasPermission,
  isSuperAdminAccess,
} from '@/modules/auth/access-control';
import { buildDiscReportModel } from '@/modules/disc/discReportBuilder';
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
  const [searchParams] = useSearchParams();
  const [assessment, setAssessment] = useState(null);
  const [remoteReportHtml, setRemoteReportHtml] = useState('');
  const [remoteReportError, setRemoteReportError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState('');
  const [exportError, setExportError] = useState('');
  const { access: authAccess } = useAuth();
  const apiBaseUrl = getApiBaseUrl();

  useEffect(() => {
    const loadAssessment = async () => {
      const assessmentId = searchParams.get('id');

      if (assessmentId) {
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
      }

      setIsLoading(false);
    };

    loadAssessment();
  }, [searchParams, authAccess]);

  const hasDiscData = Boolean(
    assessment?.results ||
      assessment?.disc_results ||
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
      if (!apiBaseUrl || !assessment?.id) {
        setRemoteReportHtml('');
        setRemoteReportError('');
        return;
      }

      try {
        setRemoteReportError('');
        const payload = await apiRequest(`/report/${assessment.id}/html`, {
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
  }, [apiBaseUrl, assessment?.id]);

  const canExportReport = hasPermission(authAccess, PERMISSIONS.REPORT_EXPORT);
  const hasSuperAdminBypass = isSuperAdminAccess(authAccess);
  const availableCredits = Number(
    assessment?.workspace_credits ??
      authAccess?.user?.credits ??
      0
  );
  const hasCreditsForPremium = hasSuperAdminBypass || availableCredits > 0;
  const canShowExport = Boolean(canExportReport) && hasCreditsForPremium;
  const blockedByRemoteError = Boolean(apiBaseUrl && remoteReportError);
  const canRenderReport = blockedByRemoteError
    ? false
    : Boolean(remoteReportHtml || reportModel);

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

  const resolveAbsolutePdfUrl = (rawPdfUrl) => {
    if (!rawPdfUrl) return '';
    return /^https?:\/\//i.test(rawPdfUrl) ? rawPdfUrl : `${apiBaseUrl}${rawPdfUrl}`;
  };

  const generatePdfOnServer = async () => {
    const payload = await apiRequest('/report/generate', {
      method: 'POST',
      body: { assessmentId: assessment.id },
      requireAuth: true,
    });

    const rawPdfUrl = payload?.pdfUrl || payload?.report?.pdfUrl || '';
    const absolutePdfUrl = resolveAbsolutePdfUrl(rawPdfUrl);
    if (!absolutePdfUrl) {
      throw new Error('PDF_URL_MISSING');
    }

    setGeneratedPdfUrl(absolutePdfUrl);
    return absolutePdfUrl;
  };

  const handleGeneratePdf = async () => {
    if (!assessment || !reportHtml) return;
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
        const absolutePdfUrl = await generatePdfOnServer();
        setGeneratedPdfUrl(absolutePdfUrl);
        return;
      }

      await exportLocalPdfFromHtml(
        reportHtml,
        `insightdisc-relatorio-${assessment?.id || 'export'}.pdf`
      );
    } catch (error) {
      if (error?.status === 403) {
        setExportError('Sem permissão para exportar relatório.');
        return;
      }

      setExportError('Falha ao gerar PDF.');
      console.error('[Report] generate PDF failed', error);
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!assessment || !reportHtml) return;
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
      if (generatedPdfUrl) {
        window.open(generatedPdfUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      if (apiBaseUrl) {
        const absolutePdfUrl = await generatePdfOnServer();
        window.open(absolutePdfUrl, '_blank', 'noopener,noreferrer');
        return;
      }

      await exportLocalPdfFromHtml(
        reportHtml,
        `insightdisc-relatorio-${assessment?.id || 'export'}.pdf`
      );
    } catch (error) {
      if (error?.status === 403) {
        setExportError('Sem permissão para exportar relatório.');
        return;
      }

      setExportError('Falha ao gerar PDF.');
      console.error('[Report] download PDF failed', error);
    } finally {
      setIsPreparingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
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
    <div className="min-h-screen bg-slate-50">
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

            {canShowExport ? (
              <div className="flex items-center gap-3 flex-wrap">
                <Button onClick={exportInsightsCSV} variant="outline" className="rounded-xl hidden sm:inline-flex">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  CSV Insights
                </Button>
                <Button onClick={exportProfileCSV} variant="outline" className="rounded-xl hidden sm:inline-flex">
                  <Download className="w-4 h-4 mr-2" />
                  CSV Perfil
                </Button>
                <Button
                  onClick={handleGeneratePdf}
                  disabled={isPreparingPdf}
                  variant="outline"
                  className="rounded-xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isPreparingPdf ? 'Gerando PDF...' : 'Gerar PDF'}
                </Button>
                {generatedPdfUrl ? (
                  <a href={generatedPdfUrl} target="_blank" rel="noreferrer">
                    <Button variant="outline" className="rounded-xl">
                      <Download className="w-4 h-4 mr-2" />
                      Abrir PDF
                    </Button>
                  </a>
                ) : null}
                <Button
                  onClick={handleDownloadPdf}
                  disabled={isPreparingPdf}
                  className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isPreparingPdf ? 'Preparando...' : 'Baixar PDF'}
                </Button>
              </div>
            ) : null}
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

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          <iframe
            title="Prévia do relatório"
            srcDoc={reportHtml}
            className="w-full h-[80vh] border-0"
          />
        </div>
      </main>
    </div>
  );
}
