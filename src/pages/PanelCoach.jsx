import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import EmptyState from '@/components/ui/EmptyState';
import PanelState from '@/components/ui/PanelState';
import { UpgradePrompt } from '@/modules/billing';
import { mapCandidateReports } from '@/modules/report/backendReports';
import {
  buildCoachReportContext,
  formatReportTypeLabel,
  normalizeCoachReportItem,
} from '@/modules/coach/reportContext';
import { PRODUCT_FEATURES, hasFeatureAccessByPlan } from '@/modules/billing/planGuard';

const PROFILE_COLORS = {
  D: { bg: '#ef4444', text: '#fff' },
  I: { bg: '#f59e0b', text: '#fff' },
  S: { bg: '#10b981', text: '#fff' },
  C: { bg: '#8b5cf6', text: '#fff' },
};

const SUGGESTED_QUESTIONS = [
  'Como liderar essa pessoa?',
  'Como dar feedback para esse perfil?',
  'Quais riscos de comunicação devo observar?',
  'Como esse perfil reage sob pressão?',
  'Como desenvolver esse perfil?',
  'Como esse perfil tende a atuar em equipe?',
  'Quais pontos observar em uma entrevista devolutiva?',
  'Como adaptar minha linguagem para esse perfil?',
];

const COACH_SEGMENTS = [
  { value: 'leadership', label: 'Liderança' },
  { value: 'rh', label: 'RH' },
  { value: 'sales', label: 'Vendas' },
  { value: 'communication', label: 'Comunicação' },
  { value: 'development', label: 'Desenvolvimento' },
];

function toText(value) {
  return String(value || '').trim();
}

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
}

function formatDateTime(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ProfileBadge({ profile }) {
  const color = PROFILE_COLORS[profile] || PROFILE_COLORS.S;
  return (
    <span
      style={{
        background: color.bg,
        color: color.text,
        fontSize: 11,
        fontWeight: 700,
        padding: '2px 8px',
        borderRadius: 4,
        letterSpacing: '0.05em',
        flexShrink: 0,
      }}
    >
      Perfil {profile}
    </span>
  );
}

function DiscMini({ disc }) {
  const colors = { D: '#ef4444', I: '#f59e0b', S: '#10b981', C: '#8b5cf6' };
  return (
    <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
      {Object.entries(disc || {}).map(([factor, value]) => (
        <div
          key={factor}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: `${colors[factor]}1a`,
            border: `1px solid ${colors[factor]}44`,
            borderRadius: 999,
            padding: '1px 6px',
          }}
        >
          <span style={{ fontSize: 10, color: colors[factor], fontWeight: 700 }}>{factor}</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>{value}%</span>
        </div>
      ))}
    </div>
  );
}

