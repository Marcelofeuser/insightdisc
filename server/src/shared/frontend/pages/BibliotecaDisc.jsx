import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BookOpenText, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest, getApiBaseUrl, getApiErrorMessage } from '@/lib/apiClient';
import { normalizeDiscSnapshot } from '@/modules/report/backendReports';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PanelState from '@/components/ui/PanelState';
import EmptyState from '@/components/ui/EmptyState';

const THEMES = Object.freeze([
  {
    id: 'leadership',
    label: 'Lideranca',
    subtitle: 'Direcao, decisao e impacto em resultados.',
  },
  {
    id: 'communication',
    label: 'Comunicacao',
    subtitle: 'Clareza, influencia e relacionamento no dia a dia.',
  },
  {
    id: 'recruitment',
    label: 'Recrutamento',
    subtitle: 'Leitura de aderencia comportamental para funcao e contexto.',
  },
  {
    id: 'development',
    label: 'Desenvolvimento',
    subtitle: 'Plano pratico para evolucao comportamental continua.',
  },
]);

function toText(value) {
  return String(value || '').trim();
}

function toList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
}

function normalizeMode(value = '') {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === 'personal' || mode === 'professional' || mode === 'business') return mode;
  return 'professional';
}

function resolveThemeBlocks(themeId, content = {}) {
  const summary = toText(content.summary || content.executiveSummary);
  const executiveSummary = toText(content.executiveSummary || content.summary);
  const communicationStyle = toText(content.communicationStyle);
  const leadershipStyle = toText(content.leadershipStyle);
  const workStyle = toText(content.workStyle);
  const pressureBehavior = toText(content.pressureBehavior);
  const relationshipStyle = toText(content.relationshipStyle);
  const professionalPositioning = toText(content.professionalPositioning);
  const strengths = toList(content.strengths);
  const limitations = toList(content.limitations);
  const developmentRecommendations = toList(content.developmentRecommendations);
  const careerRecommendations = toList(content.careerRecommendations);
  const businessRecommendations = toList(content.businessRecommendations);

  if (themeId === 'leadership') {
    return [
      { title: 'Resumo executivo', text: executiveSummary || summary },
      { title: 'Estilo de lideranca', text: leadershipStyle || communicationStyle || summary },
      { title: 'Comportamento sob pressao', text: pressureBehavior || summary },
      { title: 'Acoes recomendadas', items: businessRecommendations.length ? businessRecommendations : developmentRecommendations },
    ];
  }

  if (themeId === 'communication') {
    return [
      { title: 'Leitura de comunicacao', text: communicationStyle || summary },
      { title: 'Relacionamento e colaboracao', text: relationshipStyle || executiveSummary || summary },
      { title: 'Forcas de comunicacao', items: strengths },
      { title: 'Cuidados de comunicacao', items: limitations },
    ];
  }

  if (themeId === 'recruitment') {
    return [
      { title: 'Posicionamento profissional', text: professionalPositioning || executiveSummary || summary },
      { title: 'Pontos fortes para contexto de vaga', items: strengths },
      { title: 'Riscos e sinais de atencao', items: limitations },
      { title: 'Aplicacoes de carreira', items: careerRecommendations.length ? careerRecommendations : businessRecommendations },
    ];
  }

  return [
    { title: 'Resumo de desenvolvimento', text: summary || executiveSummary },
    { title: 'Estilo de trabalho', text: workStyle || communicationStyle || summary },
    { title: 'Recomendacoes de evolucao', items: developmentRecommendations.length ? developmentRecommendations : businessRecommendations },
    { title: 'Riscos de exagero', items: limitations },
  ];
}

function scoreFromSnapshot(snapshot = null, factor = '') {
  return Math.max(0, Number(snapshot?.summary?.[factor] || 0));
}

