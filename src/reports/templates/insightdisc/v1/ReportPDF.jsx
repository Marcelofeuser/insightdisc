import React, { useMemo } from 'react';
import '@/styles/report-print.css';
import { generateDiscInterpretation } from '@/modules/disc/discInterpretation';

import Page01Cover from './pages/Page01Cover';
import Page02Summary from './pages/Page02Summary';
import Page03Methodology from './pages/Page03Methodology';
import Page04Overview from './pages/Page04Overview';
import Page05Natural from './pages/Page05Natural';
import Page06Adapted from './pages/Page06Adapted';
import Page07Comparison from './pages/Page07Comparison';
import Page08DominanceStrengths from './pages/Page08DominanceStrengths';
import Page09DominanceRisks from './pages/Page09DominanceRisks';
import Page10InfluenceStrengths from './pages/Page10InfluenceStrengths';
import Page11InfluenceRisks from './pages/Page11InfluenceRisks';
import Page12SteadinessStrengths from './pages/Page12SteadinessStrengths';
import Page13SteadinessRisks from './pages/Page13SteadinessRisks';
import Page14ConformityStrengths from './pages/Page14ConformityStrengths';
import Page15ConformityRisks from './pages/Page15ConformityRisks';
import Page16Communication from './pages/Page16Communication';
import Page17Environment from './pages/Page17Environment';
import Page18LeadershipCareer from './pages/Page18LeadershipCareer';
import Page19DevelopmentPlan from './pages/Page19DevelopmentPlan';
import Page20Closing from './pages/Page20Closing';

const FACTOR_LABELS = {
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade',
};

const FACTOR_CONTENT = {
  D: {
    strengths: ['Rapidez na decisão', 'Foco em metas', 'Assertividade em cenários críticos'],
    attention: ['Impaciência com ritmo lento', 'Tom excessivamente direto', 'Delegação insuficiente'],
    tips: ['Ouvir antes de decidir', 'Definir prioridades por impacto', 'Delegar com check-ins curtos'],
  },
  I: {
    strengths: ['Facilidade de relacionamento', 'Comunicação persuasiva', 'Energia para mobilizar times'],
    attention: ['Dispersão em múltiplas pautas', 'Excesso de otimismo', 'Baixa aderência a rotina'],
    tips: ['Fechar acordos com prazo', 'Priorizar 3 objetivos semanais', 'Usar indicadores de execução'],
  },
  S: {
    strengths: ['Estabilidade emocional', 'Escuta ativa', 'Confiabilidade na execução'],
    attention: ['Evitar conflitos necessários', 'Dificuldade com mudanças abruptas', 'Baixa exposição de opinião'],
    tips: ['Preparar conversas difíceis', 'Comunicar limites com clareza', 'Adaptar ritmo em projetos críticos'],
  },
  C: {
    strengths: ['Análise consistente', 'Qualidade e precisão', 'Tomada de decisão baseada em dados'],
    attention: ['Perfeccionismo', 'Excesso de análise', 'Resistência a abordagens informais'],
    tips: ['Definir critério de pronto', 'Trabalhar com hipóteses', 'Equilibrar rigor e velocidade'],
  },
};

const COMMUNICATION_BY_FACTOR = {
  D: 'Seja direto, traga contexto de negócio e conclua com decisão clara.',
  I: 'Use linguagem envolvente, destaque impacto e mantenha espaço para troca.',
  S: 'Comunique com calma, previsibilidade e alinhamento de expectativas.',
  C: 'Estruture a mensagem com dados, critérios e próximos passos objetivos.',
};

