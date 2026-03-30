import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { mapCandidateReports } from '@/modules/report/backendReports';
import {
  buildCoachReportContext,
  formatReportTypeLabel,
  normalizeCoachReportItem,
} from '@/modules/coach/reportContext';

const ANALYSIS_TYPES = [
  { value: 'arquetipos', label: 'Arquétipos do perfil' },
  { value: 'risco_pressao', label: 'Risco sob pressão' },
  { value: 'lideranca', label: 'Estilo de liderança' },
  { value: 'comunicacao', label: 'Padrão de comunicação' },
  { value: 'desenvolvimento', label: 'Plano de desenvolvimento' },
  { value: 'vendas', label: 'Perfil de vendas' },
];

const PROFILE_COLORS = {
  D: { bg: '#ef4444', text: '#fff' },
  I: { bg: '#f59e0b', text: '#fff' },
  S: { bg: '#10b981', text: '#fff' },
  C: { bg: '#8b5cf6', text: '#fff' },
};

const ARCHETYPE_BY_FACTOR = {
  D: {
    nome: 'O Conquistador',
    descricao:
      'Move decisões com assertividade, foco em resultado e alta iniciativa para destravar execução.',
  },
  I: {
    nome: 'O Mobilizador',
    descricao:
      'Gera adesão por influência, comunicação expressiva e capacidade de engajar pessoas rapidamente.',
  },
  S: {
    nome: 'O Guardião',
    descricao:
      'Sustenta estabilidade, confiança e continuidade operacional, preservando ritmo e cooperação.',
  },
  C: {
    nome: 'O Analista',
    descricao:
      'Eleva qualidade por método, critério e precisão, reduzindo risco por análise estruturada.',
  },
};

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
}

function normalizeList(value = [], maxItems = 8) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))].slice(0, maxItems);
}

function resolveTopFactors(scores = {}) {
  return ['D', 'I', 'S', 'C']
    .map((factor) => ({ factor, value: Math.max(0, toNumber(scores?.[factor], 0)) }))
    .sort((left, right) => right.value - left.value);
}

function buildArchetypes(scores = {}) {
  const topFactors = resolveTopFactors(scores).slice(0, 3);
  return topFactors.map((item) => {
    const preset = ARCHETYPE_BY_FACTOR[item.factor] || ARCHETYPE_BY_FACTOR.S;
    const color = PROFILE_COLORS[item.factor]?.bg || '#10b981';
    return {
      nome: preset.nome,
      descricao: preset.descricao,
      intensidade: Math.max(1, Math.min(100, Math.round(item.value))),
      cor: color,
    };
  });
}

function analysisDescription(type = '') {
  if (type === 'arquetipos') {
    return 'Identifica os arquétipos comportamentais dominantes no perfil e como eles se manifestam no contexto profissional.';
  }
  if (type === 'risco_pressao') {
    return 'Antecipa gatilhos de estresse e estratégias de prevenção no contexto real.';
  }
  if (type === 'lideranca') {
    return 'Mapeia o estilo natural de liderança e como ele impacta decisões e execução.';
  }
  if (type === 'comunicacao') {
    return 'Analisa padrões de comunicação e como ajustar linguagem para maior adesão.';
  }
  if (type === 'desenvolvimento') {
    return 'Gera prioridades práticas de desenvolvimento comportamental orientadas por contexto.';
  }
  if (type === 'vendas') {
    return 'Consolida sinais de persuasão, ritmo comercial e pontos de melhoria em conversão.';
  }
  return 'Análise contextual aplicada ao relatório selecionado.';
}

function buildTypeSummary(type = '', content = {}) {
  if (type === 'risco_pressao') {
    return String(content?.pressureBehavior || content?.summary || '').trim();
  }
  if (type === 'lideranca') {
    return String(content?.leadershipStyle || content?.summary || '').trim();
  }
  if (type === 'comunicacao') {
    return String(content?.communicationStyle || content?.summary || '').trim();
  }
  if (type === 'desenvolvimento') {
    const items = normalizeList(content?.developmentRecommendations, 3);
    if (items.length) {
      return `Prioridades de desenvolvimento: ${items.join(' · ')}`;
    }
  }
  if (type === 'vendas') {
    const business = normalizeList(content?.businessRecommendations, 3);
    if (business.length) {
      return `Foco comercial sugerido: ${business.join(' · ')}`;
    }
  }

  return String(content?.summary || content?.executiveSummary || '').trim();
}

