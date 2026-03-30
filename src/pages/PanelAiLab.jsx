import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { UpgradePrompt } from '@/modules/billing';
import { PRODUCT_FEATURES, hasFeatureAccessByPlan } from '@/modules/billing/planGuard';
import { mapCandidateReports } from '@/modules/report/backendReports';
import {
  buildCoachReportContext,
  formatReportTypeLabel,
  normalizeCoachReportItem,
} from '@/modules/coach/reportContext';

const STRATEGIC_MODULES = [
  {
    value: 'development_plan',
    label: 'Plano de desenvolvimento',
    description: 'Curto, medio e longo prazo com foco, acao, frequencia e indicador de progresso.',
    category: 'core',
  },
  {
    value: 'manager_feedback',
    label: 'Feedback pronto',
    description: 'Texto profissional para gestor com abertura, positivos, atencao e orientacao.',
    category: 'core',
  },
  {
    value: 'behavioral_risk',
    label: 'Riscos',
    description: 'Conflito, comunicacao, pressao e desalinhamento com mitigacoes objetivas.',
    category: 'core',
  },
  {
    value: 'profile_fit',
    label: 'Compatibilidade',
    description: 'Fit entre dois perfis com sinergias, conflitos e recomendacoes de convivencia.',
    category: 'core',
  },
  {
    value: 'team_allocation',
    label: 'Sugestoes de acao',
    description: 'Alocacao em equipe, contexto ideal de atuacao e guia de colaboracao.',
    category: 'core',
  },
  {
    value: 'debrief_script',
    label: 'Roteiro de devolutiva',
    description: 'Script para conduzir conversa sem resistencia com perguntas e fechamento.',
    category: 'advanced',
  },
  {
    value: 'ideal_role_profile',
    label: 'Perfil ideal para vaga',
    description: 'Aderencia do perfil atual ao cargo alvo com sinais de fit e risco de mismatch.',
    category: 'advanced',
  },
];

const AI_SEGMENTS = [
  { value: 'leadership', label: 'Lideranca' },
  { value: 'rh', label: 'RH' },
  { value: 'sales', label: 'Vendas' },
  { value: 'communication', label: 'Comunicacao' },
  { value: 'development', label: 'Desenvolvimento' },
];

const STRATEGIC_MODULE_VALUES = new Set(STRATEGIC_MODULES.map((item) => item.value));
const AI_SEGMENT_VALUES = new Set(AI_SEGMENTS.map((item) => item.value));

const PROFILE_COLORS = {
  D: { bg: '#ef4444', text: '#fff' },
  I: { bg: '#f59e0b', text: '#fff' },
  S: { bg: '#10b981', text: '#fff' },
  C: { bg: '#8b5cf6', text: '#fff' },
};

function toText(value) {
  return String(value || '').trim();
}

function toList(value = [], maxItems = 8) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => toText(item)).filter(Boolean))].slice(0, maxItems);
}

function formatDate(value) {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('pt-BR');
}

function resolveInitialModule(searchParams) {
  const requested = toText(searchParams?.get('module')).toLowerCase();
  if (STRATEGIC_MODULE_VALUES.has(requested)) return requested;
  return 'development_plan';
}

