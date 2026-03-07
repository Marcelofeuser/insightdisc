import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { base44 } from '@/api/base44Client';
import { buildDiscReportModel } from '@/modules/disc/discReportBuilder';
import { renderReportHtml } from '@/reports/renderers/renderReportHtml';
import { createPageUrl } from '@/utils';

const CANDIDATE_JWT_KEY = 'candidate_jwt';

function getCandidateJwt() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(CANDIDATE_JWT_KEY) || '';
}

function normalizeAssessmentFromApi(assessment, discProfile, report) {
  const normalized = discProfile?.normalized || discProfile?.natural || discProfile?.scores || {};
  const dominant = discProfile?.dominant || discProfile?.primary || 'D';
  const secondary = discProfile?.secondary || discProfile?.secondaryFactor || 'I';

  return {
    id: assessment?.id,
    respondent_name: assessment?.candidateName || '',
    respondent_email: assessment?.candidateEmail || '',
    candidateName: assessment?.candidateName || '',
    candidateEmail: assessment?.candidateEmail || '',
    completed_at: assessment?.completedAt || null,
    status: assessment?.status || 'completed',
    results: {
      natural_profile: normalized,
      adapted_profile: normalized,
      summary_profile: normalized,
      dominant_factor: dominant,
      secondary_factor: secondary,
    },
    disc_results: {
      natural: normalized,
      adapted: normalized,
      summary: normalized,
      dominant_factor: dominant,
      secondary_factor: secondary,
    },
    report_unlocked: true,
    branding: assessment?.branding || null,
    report_pdf_url: report?.pdfUrl || '',
  };
}