export default function BibliotecaDisc() {
  const { access } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0].id);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [insightsByTheme, setInsightsByTheme] = useState({});

  const reportsQuery = useQuery({
    queryKey: ['biblioteca-disc-reports', apiBaseUrl, access?.userId, access?.email],
    queryFn: async () => {
      const payload = await apiRequest('/candidate/me/reports', {
        method: 'GET',
        requireAuth: true,
        retry: 1,
      });
      return Array.isArray(payload?.reports) ? payload.reports : [];
    },
    enabled: Boolean(apiBaseUrl && (access?.userId || access?.email)),
  });

  const context = useMemo(() => {
    const reports = Array.isArray(reportsQuery.data) ? reportsQuery.data : [];

    for (const report of reports) {
      const snapshot = normalizeDiscSnapshot(report?.discProfile || report?.disc_profile);
      if (!snapshot?.summary) continue;

      const mode = normalizeMode(report?.reportType || report?.report_type);
      const nome = toText(report?.candidateName) || toText(access?.user?.name) || 'Usuario InsightDISC';

      return {
        report,
        snapshot,
        mode,
        nome,
        cargo: mode === 'business' ? 'Lideranca e Gestao' : mode === 'personal' ? 'Desenvolvimento Pessoal' : 'Profissional',
        empresa: access?.tenantId ? 'Workspace InsightDISC' : 'InsightDISC',
        scores: {
          D: scoreFromSnapshot(snapshot, 'D'),
          I: scoreFromSnapshot(snapshot, 'I'),
          S: scoreFromSnapshot(snapshot, 'S'),
          C: scoreFromSnapshot(snapshot, 'C'),
        },
      };
    }

    return null;
  }, [reportsQuery.data, access?.tenantId, access?.user?.name]);

  const selectedThemeMeta = THEMES.find((theme) => theme.id === selectedTheme) || THEMES[0];
  const selectedThemeInsight = insightsByTheme[selectedTheme] || null;

  async function handleGenerateTheme() {
    if (!context || isGenerating) return;
    setIsGenerating(true);
    setGenerateError('');

    try {
      const payload = await apiRequest('/ai/disc-insights', {
        method: 'POST',
        requireAuth: true,
        body: {
          mode: context.mode,
          nome: context.nome,
          cargo: context.cargo,
          empresa: context.empresa,
          D: context.scores.D,
          I: context.scores.I,
          S: context.scores.S,
          C: context.scores.C,
        },
      });

      setInsightsByTheme((current) => ({
        ...current,
        [selectedTheme]: {
          generatedAt: new Date().toISOString(),
          payload,
          blocks: resolveThemeBlocks(selectedTheme, payload?.content || {}),
        },
      }));
    } catch (error) {
      setGenerateError(
        getApiErrorMessage(error, {
          apiBaseUrl,
          fallback: 'Nao foi possivel gerar conteudo personalizado agora.',
        }),
      );
    } finally {
      setIsGenerating(false);
    }
  }

  if (!apiBaseUrl) {
    return (
      <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <PanelState
          type="error"
          title="Backend nao configurado"
          description="A Biblioteca DISC com IA precisa de VITE_API_URL para carregar relatorios e gerar conteudo."
        />
      </div>
    );
  }

  if (reportsQuery.isLoading) {
    return (
      <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <PanelState
          type="loading"
          title="Carregando seu contexto DISC"
          description="Buscando o ultimo relatorio para personalizar a biblioteca por tema."
        />
      </div>
    );
  }

  if (reportsQuery.isError) {
    return (
      <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <PanelState
          type="error"
          title="Nao foi possivel carregar a Biblioteca DISC"
          description={getApiErrorMessage(reportsQuery.error, {
            apiBaseUrl,
            fallback: 'Falha ao buscar o historico de relatorios.',
          })}
          ctaLabel="Tentar novamente"
          onCtaClick={() => reportsQuery.refetch()}
        />
      </div>
    );
  }

  if (!context) {
    return (
      <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
        <EmptyState
          icon={BookOpenText}
          title="Sem relatorio concluido para personalizar"
          description="Conclua ao menos uma avaliacao para liberar conteudo tematico personalizado na Biblioteca DISC."
          ctaLabel="Ir para Minhas Avaliacoes"
          onCtaClick={() => {
            window.location.assign('/MyAssessments');
          }}
          tone="soft"
        />
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-6xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8">
      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Painel V2</p>
              <CardTitle className="mt-2 text-2xl font-semibold text-slate-900">
                Biblioteca DISC Personalizada
              </CardTitle>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">
                Conteudos por tema gerados com IA a partir do seu ultimo perfil DISC concluido.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Modo: {context.mode}</Badge>
              <Badge variant="outline">
                Perfil: {context.snapshot?.dominantFactor || '-'} / {context.snapshot?.secondaryFactor || '-'}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Contexto atual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              {['D', 'I', 'S', 'C'].map((factor) => {
                const score = context.scores[factor];
                return (
                  <div key={factor} className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{factor}</span>
                      <span>{Math.round(score)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-indigo-500"
                        style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              {THEMES.map((theme) => {
                const isActive = selectedTheme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setSelectedTheme(theme.id)}
                    className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                      isActive
                        ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-sm font-semibold">{theme.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{theme.subtitle}</p>
                  </button>
                );
              })}
            </div>

            <Button
              type="button"
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              onClick={handleGenerateTheme}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {selectedThemeInsight ? 'Atualizar conteudo do tema' : `Gerar tema: ${selectedThemeMeta.label}`}
            </Button>

            {generateError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {generateError}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base font-semibold text-slate-900">
                Tema: {selectedThemeMeta.label}
              </CardTitle>
              {selectedThemeInsight?.payload?.provider ? (
                <Badge variant="outline">
                  IA: {selectedThemeInsight.payload.provider}
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedThemeInsight ? (
              <PanelState
                type="empty"
                title="Conteudo ainda nao gerado"
                description={`Clique em "Gerar tema: ${selectedThemeMeta.label}" para montar recomendacoes personalizadas com IA.`}
              />
            ) : (
              <div className="space-y-4">
                {selectedThemeInsight.blocks.map((block, index) => (
                  <section key={`${block.title}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="text-sm font-semibold text-slate-900">{block.title}</h3>
                    {block.text ? (
                      <p className="mt-2 text-sm leading-6 text-slate-700">{block.text}</p>
                    ) : null}
                    {Array.isArray(block.items) && block.items.length > 0 ? (
                      <ul className="mt-2 space-y-2">
                        {block.items.map((item, itemIndex) => (
                          <li key={`${itemIndex}-${item}`} className="text-sm text-slate-700">
                            - {item}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                ))}
              </div>
            )}

            <div className="mt-5 border-t border-slate-100 pt-4">
              <Link to="/MyAssessments#reports" className="text-sm font-medium text-indigo-700 hover:text-indigo-800">
                Ver historico completo de relatorios
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
