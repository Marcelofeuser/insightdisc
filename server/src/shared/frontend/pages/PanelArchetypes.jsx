import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/ui/EmptyState';
import PanelState from '@/components/ui/PanelState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { mapCandidateReports } from '@/modules/report/backendReports';
import { buildAssessmentResultPath } from '@/modules/assessmentResult/routes';

const ARCHETYPES_BY_FACTOR = {
  D: [
    {
      title: 'Condutor Estratégico',
      summary: 'Assume direção com rapidez e mobiliza ação quando o contexto exige decisão.',
      meaning: 'Arquétipo orientado a resultado, com alto senso de prioridade e ritmo forte de execução.',
    },
    {
      title: 'Executor de Desafios',
      summary: 'Transforma pressão em foco e tende a prosperar em cenários competitivos.',
      meaning: 'Útil para frentes de virada, negociação e metas ambiciosas com prazo curto.',
    },
  ],
  I: [
    {
      title: 'Conector de Pessoas',
      summary: 'Constrói adesão por comunicação clara, energia social e presença relacional.',
      meaning: 'Arquétipo que fortalece engajamento, clima e influência em rede.',
    },
    {
      title: 'Catalisador de Engajamento',
      summary: 'Converte ideias em movimento ao envolver diferentes perfis na mesma narrativa.',
      meaning: 'Muito útil para vendas consultivas, liderança inspiradora e contextos de mudança.',
    },
  ],
  S: [
    {
      title: 'Guardião de Estabilidade',
      summary: 'Mantém constância operacional e segurança relacional em cenários de longo prazo.',
      meaning: 'Arquétipo centrado em confiança, previsibilidade e colaboração sustentável.',
    },
    {
      title: 'Construtor de Confiança',
      summary: 'Promove coesão do time por escuta, apoio e manutenção de acordos.',
      meaning: 'Relevante para áreas que dependem de continuidade, suporte e alinhamento fino.',
    },
  ],
  C: [
    {
      title: 'Arquiteto Analítico',
      summary: 'Organiza decisões com base em critérios, dados e controle de qualidade.',
      meaning: 'Arquétipo voltado para precisão técnica, redução de risco e melhoria de processo.',
    },
    {
      title: 'Curador de Qualidade',
      summary: 'Estrutura padrões e consistência para elevar confiabilidade de entrega.',
      meaning: 'Muito útil em operações críticas, compliance e contextos que exigem excelência técnica.',
    },
  ],
};

function toText(value) {
  return String(value || '').trim();
}

function toUpper(value) {
  return toText(value).toUpperCase();
}

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
}

function resolveDominantFactor(report = {}) {
  const candidates = [
    report?.dominantFactor,
    report?.results?.dominant_factor,
    report?.disc_results?.dominant_factor,
    report?.discProfile?.dominant,
    report?.discProfile?.primary,
  ];

  for (const value of candidates) {
    const factor = toUpper(value);
    if (['D', 'I', 'S', 'C'].includes(factor)) {
      return factor;
    }
  }

  const profile = toUpper(report?.profileKey || report?.discProfile?.code || '');
  if (profile && ['D', 'I', 'S', 'C'].includes(profile[0])) {
    return profile[0];
  }

  return 'D';
}

function normalizeReport(report = {}, index = 0) {
  const id = toText(report?.assessmentId || report?.id || `report-${index}`);
  const profileKey = toUpper(report?.profileKey || report?.discProfile?.code || report?.profile_code || '');

  return {
    id,
    assessmentId: id,
    respondentName: toText(
      report?.respondent_name ||
        report?.candidate_name ||
        report?.candidateName ||
        report?.lead_name ||
        report?.lead_email ||
        report?.candidateEmail ||
        'Participante',
    ),
    candidateEmail: toText(report?.lead_email || report?.candidateEmail || report?.user_email || ''),
    completedAt: report?.completed_at || report?.completedAt || report?.created_date || report?.createdAt || null,
    type: toText(report?.reportType || report?.report_type || report?.type || 'business').toLowerCase(),
    profileKey,
    dominantFactor: resolveDominantFactor(report),
    pdfUrl: toText(report?.publicPdfUrl || report?.pdfUrl || report?.pdf_url || ''),
  };
}

