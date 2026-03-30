import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import EmptyState from '@/components/ui/EmptyState';
import PanelState from '@/components/ui/PanelState';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { UpgradePrompt } from '@/modules/billing';
import { PRODUCT_FEATURES, hasFeatureAccessByPlan } from '@/modules/billing/planGuard';
import {
  BehaviorInsightsPanel,
  DiscDistributionChart,
  DiscRadarChart,
  DominantProfilesPanel,
  TeamDiscMap,
} from '@/modules/analytics/components';
import { apiRequest } from '@/lib/apiClient';
import { mapCandidateReports } from '@/modules/report/backendReports';
import {
  TeamAutoCompositionPanel,
  TeamCompositionGrid,
  TeamDimensionsPanel,
  TeamFiltersBar,
  TeamGapsPanel,
  TeamOverviewHero,
} from '@/modules/teamIntelligence/components';
import {
  applyTeamFilters,
  buildLocalTeamMapFromAssessments,
  buildTeamFilterOptions,
  buildTeamIntelligence,
} from '@/modules/teamIntelligence/engine';
import {
  BehaviorAnalyticsExecutivePanel,
  BenchmarkPanel,
  BehaviorHistoryPanel,
  buildBehaviorAnalytics,
} from '@/modules/behaviorAnalytics';

function normalizeFallbackAssessment(item = {}) {
  const summary = item?.results?.summary_profile || item?.disc_results?.summary || item?.summary || {};
  const dominantFactor =
    String(item?.results?.dominant_factor || item?.disc_results?.dominant_factor || '')
      .trim()
      .toUpperCase() ||
    ['D', 'I', 'S', 'C'].sort((a, b) => Number(summary?.[b] || 0) - Number(summary?.[a] || 0))[0] ||
    'D';

  return {
    assessmentId: String(item?.assessmentId || item?.id || '').trim(),
    candidateName: item?.respondent_name || item?.candidate_name || item?.lead_name || 'Participante',
    candidateEmail: item?.lead_email || item?.candidateEmail || item?.user_email || '',
    createdAt: item?.completed_at || item?.created_date || '',
    completedAt: item?.completed_at || item?.created_date || '',
    dominantFactor,
    profileCode:
      String(item?.disc_profile?.profile?.key || item?.disc_profile?.profileKey || dominantFactor)
        .trim()
        .toUpperCase() || 'DISC',
    department: '',
    role: '',
    manager: '',
    city: '',
    disc: summary,
  };
}

function formatDate(value) {
  if (!value) return 'Sem data';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sem data';
  return parsed.toLocaleDateString('pt-BR');
}

function isOpaqueUiErrorMessage(message = '') {
  const normalized = String(message || '').trim();
  if (!normalized) return true;
  return /^HTTP_\d+$/i.test(normalized) || /^[A-Z0-9_:-]+$/.test(normalized);
}

function normalizeTeamMapError(error, fallback = 'Não foi possível carregar avaliações para o mapa comportamental.') {
  const rawMessage = String(error?.payload?.message || error?.message || '')
    .replace(/\s+/g, ' ')
    .trim();
  const code = String(error?.code || error?.payload?.error || error?.payload?.reason || '')
    .trim()
    .toUpperCase();

  if (!rawMessage) return fallback;
  if (code.includes('AUTH_REQUIRED') || code.includes('HTTP_401')) {
    return 'Sua sessão expirou. Faça login novamente para acessar o mapa de equipe.';
  }
  if (code.includes('FORBIDDEN') || code.includes('ASSESSMENTS_NOT_ACCESSIBLE')) {
    return 'Você não possui permissão para analisar uma ou mais avaliações selecionadas.';
  }
  if (code.includes('NOT_FOUND') || /^HTTP_404$/i.test(code)) {
    return 'Não encontramos avaliações elegíveis para montar o mapa de equipe.';
  }
  if (/the page could not be found/i.test(rawMessage) || /\bnot[_\s-]?found\b/i.test(rawMessage)) {
    return fallback;
  }
  if (isOpaqueUiErrorMessage(rawMessage)) {
    return fallback;
  }

  return rawMessage;
}