function buildResultPayload({ analysisType, content, selectedContext }) {
  return {
    resumo:
      buildTypeSummary(analysisType, content) ||
      'Não foi possível gerar um resumo detalhado para este contexto no momento.',
    arquetipos: analysisType === 'arquetipos' ? buildArchetypes(selectedContext?.scores || {}) : [],
    pontos_fortes: normalizeList(content?.strengths, 6),
    pontos_atencao: normalizeList(content?.limitations, 6),
    recomendacoes: normalizeList(content?.developmentRecommendations, 6),
    provider: String(content?.provider || '').trim(),
    model: String(content?.model || '').trim(),
    source: String(content?.source || '').trim(),
  };
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

function IntensityBar({ value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          flex: 1,
          height: 6,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${value}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
            transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
          }}
        />
      </div>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', minWidth: 30, textAlign: 'right' }}>
        {value}%
      </span>
    </div>
  );
}

function DiscMini({ disc }) {
  const colors = { D: '#ef4444', I: '#f59e0b', S: '#10b981', C: '#8b5cf6' };
  return (
    <div style={{ display: 'flex', gap: 3, marginTop: 4 }}>
      {Object.entries(disc || {}).map(([factor, value]) => (
        <div key={factor} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 9, color: colors[factor], fontWeight: 700 }}>{factor}</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{value}%</span>
        </div>
      ))}
    </div>
  );
}

function ArquetipoCard({ arquetipo, index }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setVisible(true), index * 120);
    return () => clearTimeout(timeout);
  }, [index]);

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderLeft: `3px solid ${arquetipo.cor}`,
        borderRadius: 10,
        padding: '16px 18px',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{arquetipo.nome}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>{arquetipo.descricao}</div>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <div
          style={{
            fontSize: 10,
            color: 'rgba(255,255,255,0.3)',
            marginBottom: 5,
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
          }}
        >
          Intensidade
        </div>
        <IntensityBar value={arquetipo.intensidade} color={arquetipo.cor} />
      </div>
    </div>
  );
}