function safeNum(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeScores(scores = {}) {
  return {
    D: safeNum(scores?.D),
    I: safeNum(scores?.I),
    S: safeNum(scores?.S),
    C: safeNum(scores?.C),
  };
}

function topTwo(scores) {
  const sorted = Object.entries(scores)
    .map(([factor, value]) => ({ factor, value }))
    .sort((a, b) => b.value - a.value);

  return {
    dominant: sorted[0]?.factor || 'D',
    secondary: sorted[1]?.factor || 'I',
  };
}

function dateToPt(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('pt-BR');
}

function buildReportData(assessment, reportModel) {
  const results = assessment?.results || assessment?.disc_results || {};
  const modelCharts = reportModel?.charts || {};

  const natural = normalizeScores(
    modelCharts?.natural ||
      results?.natural_profile ||
      results?.natural ||
      assessment?.natural_profile ||
      assessment?.scores
  );
  const adapted = normalizeScores(
    modelCharts?.adapted ||
      results?.adapted_profile ||
      results?.adapted ||
      assessment?.adapted_profile ||
      natural
  );
  const summary = normalizeScores(
    modelCharts?.summary ||
      results?.summary_profile ||
      results?.summary ||
      assessment?.summary_profile ||
      natural
  );

  const ranked = topTwo(natural);
  const dominant = reportModel?.meta?.dominant || results?.dominant_factor || ranked.dominant;
  const secondary = reportModel?.meta?.secondary || results?.secondary_factor || ranked.secondary;
  const interpretation = generateDiscInterpretation(natural);

  const motivatorByDominant = {
    D: ['Desafios relevantes', 'Autonomia para decidir', 'Meta clara com resultado mensurável', 'Ritmo dinâmico'],
    I: ['Interação com pessoas', 'Reconhecimento social', 'Ambiente colaborativo', 'Liberdade para criar conexões'],
    S: ['Estabilidade de processo', 'Relacionamentos de confiança', 'Ambiente previsível', 'Tempo para executar bem'],
    C: ['Critérios claros', 'Qualidade técnica', 'Dados confiáveis', 'Planejamento estruturado'],
  };

  const drainerByDominant = {
    D: ['Burocracia excessiva', 'Decisão lenta', 'Falta de autonomia', 'Ambiente sem direção'],
    I: ['Isolamento social', 'Rotina sem variedade', 'Feedback escasso', 'Comunicação fria'],
    S: ['Mudanças sem contexto', 'Conflitos constantes', 'Insegurança de prioridades', 'Pressão imprevisível'],
    C: ['Ambiguidade recorrente', 'Baixo padrão de qualidade', 'Mudanças sem critério', 'Falta de dados'],
  };

  const careerStrengths = [
    `Dominante em ${FACTOR_LABELS[dominant] || dominant} com potencial de execução consistente`,
    ...(interpretation?.strengths || []),
  ];

  const careerDevelopment = [
    ...(interpretation?.risks || []),
    'Transformar feedback em rotina quinzenal',
    'Padronizar decisões com critérios claros',
  ];

  return {
    meta: {
      assessmentId: assessment?.id || reportModel?.meta?.id || 'sem-id',
      respondentName:
        reportModel?.meta?.respondentName ||
        assessment?.respondent_name ||
        assessment?.name ||
        assessment?.full_name ||
        '',
      respondentEmail:
        reportModel?.meta?.respondentEmail ||
        assessment?.respondent_email ||
        assessment?.email ||
        '',
      generatedAt: dateToPt(new Date().toISOString()),
      dominant,
      secondary,
      dominantLabel: FACTOR_LABELS[dominant] || dominant,
      secondaryLabel: FACTOR_LABELS[secondary] || secondary,
    },
    scores: {
      natural,
      adapted,
      summary,
    },
    interpretation: {
      summary:
        interpretation?.summary ||
        'Perfil com dados insuficientes para interpretação detalhada.',
      leadership:
        interpretation?.leadership || 'Estilo de liderança indisponível no momento.',
      communication:
        interpretation?.communication || 'Estilo de comunicação indisponível no momento.',
      strengths:
        interpretation?.strengths?.length ? interpretation.strengths : FACTOR_CONTENT[dominant]?.strengths,
      risks:
        interpretation?.risks?.length ? interpretation.risks : FACTOR_CONTENT[dominant]?.attention,
      environment:
        interpretation?.environment || 'Ambiente ideal indisponível no momento.',
    },
    factors: FACTOR_CONTENT,
    communicationByFactor: COMMUNICATION_BY_FACTOR,
    motivators: motivatorByDominant[dominant] || motivatorByDominant.D,
    drainers: drainerByDominant[dominant] || drainerByDominant.D,
    careerStrengths,
    careerDevelopment,
    actionPlan: [
      'Semana 1: definir 1 comportamento-chave para ajustar nas interações críticas.',
      'Semana 2: coletar feedback curto de 2 pessoas após reuniões relevantes.',
      'Semana 3: repetir o ajuste em 3 contextos diferentes (reunião, execução e follow-up).',
      'Semana 4: revisar resultados e consolidar um ritual de melhoria contínua.',
    ],
  };
}

const PAGE_COMPONENTS = [
  Page01Cover,
  Page02Summary,
  Page03Methodology,
  Page04Overview,
  Page05Natural,
  Page06Adapted,
  Page07Comparison,
  Page08DominanceStrengths,
  Page09DominanceRisks,
  Page10InfluenceStrengths,
  Page11InfluenceRisks,
  Page12SteadinessStrengths,
  Page13SteadinessRisks,
  Page14ConformityStrengths,
  Page15ConformityRisks,
  Page16Communication,
  Page17Environment,
  Page18LeadershipCareer,
  Page19DevelopmentPlan,
  Page20Closing,
];

export default function ReportPDF({ assessment, reportModel }) {
  const data = useMemo(() => buildReportData(assessment, reportModel), [assessment, reportModel]);

  return (
    <div className="pdf-root">
      {PAGE_COMPONENTS.map((PageComponent, index) => (
        <PageComponent
          key={`pdf-page-${index + 1}`}
          data={data}
          pageNumber={index + 1}
        />
      ))}
    </div>
  );
}