function resolveInitialSegment(searchParams) {
  const requested = toText(searchParams?.get('segment')).toLowerCase();
  if (AI_SEGMENT_VALUES.has(requested)) return requested;
  return 'leadership';
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

function renderStrategicResult(moduleKey, data = {}) {
  const boxStyle = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.11)',
    borderRadius: 10,
    padding: '12px 14px',
  };

  const sectionTitle = (text) => (
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
      {text}
    </div>
  );

  const list = (items = []) => {
    const rows = toList(items, 14);
    if (!rows.length) {
      return <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Sem dados retornados.</div>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {rows.map((item, index) => (
          <div key={`${item}-${index}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.5)', marginTop: 7 }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5 }}>{item}</span>
          </div>
        ))}
      </div>
    );
  };

  const planStage = (title, rows = []) => (
    <div style={boxStyle}>
      {sectionTitle(title)}
      {!Array.isArray(rows) || !rows.length ? (
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>Sem dados retornados.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.slice(0, 6).map((item, idx) => (
            <div key={`${title}-${idx}`} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 10px' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 5 }}>{toText(item.focus) || `Foco ${idx + 1}`}</div>
              {toText(item.behavior) ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)' }}><strong>Comportamento:</strong> {item.behavior}</div> : null}
              {toText(item.action) ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)' }}><strong>Acao:</strong> {item.action}</div> : null}
              {toText(item.frequency) ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)' }}><strong>Frequencia:</strong> {item.frequency}</div> : null}
              {toText(item.progressIndicator) ? <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.72)' }}><strong>Indicador:</strong> {item.progressIndicator}</div> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (moduleKey === 'development_plan') {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        {toText(data.executiveSummary) ? <div style={boxStyle}><div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{data.executiveSummary}</div></div> : null}
        {planStage('Curto prazo', data.shortTerm)}
        {planStage('Medio prazo', data.mediumTerm)}
        {planStage('Longo prazo', data.longTerm)}
        <div style={boxStyle}>{sectionTitle('Sugestoes adicionais')}{list(data.suggestions)}</div>
      </div>
    );
  }

  if (moduleKey === 'manager_feedback') {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={boxStyle}>{sectionTitle('Abertura')}<div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{toText(data.opening) || 'Sem dados retornados.'}</div></div>
        <div style={boxStyle}>{sectionTitle('Pontos positivos')}{list(data.positivePoints)}</div>
        <div style={boxStyle}>{sectionTitle('Pontos de atencao')}{list(data.attentionPoints)}</div>
        <div style={boxStyle}>{sectionTitle('Orientacao')}
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{toText(data.guidance) || 'Sem dados retornados.'}</div>
        </div>
        <div style={boxStyle}>{sectionTitle('Fechamento')}
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{toText(data.closing) || 'Sem dados retornados.'}</div>
        </div>
      </div>
    );
  }

  if (moduleKey === 'debrief_script') {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={boxStyle}>{sectionTitle('Como iniciar')}<div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{toText(data.opening) || 'Sem dados retornados.'}</div></div>
        <div style={boxStyle}>{sectionTitle('Mensagens chave')}{list(data.keyMessages)}</div>
        <div style={boxStyle}>{sectionTitle('Como conduzir')}{list(data.conversationFlow)}</div>
        <div style={boxStyle}>{sectionTitle('Como evitar resistencia')}{list(data.resistancePrevention)}</div>
        <div style={boxStyle}>{sectionTitle('Perguntas para fazer')}{list(data.questions)}</div>
        <div style={boxStyle}>{sectionTitle('Fechamento')}
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{toText(data.closing) || 'Sem dados retornados.'}</div>
        </div>
      </div>
    );
  }

  if (moduleKey === 'behavioral_risk') {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={boxStyle}>{sectionTitle('Leitura de risco')}<div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{toText(data.summary) || 'Sem dados retornados.'}</div></div>
        <div style={boxStyle}>{sectionTitle('Risco de conflito')}<div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>{toText(data.conflictRisk) || 'Sem dados retornados.'}</div></div>
        <div style={boxStyle}>{sectionTitle('Risco de comunicacao')}<div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>{toText(data.communicationRisk) || 'Sem dados retornados.'}</div></div>
        <div style={boxStyle}>{sectionTitle('Risco sob pressao')}<div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>{toText(data.pressureRisk) || 'Sem dados retornados.'}</div></div>
        <div style={boxStyle}>{sectionTitle('Risco de desalinhamento')}<div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)' }}>{toText(data.alignmentRisk) || 'Sem dados retornados.'}</div></div>
        <div style={boxStyle}>{sectionTitle('Mitigacoes')}{list(data.mitigations)}</div>
      </div>
    );
  }

  if (moduleKey === 'team_allocation') {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={boxStyle}>{sectionTitle('Resumo de alocacao')}<div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{toText(data.summary) || 'Sem dados retornados.'}</div></div>
        <div style={boxStyle}>{sectionTitle('Contextos ideais')}{list(data.bestContexts)}</div>
        <div style={boxStyle}>{sectionTitle('Contextos a evitar')} {list(data.avoidContexts)}</div>
        <div style={boxStyle}>{sectionTitle('Sugestoes de funcao')} {list(data.roleSuggestions)}</div>
        <div style={boxStyle}>{sectionTitle('Guia de colaboracao')} {list(data.collaborationGuidelines)}</div>
      </div>
    );
  }

  if (moduleKey === 'ideal_role_profile') {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={boxStyle}>{sectionTitle('Leitura executiva')}<div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{toText(data.summary) || 'Sem dados retornados.'}</div></div>
        <div style={boxStyle}>{sectionTitle('Perfil ideal sugerido')}<div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{toText(data.idealProfile) || 'Sem dados retornados.'}</div></div>
        <div style={boxStyle}>{sectionTitle('Sinais de fit')} {list(data.fitSignals)}</div>
        <div style={boxStyle}>{sectionTitle('Riscos de mismatch')} {list(data.mismatchRisks)}</div>
        <div style={boxStyle}>{sectionTitle('Foco de entrevista')} {list(data.interviewFocus)}</div>
        <div style={boxStyle}>{sectionTitle('Ambientes recomendados')} {list(data.recommendedEnvironments)}</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={boxStyle}>{sectionTitle('Resumo de fit')}<div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{toText(data.summary) || 'Sem dados retornados.'}</div></div>
      <div style={boxStyle}>{sectionTitle('Score de compatibilidade')}<div style={{ fontSize: 24, fontWeight: 700, color: '#a78bfa' }}>{Number(data.compatibilityScore || 0)}%</div></div>
      <div style={boxStyle}>{sectionTitle('Sinergias')} {list(data.synergies)}</div>
      <div style={boxStyle}>{sectionTitle('Conflitos potenciais')} {list(data.potentialConflicts)}</div>
      <div style={boxStyle}>{sectionTitle('Recomendacoes de convivencia')} {list(data.coexistenceRecommendations)}</div>
      <div style={boxStyle}>{sectionTitle('Guia de lideranca')}<div style={{ fontSize: 13, color: 'rgba(255,255,255,0.82)', lineHeight: 1.6 }}>{toText(data.leadershipGuidance) || 'Sem dados retornados.'}</div></div>
    </div>
  );
}

export default function PanelAiLab() {
  const { access, plan } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [searchParams] = useSearchParams();
  const resolvedPlan = String(plan || access?.plan || '').trim().toLowerCase() || 'personal';
  const canUseAiLab = hasFeatureAccessByPlan(resolvedPlan, PRODUCT_FEATURES.AI_LAB);

  const [selectedReportId, setSelectedReportId] = useState('');
  const [selectedCompareReportId, setSelectedCompareReportId] = useState('');
  const [selectedModule, setSelectedModule] = useState(() => resolveInitialModule(searchParams));
  const [selectedSegment, setSelectedSegment] = useState(() => resolveInitialSegment(searchParams));
  const [jobRoleTitle, setJobRoleTitle] = useState('');
  const [jobSeniority, setJobSeniority] = useState('');
  const [jobScope, setJobScope] = useState('');
  const [jobGoal, setJobGoal] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState(null);
  const [resultExpanded, setResultExpanded] = useState(false);
  const [search, setSearch] = useState('');

  const resultRef = useRef(null);

  useEffect(() => {
    const moduleFromQuery = resolveInitialModule(searchParams);
    const segmentFromQuery = resolveInitialSegment(searchParams);
    setSelectedModule(moduleFromQuery);
    setSelectedSegment(segmentFromQuery);
  }, [searchParams]);

  const reportsQuery = useQuery({
    queryKey: ['panel-ai-lab-reports', apiBaseUrl, access?.tenantId, access?.userId, access?.email],
    enabled: Boolean(access?.userId || access?.email),
    queryFn: async () => {
      if (!apiBaseUrl || !getApiToken()) {
        throw new Error('AI_LAB_API_MODE_REQUIRED');
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

  const selectedReport = useMemo(() => {
    return reports.find((item) => item.id === selectedReportId) || null;
  }, [reports, selectedReportId]);

  const selectedContext = useMemo(() => {
    return selectedReport ? buildCoachReportContext(selectedReport) : null;
  }, [selectedReport]);

  const filteredReports = useMemo(() => {
    const normalizedSearch = toText(search).toLowerCase();
    if (!normalizedSearch) return reports;

    return reports.filter((report) => {
      const name = toText(report?.respondentName).toLowerCase();
      const email = toText(report?.candidateEmail).toLowerCase();
      return name.includes(normalizedSearch) || email.includes(normalizedSearch);
    });
  }, [reports, search]);

  const needsCompareProfile = selectedModule === 'profile_fit';
  const needsJobContext = selectedModule === 'ideal_role_profile';

  useEffect(() => {
    if (!needsCompareProfile) return;
    if (!selectedContext) return;

    if (!selectedCompareReportId || selectedCompareReportId === selectedContext.assessmentId) {
      const candidate = reports.find((item) => item.id !== selectedContext.assessmentId);
      setSelectedCompareReportId(candidate?.id || '');
    }
  }, [needsCompareProfile, selectedCompareReportId, selectedContext, reports]);

  const selectedCompareReport = useMemo(() => {
    if (!needsCompareProfile) return null;
    return reports.find((item) => item.id === selectedCompareReportId) || null;
  }, [needsCompareProfile, reports, selectedCompareReportId]);

  const selectedCompareContext = useMemo(() => {
    return selectedCompareReport ? buildCoachReportContext(selectedCompareReport) : null;
  }, [selectedCompareReport]);

  const selectedModuleMeta = useMemo(() => {
    return STRATEGIC_MODULES.find((item) => item.value === selectedModule) || STRATEGIC_MODULES[0];
  }, [selectedModule]);

  const handleSelectReport = (report) => {
    setSelectedReportId(report.id);
    setResult(null);
    setResultExpanded(false);
    setErrorMessage('');
  };

  const handleGenerate = async () => {
    if (!selectedContext || isGenerating) return;
    if (needsCompareProfile && !selectedCompareContext) {
      setErrorMessage('Selecione um segundo perfil para gerar analise de compatibilidade.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage('');
    setResult(null);
    setResultExpanded(false);

    try {
      const payload = await apiRequest('/ai/strategic-insights', {
        method: 'POST',
        requireAuth: true,
        body: {
          module: selectedModule,
          segment: selectedSegment,
          mode: selectedContext.reportType,
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
          compareContext: selectedCompareContext
            ? {
                reportId: selectedCompareContext.reportId,
                assessmentId: selectedCompareContext.assessmentId,
                reportType: selectedCompareContext.reportType,
                profileCode: selectedCompareContext.profileCode,
                dominantFactor: selectedCompareContext.dominantFactor,
                secondaryFactor: selectedCompareContext.secondaryFactor,
                respondentName: selectedCompareContext.respondentName,
                candidateEmail: selectedCompareContext.candidateEmail,
                completedAt: selectedCompareContext.completedAt,
                summary: selectedCompareContext.summary,
                strengths: selectedCompareContext.strengths,
                limitations: selectedCompareContext.limitations,
                riskProfile: selectedCompareContext.riskProfile,
                riskSignals: selectedCompareContext.riskSignals,
                developmentRecommendations: selectedCompareContext.developmentRecommendations,
              }
            : undefined,
          history: [],
          jobContext: needsJobContext
            ? {
                roleTitle: jobRoleTitle,
                seniority: jobSeniority,
                teamScope: jobScope,
                businessGoal: jobGoal,
              }
            : undefined,
        },
      });

      setResult({
        module: payload?.module || selectedModule,
        segment: payload?.segment || selectedSegment,
        provider: payload?.provider || 'groq',
        model: payload?.model || '',
        source: payload?.source || 'groq',
        durationMs: payload?.durationMs,
        data: payload?.data || {},
      });
      setResultExpanded(true);

      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } catch (error) {
      setErrorMessage(error?.message || 'Nao foi possivel gerar o insight agora. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const canRenderMain = Boolean(selectedReport && selectedContext);

  if (!canUseAiLab) {
    return (
      <div className="w-full min-w-0 max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8" data-testid="panel-ai-lab-page">
        <UpgradePrompt
          title="AI Lab bloqueado no plano atual"
          description="AI Lab está disponível a partir do plano Professional."
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
      data-testid="panel-ai-lab-page"
    >
      <div
        style={{
          padding: '24px 32px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          background: 'rgba(255,255,255,0.02)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
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
            AI Lab Enterprise
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
            IA de decisao e acao por relatorio real
          </div>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Insights Inteligentes</h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>
          Transforme leitura DISC em decisao de lideranca, desenvolvimento e alocacao com contexto real.
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
              Relatorios disponiveis
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
              <div style={{ padding: '12px 8px', fontSize: 12, color: '#fca5a5' }}>
                {toText(reportsQuery.error?.message) === 'AI_LAB_API_MODE_REQUIRED'
                  ? 'O AI Lab exige backend real autenticado (API mode).'
                  : 'Falha ao carregar relatorios.'}
              </div>
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
                      border: isSelected ? '1px solid rgba(139,92,246,0.35)' : '1px solid transparent',
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
              <div style={{ fontSize: 16, fontWeight: 600 }}>Selecione um relatorio</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', maxWidth: 320 }}>
                Escolha um relatorio na lista para habilitar os modulos estrategicos com IA.
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 920 }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  borderRadius: 14,
                  padding: '18px 22px',
                  marginBottom: 20,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Relatorio selecionado</div>
                  <div style={{ fontSize: 17, fontWeight: 700 }}>{selectedContext.respondentName}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
                    {selectedContext.candidateEmail || '-'} · {formatDate(selectedContext.completedAt)}
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
                </div>
                <ProfileBadge profile={selectedContext.profileCode || selectedContext.dominantFactor || 'S'} />
              </div>

              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  padding: '14px 16px',
                  marginBottom: 14,
                }}
              >
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
                  Insights Inteligentes
                </div>
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                  {STRATEGIC_MODULES.map((item) => {
                    const isActive = selectedModule === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => {
                          setSelectedModule(item.value);
                          setResult(null);
                          setResultExpanded(false);
                          setErrorMessage('');
                        }}
                        style={{
                          textAlign: 'left',
                          borderRadius: 10,
                          border: isActive ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.1)',
                          background: isActive ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)',
                          padding: '10px 12px',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? '#c4b5fd' : '#fff' }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 4, lineHeight: 1.4 }}>
                          {item.description}
                        </div>
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
                  marginBottom: 14,
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                <strong>{selectedModuleMeta.label}:</strong> {selectedModuleMeta.description}
              </div>

              <div style={{ marginBottom: 14 }}>
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
                  Segmento de analise
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {AI_SEGMENTS.map((segment) => {
                    const isActive = selectedSegment === segment.value;
                    return (
                      <button
                        key={segment.value}
                        type="button"
                        onClick={() => setSelectedSegment(segment.value)}
                        style={{
                          background: isActive ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)',
                          border: isActive ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: 8,
                          padding: '7px 14px',
                          fontSize: 12,
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? '#a78bfa' : 'rgba(255,255,255,0.6)',
                          cursor: 'pointer',
                        }}
                      >
                        {segment.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {needsCompareProfile ? (
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    marginBottom: 14,
                  }}
                >
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginBottom: 8 }}>
                    Segundo perfil para analise de compatibilidade
                  </div>
                  <select
                    value={selectedCompareReportId}
                    onChange={(event) => setSelectedCompareReportId(event.target.value)}
                    style={{
                      width: '100%',
                      borderRadius: 8,
                      border: '1px solid rgba(255,255,255,0.16)',
                      background: 'rgba(13,14,26,0.72)',
                      color: '#fff',
                      fontSize: 13,
                      padding: '9px 10px',
                      outline: 'none',
                    }}
                  >
                    <option value="">Selecione o segundo perfil</option>
                    {reports
                      .filter((item) => item.id !== selectedContext.assessmentId)
                      .map((item) => (
                        <option key={item.id} value={item.id} style={{ background: '#0d0e1a' }}>
                          {item.respondentName} · {formatDate(item.completedAt)}
                        </option>
                      ))}
                  </select>
                </div>
              ) : null}

              {needsJobContext ? (
                <div
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    marginBottom: 14,
                    display: 'grid',
                    gap: 8,
                  }}
                >
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>Contexto da vaga</div>
                  <input value={jobRoleTitle} onChange={(event) => setJobRoleTitle(event.target.value)} placeholder="Cargo alvo" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(13,14,26,0.72)', color: '#fff', fontSize: 13, padding: '9px 10px', outline: 'none' }} />
                  <input value={jobSeniority} onChange={(event) => setJobSeniority(event.target.value)} placeholder="Senioridade (ex.: pleno, senior)" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(13,14,26,0.72)', color: '#fff', fontSize: 13, padding: '9px 10px', outline: 'none' }} />
                  <input value={jobScope} onChange={(event) => setJobScope(event.target.value)} placeholder="Escopo de equipe" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(13,14,26,0.72)', color: '#fff', fontSize: 13, padding: '9px 10px', outline: 'none' }} />
                  <input value={jobGoal} onChange={(event) => setJobGoal(event.target.value)} placeholder="Objetivo de negocio" style={{ width: '100%', borderRadius: 8, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(13,14,26,0.72)', color: '#fff', fontSize: 13, padding: '9px 10px', outline: 'none' }} />
                </div>
              ) : null}

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
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  marginBottom: 18,
                }}
              >
                {isGenerating ? 'Gerando insight...' : `Gerar ${selectedModuleMeta.label}`}
              </button>

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
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#a78bfa' }}>{selectedModuleMeta.label}</span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                        Segmento: {AI_SEGMENTS.find((item) => item.value === result.segment)?.label || result.segment}
                      </span>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
                        Fonte: {result.provider} {result.model ? `· ${result.model}` : ''}
                      </span>
                      {Number(result.durationMs) > 0 ? (
                        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>Tempo: {Math.round(result.durationMs)}ms</span>
                      ) : null}
                    </div>
                    <span style={{ fontSize: 14, color: '#a78bfa' }}>{resultExpanded ? '▲' : '▼'}</span>
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
                    <div style={{ padding: '16px 18px 20px' }}>
                      {renderStrategicResult(result.module, result.data)}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <style>{`
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