function ResultSection({ title, items, accent }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: accent,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, index) => (
          <div key={`${title}-${index}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: accent,
                marginTop: 6,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

async function loadLocalReports(access = {}) {
  if (access?.tenantId) {
    const items = await base44.entities.Assessment.filter({ workspace_id: access.tenantId }, '-created_date', 240);
    return items
      .filter((item) => String(item?.status || '').toLowerCase() === 'completed' || item?.report_id || item?.hasReport)
      .map(normalizeCoachReportItem);
  }

  const byUserId = access?.userId
    ? await base44.entities.Assessment.filter({ user_id: access.userId }, '-created_date', 240)
    : [];
  const byEmail = access?.email
    ? await base44.entities.Assessment.filter({ user_id: access.email }, '-created_date', 240)
    : [];

  const merged = [...byUserId, ...byEmail].map(normalizeCoachReportItem);
  const seen = new Set();

  return merged.filter((item) => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export default function PanelAiLab() {
  const { access } = useAuth();
  const apiBaseUrl = getApiBaseUrl();

  const [selectedReportId, setSelectedReportId] = useState('');
  const [analysisType, setAnalysisType] = useState('arquetipos');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);
  const [resultExpanded, setResultExpanded] = useState(false);
  const [search, setSearch] = useState('');

  const resultRef = useRef(null);

  const reportsQuery = useQuery({
    queryKey: ['panel-ai-lab-reports', apiBaseUrl, access?.tenantId, access?.userId, access?.email],
    enabled: Boolean(access?.userId || access?.email),
    queryFn: async () => {
      if (apiBaseUrl && getApiToken()) {
        const payload = await apiRequest('/candidate/me/reports', {
          method: 'GET',
          requireAuth: true,
        });
        return mapCandidateReports(payload?.reports || []).map(normalizeCoachReportItem);
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

  useEffect(() => {
    if (selectedReportId || !reports.length) return;
    setSelectedReportId(reports[0].id);
  }, [reports, selectedReportId]);

  const selectedReport = useMemo(() => {
    return reports.find((item) => item.id === selectedReportId) || null;
  }, [reports, selectedReportId]);

  const selectedContext = useMemo(() => {
    return selectedReport ? buildCoachReportContext(selectedReport) : null;
  }, [selectedReport]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = String(search || '').trim().toLowerCase();
    if (!normalizedSearch) return reports;

    return reports.filter((report) => {
      const name = String(report?.respondentName || '').toLowerCase();
      const email = String(report?.candidateEmail || '').toLowerCase();
      return name.includes(normalizedSearch) || email.includes(normalizedSearch);
    });
  }, [reports, search]);

  const selectedType = useMemo(() => {
    return ANALYSIS_TYPES.find((item) => item.value === analysisType) || ANALYSIS_TYPES[0];
  }, [analysisType]);

  const handleSelectReport = (report) => {
    setSelectedReportId(report.id);
    setResult(null);
    setResultExpanded(false);
    setErrorMessage('');
  };

  const handleGenerate = async () => {
    if (!selectedContext || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage('');
    setResult(null);
    setResultExpanded(false);

    try {
      const payload = await apiRequest('/ai/report-preview', {
        method: 'POST',
        requireAuth: true,
        body: {
          mode: selectedContext.reportType,
          nome: selectedContext.respondentName,
          cargo: '',
          empresa: '',
          D: selectedContext.scores.D,
          I: selectedContext.scores.I,
          S: selectedContext.scores.S,
          C: selectedContext.scores.C,
          includeMeta: true,
        },
      });

      const content = payload?.content || payload?.preview || {};
      const mappedResult = buildResultPayload({
        analysisType,
        content: {
          ...content,
          provider: payload?.provider,
          model: payload?.model,
          source: payload?.source,
        },
        selectedContext,
      });

      setResult({
        type: analysisType,
        data: mappedResult,
        report: selectedReport,
      });
      setResultExpanded(true);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } catch (error) {
      setErrorMessage(error?.message || 'Não foi possível gerar análise no AI Lab agora.');
    } finally {
      setIsGenerating(false);
    }
  };

  const canRenderMain = Boolean(selectedReport && selectedContext);

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
      data-testid="panel-ai-lab-page"
    >
      <div
        style={{
          padding: '24px 32px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div
            style={{
              background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.3)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: '#a78bfa',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Experiência Business
          </div>
          <div
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              padding: '4px 10px',
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span
              style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}
            />
            Modo Business
          </div>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>AI Lab</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
          Laboratório de análises e arquétipos aplicados aos seus relatórios DISC
        </p>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div
          style={{
            width: 300,
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
                color: 'rgba(255,255,255,0.35)',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
                marginBottom: 12,
              }}
            >
              Relatórios disponíveis
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
            {reportsQuery.isLoading ? (
              <div style={{ padding: '12px 8px', fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Carregando...</div>
            ) : reportsQuery.isError ? (
              <div style={{ padding: '12px 8px', fontSize: 12, color: '#fca5a5' }}>Falha ao carregar relatórios.</div>
            ) : filteredReports.length === 0 ? (
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
                      background: isSelected ? 'rgba(139,92,246,0.12)' : 'transparent',
                      border: isSelected
                        ? '1px solid rgba(139,92,246,0.35)'
                        : '1px solid transparent',
                      borderRadius: 10,
                      padding: '12px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      marginBottom: 4,
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
          {!canRenderMain ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '60%',
                gap: 16,
                opacity: 0.4,
              }}
            >
              <div style={{ fontSize: 40 }}>⚗️</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>Selecione um relatório</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 300 }}>
                Escolha um relatório na lista à esquerda para iniciar uma análise contextual.
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 780 }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 14,
                  padding: '18px 22px',
                  marginBottom: 24,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Relatório selecionado</div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{selectedContext.respondentName}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {selectedContext.candidateEmail || '-'} · {formatDate(selectedContext.completedAt)}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
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
                </div>
                <ProfileBadge profile={selectedContext.profileCode || selectedContext.dominantFactor || 'S'} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.35)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    marginBottom: 10,
                  }}
                >
                  Tipo de análise
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {ANALYSIS_TYPES.map((type) => {
                    const isActive = analysisType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          setAnalysisType(type.value);
                          setResult(null);
                          setResultExpanded(false);
                          setErrorMessage('');
                        }}
                        style={{
                          background: isActive ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                          border: isActive
                            ? '1px solid rgba(139,92,246,0.5)'
                            : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                          padding: '7px 14px',
                          fontSize: 12,
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(139,92,246,0.06)',
                  border: '1px solid rgba(139,92,246,0.15)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  marginBottom: 20,
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                {analysisDescription(analysisType)}
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                style={{
                  background: isGenerating ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.85)',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 28px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 28,
                }}
              >
                {isGenerating ? (
                  <>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTop: '2px solid #fff',
                        borderRadius: '50%',
                        display: 'inline-block',
                        animation: 'spin 0.8s linear infinite',
                      }}
                    />
                    Gerando análise...
                  </>
                ) : (
                  <>Gerar {selectedType.label}</>
                )}
              </button>

              {errorMessage ? (
                <div
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.28)',
                    color: '#fecaca',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 13,
                    marginBottom: 20,
                  }}
                >
                  {errorMessage}
                </div>
              ) : null}

              {result ? (
                <div ref={resultRef}>
                  <button
                    type="button"
                    onClick={() => setResultExpanded((value) => !value)}
                    style={{
                      width: '100%',
                      background: 'rgba(139,92,246,0.08)',
                      border: '1px solid rgba(139,92,246,0.2)',
                      borderRadius: resultExpanded ? '12px 12px 0 0' : 12,
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa' }}>
                        {selectedType.label} — {result.report?.respondentName}
                      </span>
                      <span
                        style={{
                          background: 'rgba(139,92,246,0.2)',
                          border: '1px solid rgba(139,92,246,0.3)',
                          borderRadius: 5,
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#a78bfa',
                          padding: '2px 7px',
                          letterSpacing: '0.05em',
                        }}
                      >
                        Perfil {result.report?.profileCode || result.report?.dominantFactor || 'S'}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 14,
                        color: '#a78bfa',
                        transform: resultExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease',
                        display: 'inline-block',
                      }}
                    >
                      ▼
                    </span>
                  </button>

                  <div
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(139,92,246,0.2)',
                      borderTop: 'none',
                      borderRadius: '0 0 12px 12px',
                      overflow: 'hidden',
                      maxHeight: resultExpanded ? '2200px' : '0',
                      transition: 'max-height 0.5s cubic-bezier(0.4,0,0.2,1)',
                    }}
                  >
                    <div style={{ padding: '20px 22px 24px' }}>
                      <div style={{ marginBottom: 24 }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'rgba(255,255,255,0.35)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.07em',
                            marginBottom: 10,
                          }}
                        >
                          Resumo executivo
                        </div>
                        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1.65, margin: 0 }}>
                          {result.data.resumo}
                        </p>
                      </div>

                      {analysisType === 'arquetipos' && result.data.arquetipos?.length ? (
                        <div style={{ marginBottom: 24 }}>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: 'rgba(255,255,255,0.35)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.07em',
                              marginBottom: 14,
                            }}
                          >
                            Arquétipos identificados
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {result.data.arquetipos.map((item, index) => (
                              <ArquetipoCard key={`${item.nome}-${index}`} arquetipo={item} index={index} />
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                        <div
                          style={{
                            background: 'rgba(16,185,129,0.06)',
                            border: '1px solid rgba(16,185,129,0.15)',
                            borderRadius: 10,
                            padding: '16px 18px',
                          }}
                        >
                          <ResultSection
                            title="Pontos fortes"
                            items={
                              result.data.pontos_fortes?.length
                                ? result.data.pontos_fortes
                                : ['Sem pontos fortes adicionais para o contexto selecionado.']
                            }
                            accent="#10b981"
                          />
                        </div>
                        <div
                          style={{
                            background: 'rgba(239,68,68,0.06)',
                            border: '1px solid rgba(239,68,68,0.15)',
                            borderRadius: 10,
                            padding: '16px 18px',
                          }}
                        >
                          <ResultSection
                            title="Pontos de atenção"
                            items={
                              result.data.pontos_atencao?.length
                                ? result.data.pontos_atencao
                                : ['Sem pontos críticos adicionais para o contexto selecionado.']
                            }
                            accent="#ef4444"
                          />
                        </div>
                      </div>

                      <div
                        style={{
                          background: 'rgba(139,92,246,0.06)',
                          border: '1px solid rgba(139,92,246,0.15)',
                          borderRadius: 10,
                          padding: '16px 18px',
                        }}
                      >
                        <ResultSection
                          title="Recomendações"
                          items={
                            result.data.recomendacoes?.length
                              ? result.data.recomendacoes
                              : ['Sem recomendações adicionais disponíveis para este contexto.']
                          }
                          accent="#a78bfa"
                        />
                      </div>

                      <div
                        style={{
                          marginTop: 20,
                          paddingTop: 16,
                          borderTop: '1px solid rgba(255,255,255,0.06)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                          Análise gerada pela plataforma InsightDISC.
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setResult(null);
                            setResultExpanded(false);
                          }}
                          style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: 7,
                            padding: '5px 12px',
                            fontSize: 11,
                            color: 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                          }}
                        >
                          Limpar resultado
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        input::placeholder { color: rgba(255,255,255,0.25); }
        button { font-family: inherit; }
      `}</style>
    </div>
  );
}