function scoreTypeLabel(type = '') {
  const key = String(type || '').toLowerCase();
  if (!key) return '-';
  if (key === 'professional') return 'Professional';
  if (key === 'personal') return 'Personal';
  if (key === 'business') return 'Business';
  return key.charAt(0).toUpperCase() + key.slice(1);
}

function resolveArchetypes(report = {}) {
  const dominant = resolveDominantFactor(report);
  const profileKey = toUpper(report?.profileKey || '');
  const secondary = ['D', 'I', 'S', 'C'].includes(profileKey?.[1]) ? profileKey[1] : '';

  const dominantSet = ARCHETYPES_BY_FACTOR[dominant] || [];
  const complementary = secondary && secondary !== dominant
    ? (ARCHETYPES_BY_FACTOR[secondary] || []).slice(0, 1)
    : [];

  return {
    dominant,
    secondary,
    items: [...dominantSet, ...complementary],
  };
}

function slugify(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
}

async function exportArchetypesPdf(report = {}) {
  const { dominant, secondary, items } = resolveArchetypes(report);
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  const margin = 44;
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
  let cursorY = margin;

  const ensureSpace = (extra = 18) => {
    if (cursorY + extra <= pageHeight - margin) return;
    doc.addPage();
    cursorY = margin;
  };

  const writeParagraph = ({ text, size = 11, weight = 'normal', gap = 16 }) => {
    const safeText = toText(text);
    if (!safeText) return;
    doc.setFont('helvetica', weight);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(safeText, maxWidth);
    for (const line of lines) {
      ensureSpace(size + 8);
      doc.text(line, margin, cursorY);
      cursorY += size + 5;
    }
    cursorY += gap - 5;
  };

  writeParagraph({ text: 'Arquétipos DISC', size: 20, weight: 'bold', gap: 10 });
  writeParagraph({
    text: `${report.respondentName || 'Participante'} • ${formatDate(report.completedAt)} • ${scoreTypeLabel(report.type)}`,
    size: 10,
    gap: 8,
  });
  writeParagraph({
    text: `Fator dominante: ${dominant}${secondary ? ` | Fator complementar: ${secondary}` : ''}`,
    size: 11,
    weight: 'bold',
    gap: 16,
  });

  items.forEach((item, index) => {
    writeParagraph({ text: `${index + 1}. ${item.title}`, size: 13, weight: 'bold', gap: 8 });
    writeParagraph({ text: item.summary, size: 11, gap: 8 });
    writeParagraph({ text: `Leitura: ${item.meaning}`, size: 11, gap: 12 });
  });

  const fileName = `arquetipos-${slugify(report.respondentName || report.assessmentId || 'disc') || 'disc'}.pdf`;
  doc.save(fileName);
}