function SourceBadge({ source = '', provider = '', model = '' }) {
  const normalizedSource = toText(source).toLowerCase();
  const isGroq = normalizedSource === 'groq' || toText(provider).toLowerCase() === 'groq';

  return (
    <span
      style={{
        background: isGroq ? 'rgba(16,185,129,0.16)' : 'rgba(255,255,255,0.08)',
        border: isGroq ? '1px solid rgba(16,185,129,0.32)' : '1px solid rgba(255,255,255,0.14)',
        color: isGroq ? '#6ee7b7' : 'rgba(255,255,255,0.65)',
        borderRadius: 999,
        padding: '3px 9px',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {isGroq ? 'Groq Real' : 'AI'}
      {model ? <span style={{ opacity: 0.82 }}>{model}</span> : null}
    </span>
  );
}

function buildHistoryEntry(payload, prompt) {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    question: prompt,
    answer: toText(payload?.answer),
    source: toText(payload?.source),
    provider: toText(payload?.provider),
    model: toText(payload?.model),
    context: payload?.context || null,
    supporting: payload?.supporting || null,
    createdAt: new Date().toISOString(),
  };
}

export default function PanelCoach() {
  const { access, plan } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const resolvedPlan = String(plan || access?.plan || '').trim().toLowerCase() || 'personal';
  const canUseCoach = hasFeatureAccessByPlan(resolvedPlan, PRODUCT_FEATURES.COACH);

  const [selectedReportId, setSelectedReportId] = useState('');
  const [question, setQuestion] = useState('');
  const [search, setSearch] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [historyByReport, setHistoryByReport] = useState({});
  const [selectedSegment, setSelectedSegment] = useState('leadership');

  const reportsQuery = useQuery({
    queryKey: ['panel-coach-reports', apiBaseUrl, access?.tenantId, access?.userId, access?.email],
    enabled: Boolean(access?.userId || access?.email),
    queryFn: async () => {
      if (!apiBaseUrl || !getApiToken()) {
        throw new Error('COACH_API_MODE_REQUIRED');
      }

      const payload = await apiRequest('/candidate/me/reports', {
        method: 'GET',
        requireAuth: true,
      });

      return mapCandidateReports(payload?.reports || []).map(normalizeCoachReportItem);
    },
  });

  const reports = useMemo(() => {
    return [...(reportsQuery.data || [])]
      .filter((item) => Boolean(item?.assessmentId || item?.id))
      .sort((left, right) => new Date(right?.completedAt || 0).getTime() - new Date(left?.completedAt || 0).getTime());
  }, [reportsQuery.data]);

  useEffect(() => {
    if (selectedReportId || !reports.length) return;
    setSelectedReportId(reports[0].id);
  }, [reports, selectedReportId]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = toText(search).toLowerCase();
    if (!normalizedSearch) return reports;

    return reports.filter((report) => {
      const name = toText(report?.respondentName).toLowerCase();
      const email = toText(report?.candidateEmail).toLowerCase();
      return name.includes(normalizedSearch) || email.includes(normalizedSearch);
    });
  }, [reports, search]);

  const selectedReport = useMemo(() => {
    return reports.find((report) => report.id === selectedReportId) || null;
  }, [reports, selectedReportId]);

  const selectedContext = useMemo(() => {
    return selectedReport ? buildCoachReportContext(selectedReport) : null;
  }, [selectedReport]);

  const selectedHistory = useMemo(() => {
    if (!selectedReportId) return [];
    return historyByReport[selectedReportId] || [];
  }, [historyByReport, selectedReportId]);

  const handleSelectReport = (report) => {
    setSelectedReportId(report.id);
    setErrorMessage('');
  };

  const handleAsk = async () => {
    const prompt = toText(question);
    if (!prompt || !selectedContext || isSending) return;

    setIsSending(true);
    setErrorMessage('');

    try {
      const payload = await apiRequest('/ai/coach', {
        method: 'POST',
        requireAuth: true,
        body: {
          mode: selectedContext.reportType,
          segment: selectedSegment,
          nome: selectedContext.respondentName,
          cargo: '',
          empresa: '',
          D: selectedContext.scores.D,
          I: selectedContext.scores.I,
          S: selectedContext.scores.S,
          C: selectedContext.scores.C,
          question: prompt,
          context: {
            reportId: selectedContext.reportId,
            assessmentId: selectedContext.assessmentId,
            reportType: selectedContext.reportType,
            profileCode: selectedContext.profileCode,
            dominantFactor: selectedContext.dominantFactor,
            secondaryFactor: selectedContext.secondaryFactor,
            respondentName: selectedContext.respondentName,
            candidateEmail: selectedContext.candidateEmail,
            completedAt: selectedContext.completedAt,
            summary: selectedContext.summary,
            strengths: selectedContext.strengths,
            limitations: selectedContext.limitations,
            riskProfile: selectedContext.riskProfile,
            riskSignals: selectedContext.riskSignals,
            developmentRecommendations: selectedContext.developmentRecommendations,
          },
        },
      });

      const entry = buildHistoryEntry(payload, prompt);
      const reportKey = selectedReportId;
      setHistoryByReport((current) => ({
        ...current,
        [reportKey]: [entry, ...(current[reportKey] || [])],
      }));
      setQuestion('');
    } catch (error) {
      setErrorMessage(
        error?.message || 'Não foi possível gerar o insight agora. Tente novamente em instantes.',
      );
    } finally {
      setIsSending(false);
    }
  };

  if (!canUseCoach) {
    return (
      <div className="w-full min-w-0 max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8" data-testid="panel-coach-page">
        <UpgradePrompt
          title="Coach bloqueado no plano atual"
          description="Coach está disponível a partir do plano Professional."
          requiredPlanLabel="Professional"
          ctaLabel="Fazer upgrade"
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0d0e1a',
        color: '#fff',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
      data-testid="panel-coach-page"
    >
      <div
        style={{
          padding: '24px 32px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
          <div
            style={{
              background: 'rgba(59,130,246,0.15)',
              border: '1px solid rgba(59,130,246,0.36)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: '#93c5fd',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Coach AI Premium
          </div>
          <div
            style={{
              background: 'rgba(16,185,129,0.14)',
              border: '1px solid rgba(16,185,129,0.34)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11,
              color: '#6ee7b7',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            IA contextual por relatório real
          </div>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Coach contextual por relatório</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '6px 0 0' }}>
          Selecione um relatório, faça uma pergunta e receba orientação acionável para liderança, feedback e desenvolvimento.
        </p>
      </div>

      {reportsQuery.isLoading ? (
        <div style={{ padding: '24px 32px' }}>
          <PanelState title="Carregando relatórios" description="Buscando base real para o Coach AI." />
        </div>
      ) : reportsQuery.isError ? (
        <div style={{ padding: '24px 32px' }}>
          <PanelState
            type="error"
            title="Falha ao carregar relatórios"
            description={
              toText(reportsQuery.error?.message) === 'COACH_API_MODE_REQUIRED'
                ? 'O Coach AI exige backend real autenticado (API mode).'
                : 'Não foi possível carregar os relatórios do Coach AI neste momento.'
            }
          />
        </div>
      ) : reports.length === 0 ? (
        <div style={{ padding: '24px 32px' }}>
          <EmptyState
            title="Sem relatórios disponíveis"
            description="Conclua avaliações para liberar o Coach AI contextualizado por relatório real."
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div
            style={{
              width: 320,
              flexShrink: 0,
              borderRight: '1px solid rgba(255,255,255,0.07)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '16px 16px 12px' }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.36)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  marginBottom: 12,
                }}
              >
                Relatórios para consulta
              </div>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome ou e-mail..."
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '8px 12px',
                  fontSize: 12,
                  color: '#fff',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px' }}>
              {filteredReports.length === 0 ? (
                <div style={{ padding: '12px 8px', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Sem resultados.</div>
              ) : (
                filteredReports.map((report) => {
                  const isSelected = selectedReport?.id === report.id;
                  const profile = report.profileCode || report.dominantFactor || 'S';

                  return (
                    <button
                      key={report.id}
                      type="button"
                      onClick={() => handleSelectReport(report)}
                      style={{
                        width: '100%',
                        background: isSelected ? 'rgba(59,130,246,0.16)' : 'transparent',
                        border: isSelected
                          ? '1px solid rgba(59,130,246,0.38)'
                          : '1px solid transparent',
                        borderRadius: 10,
                        padding: '12px 12px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        marginBottom: 6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 4,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{report.respondentName}</span>
                        <ProfileBadge profile={profile} />
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: 'rgba(255,255,255,0.35)',
                          marginBottom: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {report.candidateEmail || '-'}
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                        {formatDate(report.completedAt)} · {formatReportTypeLabel(report.reportType)}
                      </div>
                      <DiscMini disc={report.scores} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
            {!selectedContext ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '60%',
                  gap: 14,
                  opacity: 0.45,
                }}
              >
                <div style={{ fontSize: 40 }}>🧭</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>Selecione um relatório</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 320 }}>
                  O Coach AI só gera insights quando há um relatório real selecionado como base.
                </div>
              </div>
            ) : (
              <div style={{ maxWidth: 880 }}>
                <div
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.09)',
                    borderRadius: 14,
                    padding: '18px 22px',
                    marginBottom: 22,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 20,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>
                      Relatório em análise
                    </div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{selectedContext.respondentName}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.42)', marginTop: 2 }}>
                      {selectedContext.candidateEmail || '-'} · {formatDate(selectedContext.completedAt)} ·{' '}
                      {formatReportTypeLabel(selectedContext.reportType)}
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                      {Object.entries(selectedContext.scores || {}).map(([factor, value]) => {
                        const color = PROFILE_COLORS[factor]?.bg || '#8b5cf6';
                        return (
                          <span
                            key={factor}
                            style={{
                              background: `${color}22`,
                              border: `1px solid ${color}44`,
                              color,
                              fontSize: 11,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 5,
                            }}
                          >
                            {factor} · {value}%
                          </span>
                        );
                      })}
                    </div>

                    <p
                      style={{
                        marginTop: 10,
                        marginBottom: 0,
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.62)',
                        lineHeight: 1.55,
                        maxWidth: 620,
                      }}
                    >
                      {toText(selectedContext.summary) || 'Resumo comportamental não disponível no relatório selecionado.'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                    <ProfileBadge profile={selectedContext.profileCode || selectedContext.dominantFactor || 'S'} />
                    {selectedContext.secondaryFactor ? (
                      <span
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.12)',
                          borderRadius: 999,
                          padding: '3px 8px',
                          fontSize: 10,
                          color: 'rgba(255,255,255,0.6)',
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Secundário {selectedContext.secondaryFactor}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(59,130,246,0.08)',
                    border: '1px solid rgba(59,130,246,0.22)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#93c5fd',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      marginBottom: 8,
                    }}
                  >
                    Perguntas rápidas
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {SUGGESTED_QUESTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setQuestion(item)}
                        style={{
                          background: 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.14)',
                          borderRadius: 999,
                          padding: '6px 12px',
                          fontSize: 12,
                          color: 'rgba(255,255,255,0.78)',
                          cursor: 'pointer',
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      marginBottom: 8,
                    }}
                  >
                    Modo avançado: segmento de análise
                  </div>
                  <select
                    value={selectedSegment}
                    onChange={(event) => setSelectedSegment(event.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(13,14,26,0.72)',
                      color: '#fff',
                      fontSize: 13,
                      padding: '10px 12px',
                      outline: 'none',
                    }}
                  >
                    {COACH_SEGMENTS.map((segment) => (
                      <option key={segment.value} value={segment.value} style={{ background: '#0d0e1a' }}>
                        {segment.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 12,
                    padding: '14px 16px',
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      marginBottom: 10,
                    }}
                  >
                    Pergunta livre
                  </div>
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ex.: Como conduzir uma conversa de feedback difícil com esse perfil sem gerar resistência?"
                    style={{
                      width: '100%',
                      minHeight: 124,
                      resize: 'vertical',
                      borderRadius: 10,
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(13,14,26,0.72)',
                      color: '#fff',
                      fontSize: 13,
                      lineHeight: 1.5,
                      padding: '12px 12px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 }}>
                    <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.48)' }}>
                      A resposta será gerada com base neste relatório específico.
                    </p>
                    <button
                      type="button"
                      onClick={handleAsk}
                      disabled={isSending || !toText(question)}
                      style={{
                        background: isSending || !toText(question)
                          ? 'rgba(59,130,246,0.34)'
                          : 'rgba(59,130,246,0.88)',
                        border: 'none',
                        borderRadius: 10,
                        padding: '10px 16px',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 13,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        cursor: isSending || !toText(question) ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {isSending ? (
                        <>
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              border: '2px solid rgba(255,255,255,0.34)',
                              borderTop: '2px solid #fff',
                              borderRadius: '50%',
                              display: 'inline-block',
                              animation: 'spin 0.8s linear infinite',
                            }}
                          />
                          Gerando insight...
                        </>
                      ) : (
                        'Gerar Insight Estratégico'
                      )}
                    </button>
                  </div>
                </div>

                {errorMessage ? (
                  <div
                    style={{
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.28)',
                      color: '#fecaca',
                      borderRadius: 10,
                      padding: '12px 14px',
                      fontSize: 13,
                      marginBottom: 16,
                    }}
                  >
                    {errorMessage}
                  </div>
                ) : null}

                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.4)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      marginBottom: 10,
                    }}
                  >
                    Histórico deste relatório
                  </div>

                  {selectedHistory.length === 0 ? (
                    <div
                      style={{
                        border: '1px dashed rgba(255,255,255,0.18)',
                        borderRadius: 12,
                        padding: '14px 16px',
                        fontSize: 13,
                        color: 'rgba(255,255,255,0.5)',
                      }}
                    >
                      Faça a primeira pergunta para gerar um insight contextualizado por IA.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {selectedHistory.map((entry) => (
                        <article
                          key={entry.id}
                          style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderLeft: '3px solid rgba(59,130,246,0.72)',
                            borderRadius: 12,
                            padding: '14px 16px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 10,
                              marginBottom: 10,
                              flexWrap: 'wrap',
                            }}
                          >
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                              {formatDateTime(entry.createdAt)}
                            </span>
                            <SourceBadge source={entry.source} provider={entry.provider} model={entry.model} />
                          </div>

                          <div style={{ marginBottom: 10 }}>
                            <div
                              style={{
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.4)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                                marginBottom: 4,
                              }}
                            >
                              Pergunta
                            </div>
                            <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>{entry.question}</p>
                          </div>

                          <div>
                            <div
                              style={{
                                fontSize: 10,
                                color: 'rgba(255,255,255,0.4)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.07em',
                                marginBottom: 5,
                              }}
                            >
                              Insight estratégico
                            </div>
                            <div
                              style={{
                                margin: 0,
                                fontSize: 13,
                                color: 'rgba(255,255,255,0.82)',
                                lineHeight: 1.6,
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {entry.answer}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.3); }
        button { font-family: inherit; }
      `}</style>
    </div>
  );
}