export default function TeamMap() {
  const { toast } = useToast();
  const { access, plan } = useAuth();
  const resolvedPlan = String(plan || access?.plan || '').trim().toLowerCase() || 'personal';
  const canUseTeamMap = hasFeatureAccessByPlan(resolvedPlan, PRODUCT_FEATURES.TEAM_MAP);
  const [assessments, setAssessments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [teamMap, setTeamMap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [dataMode, setDataMode] = useState('api');

  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    period: 'all',
    dominantFactor: 'all',
    department: 'all',
    role: 'all',
    manager: 'all',
    city: 'all',
  });

  const filterOptions = useMemo(() => buildTeamFilterOptions(assessments), [assessments]);

  const filteredAssessments = useMemo(() => {
    const byFilters = applyTeamFilters(assessments, filters);
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
    if (!normalizedSearch) return byFilters;

    return byFilters.filter((item) => {
      const name = String(item?.candidateName || '').toLowerCase();
      const email = String(item?.candidateEmail || '').toLowerCase();
      const dominant = String(item?.dominantFactor || '').toLowerCase();
      const profileCode = String(item?.profileCode || '').toLowerCase();
      const role = String(item?.role || '').toLowerCase();
      const department = String(item?.department || '').toLowerCase();
      return (
        name.includes(normalizedSearch) ||
        email.includes(normalizedSearch) ||
        dominant.includes(normalizedSearch) ||
        profileCode.includes(normalizedSearch) ||
        role.includes(normalizedSearch) ||
        department.includes(normalizedSearch)
      );
    });
  }, [assessments, filters, searchTerm]);

  const fetchAssessments = async () => {
    setIsLoading(true);
    setError('');

    try {
      const payload = await apiRequest('/api/team-map/assessments', {
        method: 'GET',
        requireAuth: true,
      });
      const list = Array.isArray(payload?.assessments) ? payload.assessments : [];
      setAssessments(list);
      setDataMode('api');

      setSelectedIds((previous) => {
        const stillValid = previous.filter((id) => list.some((item) => item?.assessmentId === id));
        if (stillValid.length) return stillValid;
        return list.slice(0, Math.min(8, list.length)).map((item) => String(item?.assessmentId || '').trim()).filter(Boolean);
      });
      return;
    } catch (apiError) {
      try {
        const fallbackPayload = await apiRequest('/candidate/me/reports', {
          method: 'GET',
          requireAuth: true,
        });

        const mapped = mapCandidateReports(fallbackPayload?.reports || []).map(normalizeFallbackAssessment).filter((item) => item.assessmentId);
        setAssessments(mapped);
        setDataMode('fallback');

        setSelectedIds((previous) => {
          const stillValid = previous.filter((id) => mapped.some((item) => item?.assessmentId === id));
          if (stillValid.length) return stillValid;
          return mapped.slice(0, Math.min(8, mapped.length)).map((item) => item.assessmentId);
        });

        toast({
          title: 'Modo de contingência ativo',
          description: 'Dados de equipe carregados via fallback local para manter continuidade da análise.',
        });
        return;
      } catch (fallbackError) {
        const message = normalizeTeamMapError(
          fallbackError?.message ? fallbackError : apiError,
          'Não foi possível carregar avaliações para o mapa comportamental.',
        );
        setError(message);
        setAssessments([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const toggleAssessmentSelection = (assessmentId) => {
    if (!assessmentId) return;

    setSelectedIds((previous) => {
      if (previous.includes(assessmentId)) {
        return previous.filter((item) => item !== assessmentId);
      }
      return [...previous, assessmentId];
    });
  };

  const handleAnalyze = async () => {
    if (!selectedIds.length) {
      toast({
        title: 'Seleção vazia',
        description: 'Selecione ao menos uma avaliação para montar o mapa organizacional.',
        variant: 'destructive',
      });
      return;
    }

    setIsAnalyzing(true);
    setError('');

    try {
      const payload = await apiRequest('/api/team-map/analyze', {
        method: 'POST',
        requireAuth: true,
        body: {
          assessmentIds: selectedIds,
        },
      });

      setTeamMap(payload?.teamMap || null);
      setDataMode('api');
      toast({
        title: 'Mapa atualizado',
        description: 'Camada de inteligência organizacional gerada com sucesso.',
      });
      return;
    } catch (apiError) {
      const localTeamMap = buildLocalTeamMapFromAssessments(assessments, selectedIds);
      if (localTeamMap?.selectedCount > 0) {
        setTeamMap(localTeamMap);
        setDataMode('fallback');
        toast({
          title: 'Mapa gerado em modo local',
          description: 'A análise foi montada com os dados disponíveis no cliente.',
        });
        return;
      }

      const message = normalizeTeamMapError(apiError, 'Falha ao analisar equipe.');
      setError(message);
      toast({
        title: 'Erro ao gerar mapa',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const intelligence = useMemo(
    () => (teamMap ? buildTeamIntelligence(teamMap) : null),
    [teamMap],
  );
  const behaviorAnalytics = useMemo(() => {
    if (!intelligence) return null;
    const history = (intelligence.members || []).map((member) => ({
      id: member.assessmentId,
      date: member.createdAt,
      profileCode: member.profileCode,
      scores: member.scores,
    }));
    return buildBehaviorAnalytics({
      members: intelligence.members || [],
      history,
    });
  }, [intelligence]);

  const selectedIdsSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const selectedCountVisible = filteredAssessments.filter((item) =>
    selectedIdsSet.has(String(item?.assessmentId || '')),
  ).length;

  if (!canUseTeamMap) {
    return (
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <UpgradePrompt
            title="Mapa comportamental organizacional bloqueado"
            description="A visao executiva de equipe, gaps e dimensoes organizacionais esta disponivel no plano Business."
            requiredPlanLabel="Business"
            ctaLabel="Fazer upgrade"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6" data-testid="team-map-page">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Mapa de Equipes</h1>
              <p className="mt-1 text-sm text-slate-600">Mapa Comportamental de Equipes com inteligência organizacional DISC para RH, liderança e consultoria.</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">Selecionados: {selectedIds.length}</Badge>
              <Badge variant="secondary">Modo: {dataMode === 'api' ? 'API' : 'Fallback'}</Badge>
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2"
                onClick={fetchAssessments}
                disabled={isLoading || isAnalyzing}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Atualizar
              </Button>
              <Button
                className="h-10 bg-indigo-600 hover:bg-indigo-700"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !selectedIds.length}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando mapa...
                  </>
                ) : (
                  'Gerar mapa organizacional'
                )}
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <TeamFiltersBar
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              filters={filters}
              onFiltersChange={(partial) => setFilters((prev) => ({ ...prev, ...partial }))}
              options={filterOptions}
              filteredCount={filteredAssessments.length}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Seleção de avaliações</h2>
            <p className="text-xs text-slate-500">Selecionadas visíveis: {selectedCountVisible}</p>
          </div>

          {isLoading ? (
            <PanelState
              type="loading"
              title="Carregando avaliações da equipe"
              description="Estamos preparando a base para montagem do mapa organizacional."
            />
          ) : null}

          {!isLoading && error ? (
            <PanelState
              type="error"
              title="Erro ao carregar mapa de equipe"
              description={error}
            />
          ) : null}

          {!isLoading && !error && !filteredAssessments.length ? (
            <EmptyState
              icon={Users}
              title="Nenhuma avaliação disponível"
              description="Não há avaliações DISC com os filtros atuais. Ajuste os filtros ou atualize a base."
              size="compact"
              tone="soft"
            />
          ) : null}

          {!isLoading && filteredAssessments.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredAssessments.map((assessment) => {
                const assessmentId = String(assessment?.assessmentId || '');
                const checked = selectedIdsSet.has(assessmentId);

                return (
                  <label
                    key={assessmentId}
                    htmlFor={`team-map-${assessmentId}`}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                      checked
                        ? 'border-indigo-300 bg-indigo-50/70 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Checkbox
                      id={`team-map-${assessmentId}`}
                      checked={checked}
                      onCheckedChange={() => toggleAssessmentSelection(assessmentId)}
                    />

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">{assessment?.candidateName || 'Participante'}</div>
                      <div className="truncate text-xs text-slate-500">{assessment?.candidateEmail || 'Sem e-mail'}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                        <Badge variant="secondary">{assessment?.profileCode || 'DISC'}</Badge>
                        <Badge variant="outline">{assessment?.dominantFactor || '-'}</Badge>
                        <span>{formatDate(assessment?.completedAt || assessment?.createdAt)}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          ) : null}
        </section>

        {intelligence ? (
          <>
            <TeamOverviewHero intelligence={intelligence} />

            <section className="grid gap-4 xl:grid-cols-2">
              <DiscDistributionChart
                title="Distribuição DISC agregada"
                subtitle="Participação média dos fatores D, I, S e C na equipe analisada."
                distribution={intelligence.distribution}
                predominantFactor={intelligence.predominantFactor}
              />
              <DiscRadarChart
                title="Radar comportamental coletivo"
                subtitle="Leitura global da intensidade dos fatores DISC para análise de equilíbrio do grupo."
                profile={intelligence.distribution}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <DominantProfilesPanel
                title="Perfis predominantes"
                subtitle="Combinações DISC mais frequentes na equipe selecionada."
                profiles={intelligence.profileFrequencies}
              />
              <BehaviorInsightsPanel
                title="Insights organizacionais"
                subtitle="Sinais automáticos sobre cultura, comunicação, execução e complementaridade do time."
                items={intelligence.insights}
                distribution={intelligence.distribution}
                sampleSize={intelligence.totalMembers}
              />
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <TeamDiscMap
                title="Mapa de perfis da equipe"
                subtitle="Visualização rápida da composição comportamental para decisões de alocação e liderança."
                members={intelligence.members.map((member) => ({
                  id: member.assessmentId,
                  name: member.name,
                  profileKey: member.profileCode,
                  dominantFactor: member.dominantFactor,
                  date: member.createdAt,
                }))}
              />
              <TeamCompositionGrid members={intelligence.members} />
            </section>

            <TeamGapsPanel gaps={intelligence.gaps} />

            <TeamDimensionsPanel dimensions={intelligence.dimensions} />

            <TeamAutoCompositionPanel analysis={intelligence.balanceIntelligence} />

            {behaviorAnalytics ? (
              <>
                <BehaviorAnalyticsExecutivePanel analytics={behaviorAnalytics} />
                <section className="grid gap-4 xl:grid-cols-2">
                  <BenchmarkPanel benchmarkComparison={behaviorAnalytics.benchmarkComparison} />
                  <BehaviorHistoryPanel evolution={behaviorAnalytics.evolution} />
                </section>
              </>
            ) : null}
          </>
        ) : (
          <PanelState
            title="Mapa organizacional ainda não gerado"
            description='Selecione as avaliações da equipe e clique em "Gerar mapa organizacional" para habilitar a camada de inteligência comportamental.'
          />
        )}
      </div>
    </div>
  );
}