async function loadLocalReports(access = {}) {
  if (access?.tenantId) {
    const items = await base44.entities.Assessment.filter({ workspace_id: access.tenantId }, '-created_date', 300);
    return items
      .filter((item) => String(item?.status || '').toLowerCase() === 'completed' || item?.report_id || item?.hasReport)
      .map(normalizeReport);
  }

  const byUserId = access?.userId
    ? await base44.entities.Assessment.filter({ user_id: access.userId }, '-created_date', 240)
    : [];
  const byEmail = access?.email
    ? await base44.entities.Assessment.filter({ user_id: access.email }, '-created_date', 240)
    : [];

  const merged = [...byUserId, ...byEmail]
    .filter((item) => String(item?.status || '').toLowerCase() === 'completed' || item?.report_id || item?.hasReport)
    .map(normalizeReport);

  const seen = new Set();
  return merged.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default function PanelArchetypes() {
  const { access } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [expandedId, setExpandedId] = useState('');
  const [exportingId, setExportingId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const reportsQuery = useQuery({
    queryKey: ['panel-archetypes-reports', apiBaseUrl, access?.tenantId, access?.userId, access?.email],
    enabled: Boolean(access?.userId || access?.email),
    queryFn: async () => {
      if (apiBaseUrl && getApiToken()) {
        const payload = await apiRequest('/candidate/me/reports', {
          method: 'GET',
          requireAuth: true,
        });
        return mapCandidateReports(payload?.reports || []).map(normalizeReport);
      }

      if (base44?.__isMock) {
        return loadLocalReports(access);
      }

      return [];
    },
  });

  const reports = useMemo(() => {
    return [...(reportsQuery.data || [])]
      .filter((item) => Boolean(item?.assessmentId || item?.id))
      .sort((left, right) => new Date(right?.completedAt || 0).getTime() - new Date(left?.completedAt || 0).getTime());
  }, [reportsQuery.data]);

  const expandedReport = useMemo(
    () => reports.find((item) => item.id === expandedId) || null,
    [reports, expandedId],
  );

  const handleToggle = (reportId) => {
    setExpandedId((current) => (current === reportId ? '' : reportId));
    setErrorMessage('');
  };

  const handleExportPdf = async (report) => {
    if (!report?.id) return;
    setExportingId(report.id);
    setErrorMessage('');

    try {
      await exportArchetypesPdf(report);
    } catch (error) {
      setErrorMessage(error?.message || 'Não foi possível gerar o PDF de arquétipos neste momento.');
    } finally {
      setExportingId('');
    }
  };

  return (
    <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8" data-testid="panel-archetypes-page">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">Análises DISC</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Arquétipos</h1>
        <p className="mt-2 text-sm text-slate-600">
          Selecione um relatório concluído para visualizar arquétipos relacionados ao perfil DISC e exportar uma leitura resumida em PDF.
        </p>
      </section>

      {errorMessage ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{errorMessage}</div>
      ) : null}

      {reportsQuery.isLoading ? (
        <PanelState title="Carregando arquétipos" description="Buscando relatórios disponíveis para análise." />
      ) : reportsQuery.isError ? (
        <PanelState
          type="error"
          title="Não foi possível carregar os relatórios"
          description="Atualize a página e tente novamente para consultar os arquétipos." 
        />
      ) : reports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum relatório disponível"
          description="Conclua uma avaliação para liberar a leitura de arquétipos." 
        />
      ) : (
        <section className="space-y-3">
          {reports.map((report) => {
            const isExpanded = expandedId === report.id;
            const isExporting = exportingId === report.id;
            const archetypes = resolveArchetypes(report);
            const resultPath = buildAssessmentResultPath(report.assessmentId || report.id);

            return (
              <article key={report.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={resultPath} className="text-sm font-semibold text-slate-900 hover:text-indigo-700 hover:underline">
                      {report.respondentName}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      {report.candidateEmail || '-'} • {formatDate(report.completedAt)} • {scoreTypeLabel(report.type)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Perfil {report.profileKey || report.dominantFactor}</Badge>
                    <Badge variant="outline">Dominante {report.dominantFactor}</Badge>
                    <Button variant="outline" size="sm" onClick={() => handleToggle(report.id)}>
                      {isExpanded ? 'Ocultar arquétipos' : 'Ver arquétipos'}
                    </Button>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => handleExportPdf(report)} disabled={isExporting}>
                      <Download className="mr-2 h-4 w-4" />
                      {isExporting ? 'Gerando...' : 'PDF dos arquétipos'}
                    </Button>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {archetypes.items.map((item) => (
                      <section key={`${report.id}-${item.title}`} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="flex items-start gap-2">
                          <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                            <Sparkles className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                            <p className="mt-1 text-sm text-slate-700">{item.summary}</p>
                            <p className="mt-2 text-xs text-slate-600">{item.meaning}</p>
                          </div>
                        </div>
                      </section>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      )}

      {expandedReport ? (
        <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">Leitura resumida</p>
          <p className="mt-2 text-sm text-slate-700">
            O relatório de <strong>{expandedReport.respondentName}</strong> indica predominância <strong>{expandedReport.dominantFactor}</strong>.
            Os arquétipos exibidos ajudam a traduzir o perfil DISC em implicações práticas de comunicação, tomada de decisão e execução.
          </p>
        </section>
      ) : null}
    </div>
  );
}