async function exportLocalPdfFromHtml(html, fileName) {
  const parser = new DOMParser();
  const parsed = parser.parseFromString(html, 'text/html');

  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-100000px';
  host.style.top = '0';
  host.style.width = '210mm';

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

export default function CandidateReport() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();

  const assessmentId = params.get('id') || '';
  const token = params.get('token') || '';
  const apiBaseUrl = getApiBaseUrl();

  const [assessment, setAssessment] = useState(null);
  const [remoteReportModel, setRemoteReportModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [isSavingToPortal, setIsSavingToPortal] = useState(false);
  const [availablePdfUrl, setAvailablePdfUrl] = useState('');

  const [showClaim, setShowClaim] = useState(false);
  const [claimMode, setClaimMode] = useState('register'); // register | login
  const [claimName, setClaimName] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [claimPassword, setClaimPassword] = useState('');
  const [claimError, setClaimError] = useState('');
  const [claiming, setClaiming] = useState(false);

  const resolvePdfUrl = (rawPdfUrl) => {
    const raw = String(rawPdfUrl || '').trim();
    if (!raw) return '';
    return /^https?:\/\//i.test(raw) ? raw : apiBaseUrl ? `${apiBaseUrl}${raw}` : raw;
  };

  const isPremiumReportModel = (model) =>
    Boolean(
      model &&
        typeof model === 'object' &&
        model?.meta?.totalPages >= 20 &&
        model?.participant?.name &&
        model?.profile?.key
    );

  const getAuthenticatedPortalToken = () => {
    const appToken = getApiToken();
    if (appToken) return appToken;
    return getCandidateJwt();
  };

  useEffect(() => {
    const loadReport = async () => {
      setLoading(true);
      setLoadError('');

      try {
        setRemoteReportModel(null);
        if (apiBaseUrl && token) {
          const payload = await apiRequest(`/assessment/report-by-token?token=${encodeURIComponent(token)}`);
          const normalizedAssessment = normalizeAssessmentFromApi(
            payload?.assessment,
            payload?.report?.discProfile,
            payload?.report
          );
          if (
            normalizedAssessment?.branding?.logo_url &&
            normalizedAssessment.branding.logo_url.startsWith('/')
          ) {
            normalizedAssessment.branding.logo_url = `${apiBaseUrl}${normalizedAssessment.branding.logo_url}`;
          }
          setAvailablePdfUrl(resolvePdfUrl(payload?.report?.pdfUrl));
          if (isPremiumReportModel(payload?.report?.discProfile)) {
            setRemoteReportModel(payload.report.discProfile);
          }
          setAssessment(normalizedAssessment);
          setClaimName(normalizedAssessment.respondent_name || '');
          setClaimEmail(normalizedAssessment.respondent_email || '');
          return;
        }

        if (apiBaseUrl && assessmentId) {
          const candidateJwt = getCandidateJwt();
          if (candidateJwt) {
            try {
              const payload = await apiRequest('/candidate/me/reports', {
                token: candidateJwt,
              });

              const matched = (payload?.reports || []).find((item) => item.assessmentId === assessmentId);
              if (matched) {
                const normalizedAssessment = normalizeAssessmentFromApi(
                  {
                    id: matched.assessmentId,
                    candidateName: matched.candidateName,
                    candidateEmail: matched.candidateEmail,
                    status: 'completed',
                    completedAt: matched.completedAt,
                  },
                  matched.discProfile,
                  { pdfUrl: matched.pdfUrl }
                );

                setAvailablePdfUrl(resolvePdfUrl(matched?.pdfUrl));
                if (isPremiumReportModel(matched?.discProfile)) {
                  setRemoteReportModel(matched.discProfile);
                }
                setAssessment(normalizedAssessment);
                setClaimName(normalizedAssessment.respondent_name || '');
                setClaimEmail(normalizedAssessment.respondent_email || '');
                return;
              }
            } catch {
              // fallback local abaixo
            }
          }
        }

        if (!assessmentId) {
          throw new Error('Parâmetros de relatório ausentes.');
        }

        const localAssessments = await base44.entities.Assessment.filter({ id: assessmentId });
        if (!localAssessments.length) {
          throw new Error('Relatório não encontrado.');
        }

        const localAssessment = { ...localAssessments[0] };
        if (localAssessment?.workspace_id) {
          try {
            const workspaces = await base44.entities.Workspace.filter({ id: localAssessment.workspace_id });
            if (workspaces.length > 0) {
              const workspace = workspaces[0];
              localAssessment.workspace_name = workspace?.name || '';
              localAssessment.branding = {
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
            // segue fallback padrão
          }
        }

        setAvailablePdfUrl(resolvePdfUrl(localAssessment?.report_pdf_url || localAssessment?.pdf_url));
        setAssessment(localAssessment);
        setClaimName(localAssessment?.respondent_name || '');
        setClaimEmail(localAssessment?.respondent_email || '');
      } catch (error) {
        setLoadError(error?.message || 'Não foi possível carregar o relatório.');
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [assessmentId, apiBaseUrl, token]);

  const reportModel = useMemo(
    () => (remoteReportModel || (assessment ? buildDiscReportModel(assessment) : null)),
    [remoteReportModel, assessment]
  );

  const reportHtml = useMemo(
    () => (assessment && reportModel ? renderReportHtml({ assessment, reportModel }) : ''),
    [assessment, reportModel]
  );

  const ensurePublicPdfUrl = async () => {
    if (availablePdfUrl) {
      return availablePdfUrl;
    }

    if (!apiBaseUrl || !token) {
      return '';
    }

    console.log('[CandidateReport] ensurePublicPdfUrl:start', {
      assessmentId: assessment?.id || assessmentId,
      hasToken: Boolean(token),
    });

    const payload = await apiRequest(
      `/assessment/report-pdf-by-token?token=${encodeURIComponent(token)}`,
      { method: 'GET' }
    );

    const resolvedPdfUrl = resolvePdfUrl(payload?.pdfUrl || payload?.pdfPath || '');
    if (!resolvedPdfUrl) {
      throw new Error('PDF indisponível no momento.');
    }

    setAvailablePdfUrl(resolvedPdfUrl);
    console.log('[CandidateReport] ensurePublicPdfUrl:done', {
      assessmentId: payload?.assessmentId || assessment?.id || assessmentId,
      pdfUrl: resolvedPdfUrl,
    });

    return resolvedPdfUrl;
  };

  const claimReport = async () => {
    setClaimError('');

    if (!apiBaseUrl) {
      setClaimError('Este ambiente não possui backend configurado para salvar relatório.');
      return;
    }

    const resolvedAssessmentId = assessment?.id || assessmentId;
    if (!token || !resolvedAssessmentId) {
      setClaimError('Token ausente para vincular este relatório.');
      return;
    }

    setClaiming(true);

    try {
      let authToken = getCandidateJwt();

      if (claimMode === 'register') {
        try {
          const registerPayload = await apiRequest('/candidate/register', {
            method: 'POST',
            body: {
              email: claimEmail,
              password: claimPassword,
              name: claimName || 'Candidato',
            },
          });
          if (registerPayload?.token) {
            authToken = registerPayload.token;
          }
        } catch (registerError) {
          const reason = String(
            registerError?.payload?.reason || registerError?.message || ''
          ).toUpperCase();
          if (!reason.includes('EMAIL_EXISTS')) {
            throw registerError;
          }
        }
      }

      if (!authToken || claimMode === 'login') {
        const loginPayload = await apiRequest('/candidate/login', {
          method: 'POST',
          body: {
            email: claimEmail,
            password: claimPassword,
          },
        });
        if (!loginPayload?.token) {
          throw new Error('Não foi possível autenticar sua conta.');
        }
        authToken = loginPayload.token;
      }

      const payload = await apiRequest('/candidate/claim-report', {
        method: 'POST',
        token: authToken,
        body: {
          token,
          assessmentId: resolvedAssessmentId,
          email: claimEmail,
          password: claimPassword,
          name: claimName,
        },
      });

      if (!payload?.ok) {
        throw new Error(payload?.error || payload?.reason || 'Falha ao salvar relatório.');
      }

      window.localStorage.setItem(CANDIDATE_JWT_KEY, payload?.token || authToken);
      setShowClaim(false);
      toast({
        title: 'Relatório vinculado',
        description: 'Seu relatório foi salvo com sucesso no seu portal.',
      });

      if (getApiToken()) {
        navigate(createPageUrl('MyAssessments'));
        return;
      }

      navigate('/c/portal');
    } catch (error) {
      setClaimError(error?.message || 'Falha ao salvar relatório.');
    } finally {
      setClaiming(false);
    }
  };

  const downloadPdf = async () => {
    if (!assessment || !reportHtml) return;

    console.log('[CandidateReport] download click', {
      assessmentId: assessment?.id || assessmentId,
      hasToken: Boolean(token),
      hasApi: Boolean(apiBaseUrl),
    });

    setIsPreparingPdf(true);
    try {
      if (apiBaseUrl && token) {
        const publicPdfUrl = await ensurePublicPdfUrl();
        if (publicPdfUrl) {
          const anchor = document.createElement('a');
          anchor.href = publicPdfUrl;
          anchor.target = '_blank';
          anchor.rel = 'noreferrer';
          anchor.download = `insightdisc-relatorio-${assessment?.id || 'export'}.pdf`;
          document.body.appendChild(anchor);
          anchor.click();
          document.body.removeChild(anchor);

          toast({
            title: 'Download concluído',
            description: 'Relatório salvo em PDF no seu dispositivo.',
          });
          return;
        }
      }

      await exportLocalPdfFromHtml(reportHtml, `insightdisc-relatorio-${assessment?.id || 'export'}.pdf`);
      toast({
        title: 'Download concluído',
        description: 'Relatório salvo em PDF no seu dispositivo.',
      });
      console.log('[CandidateReport] download done', { assessmentId: assessment?.id || assessmentId });
    } catch (error) {
      console.error('[CandidateReport] download failed', error);
      toast({
        variant: 'destructive',
        title: 'Falha ao baixar relatório',
        description: error?.message || 'Não foi possível gerar o PDF agora.',
      });
    } finally {
      setIsPreparingPdf(false);
    }
  };

  const saveToPortal = async () => {
    const resolvedAssessmentId = assessment?.id || assessmentId;
    if (!token || !resolvedAssessmentId) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível salvar no portal',
        description: 'Token ou identificação do relatório ausente.',
      });
      return;
    }

    setIsSavingToPortal(true);
    try {
      if (!apiBaseUrl) {
        const isAuthenticated = typeof base44?.auth?.isAuthenticated === 'function'
          ? await base44.auth.isAuthenticated()
          : false;

        if (!isAuthenticated) {
          toast({
            variant: 'destructive',
            title: 'Faça login primeiro',
            description: 'Entre na sua conta para salvar este relatório no portal.',
          });
          return;
        }

        const currentUser = typeof base44?.auth?.me === 'function' ? await base44.auth.me() : null;
        const resolvedUserId = currentUser?.email || currentUser?.id;
        if (!resolvedUserId) {
          throw new Error('Usuário autenticado não encontrado.');
        }

        await base44.entities.Assessment.update(resolvedAssessmentId, {
          user_id: resolvedUserId,
          respondent_email: assessment?.respondent_email || currentUser?.email || '',
          respondent_name: assessment?.respondent_name || currentUser?.full_name || currentUser?.name || '',
        });

        toast({
          title: 'Relatório salvo no portal',
          description: 'Seu relatório foi vinculado com sucesso à sua conta.',
        });

        navigate(createPageUrl('MyAssessments'));
        return;
      }

      const authToken = getAuthenticatedPortalToken();
      if (!authToken) {
        setClaimError('');
        setClaimMode('register');
        setShowClaim(true);
        return;
      }

      const payload = await apiRequest('/candidate/claim-report', {
        method: 'POST',
        token: authToken,
        body: {
          token,
          assessmentId: resolvedAssessmentId,
        },
      });

      if (!payload?.ok) {
        throw new Error(payload?.error || payload?.reason || 'Falha ao vincular relatório.');
      }

      toast({
        title: 'Relatório salvo no portal',
        description: 'Seu relatório foi vinculado com sucesso à sua conta.',
      });

      if (getApiToken()) {
        navigate(createPageUrl('MyAssessments'));
      } else {
        navigate('/c/portal');
      }
    } catch (error) {
      console.error('[CandidateReport] saveToPortal failed', error);
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar no portal',
        description: error?.message || 'Não foi possível vincular o relatório.',
      });
    } finally {
      setIsSavingToPortal(false);
    }
  };

  if (loading) {
    return <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">Carregando relatório...</div>;
  }

  if (loadError || !assessment) {
    return (
      <div className="rounded-xl border bg-white p-6 text-sm text-slate-700">
        {loadError || 'Relatório não encontrado.'}
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="candidate-report-container">
      <div className="rounded-xl border bg-white p-4 flex flex-wrap gap-2 items-center justify-between">
        <div>
          <div className="font-semibold text-slate-900">Relatório DISC</div>
          <div className="text-xs text-slate-500">
            Respondente: {assessment?.respondent_name || assessment?.candidateName || 'Participante'}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={downloadPdf}
            className="rounded-lg bg-slate-900 text-white hover:bg-slate-800"
            disabled={isPreparingPdf || isSavingToPortal}
            data-testid="candidate-report-download-pdf"
          >
            <Download className="w-4 h-4 mr-2" />
            {isPreparingPdf ? 'Preparando...' : 'Baixar PDF'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={saveToPortal}
            disabled={isPreparingPdf || isSavingToPortal}
            className="rounded-lg"
            data-testid="candidate-report-save-portal"
          >
            {isSavingToPortal ? 'Salvando...' : 'Salvar no meu portal'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <iframe
          title="Prévia do relatório do candidato"
          srcDoc={reportHtml}
          className="w-full h-[80vh] border-0"
        />
      </div>

      {showClaim ? (
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="font-semibold text-slate-900">Salvar no meu perfil</div>
          <p className="text-sm text-slate-600">
            Crie uma conta ou faça login para vincular este relatório ao seu portal.
          </p>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={claimMode === 'register' ? 'default' : 'outline'}
              onClick={() => setClaimMode('register')}
              className="rounded-lg"
            >
              Criar conta
            </Button>
            <Button
              type="button"
              variant={claimMode === 'login' ? 'default' : 'outline'}
              onClick={() => setClaimMode('login')}
              className="rounded-lg"
            >
              Já tenho conta
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            {claimMode === 'register' ? (
              <div>
                <label className="text-xs text-slate-500">Nome</label>
                <input className="w-full rounded-lg border px-3 py-2" value={claimName} onChange={(event) => setClaimName(event.target.value)} />
              </div>
            ) : null}
            <div>
              <label className="text-xs text-slate-500">E-mail</label>
              <input type="email" className="w-full rounded-lg border px-3 py-2" value={claimEmail} onChange={(event) => setClaimEmail(event.target.value)} />
            </div>
            <div className={claimMode === 'register' ? 'md:col-span-2' : ''}>
              <label className="text-xs text-slate-500">Senha (mín. 8 caracteres)</label>
              <input type="password" className="w-full rounded-lg border px-3 py-2" value={claimPassword} onChange={(event) => setClaimPassword(event.target.value)} />
            </div>
          </div>

          {claimError ? <div className="text-sm text-red-600">{claimError}</div> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setShowClaim(false)} className="rounded-lg">Cancelar</Button>
            <Button
              type="button"
              onClick={claimReport}
              disabled={
                claiming ||
                !claimEmail ||
                claimPassword.length < 8 ||
                (claimMode === 'register' && !claimName)
              }
              className="rounded-lg bg-slate-900 text-white hover:bg-slate-800"
            >
              {claiming ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
