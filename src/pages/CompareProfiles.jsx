import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCcw, Search, Shuffle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import EmptyState from '@/components/ui/EmptyState';
import PanelShell from '@/components/ui/PanelShell';
import PanelState from '@/components/ui/PanelState';
import SectionHeader from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/AuthContext';
import { apiRequest, getApiBaseUrl, getApiToken } from '@/lib/apiClient';
import {
  ComparisonHero,
  ComparisonInsightsGrid,
  ComparisonRecommendationsPanel,
  ComparisonTechnicalPanel,
  ComparativeRadarPanel,
  FactorDifferencePanel,
  ProfileComparisonCard,
  SynergyTensionPanel,
} from '@/modules/discComparison/components';
import {
  COMPARISON_MODE,
  buildIdealRoleProfile,
  buildTeamBenchmarkProfile,
  compareDiscProfiles,
  getComparisonModeMeta,
  listIdealRoleProfiles,
  normalizeComparableProfile,
} from '@/modules/discComparison';
import { ComparativeReportSection } from '@/modules/discComparison/sections';
import {
  resolveAssessmentDiscSnapshot,
  resolveAssessmentIdentity,
} from '@/modules/assessmentResult/assessmentResultData';
import { buildAssessmentResultPath } from '@/modules/assessmentResult/routes';
import { normalizeDiscScores } from '@/modules/discEngine';
import { mapCandidateReports } from '@/modules/report/backendReports';

function formatDate(value) {
  if (!value) return 'Sem data';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sem data';
  return parsed.toLocaleDateString('pt-BR');
}

function resolveScores(item = {}) {
  const directScores = normalizeDiscScores(item?.disc || item?.scores || {});
  if (directScores.hasValidInput) {
    return {
      scores: directScores.normalized,
      hasValidScores: true,
    };
  }

  const snapshot = resolveAssessmentDiscSnapshot(item);
  if (snapshot.hasValidScores) {
    return {
      scores: snapshot.summary,
      hasValidScores: true,
    };
  }

  return {
    scores: {},
    hasValidScores: false,
  };
}

function normalizeCandidateProfile(item = {}, index = 0) {
  const identity = resolveAssessmentIdentity(
    {
      ...item,
      id: item?.assessmentId || item?.id || item?.reportId,
    },
    `comparison-profile-${index + 1}`,
  );

  const resolvedScores = resolveScores(item);
  const comparable = normalizeComparableProfile(
    {
      id: identity.id || item?.assessmentId || item?.id || `comparison-profile-${index + 1}`,
      assessmentId: item?.assessmentId || identity.id || item?.id || '',
      name: item?.candidateName || identity.respondentName || `Perfil ${index + 1}`,
      email: item?.candidateEmail || identity.respondentEmail || '',
      createdAt: item?.createdAt || identity.completedAt || '',
      scores: resolvedScores.scores,
    },
    {
      context: 'comparison_catalog',
      detailLevel: 'short',
      fallbackId: `comparison-profile-${index + 1}`,
    },
  );

  return {
    ...comparable,
    hasValidScores: resolvedScores.hasValidScores || comparable.hasValidScores,
    profileKey: item?.profileKey || comparable.profileCode,
    dominantFactor: item?.dominantFactor || comparable.primaryFactor,
  };
}

function dedupeProfiles(profiles = []) {
  const map = new Map();
  profiles.forEach((profile) => {
    const key = String(profile?.assessmentId || profile?.id || '').trim();
    if (!key) return;
    if (!map.has(key)) {
      map.set(key, profile);
    }
  });
  return Array.from(map.values());
}

async function loadLocalAssessments(access = {}) {
  if (access?.tenantId) {
    return base44.entities.Assessment.filter({ workspace_id: access.tenantId }, '-created_date', 500);
  }

  const byUserId = access?.userId
    ? await base44.entities.Assessment.filter({ user_id: access.userId }, '-created_date', 300)
    : [];
  const byEmail = access?.email
    ? await base44.entities.Assessment.filter({ user_id: access.email }, '-created_date', 300)
    : [];
  const byRespondentEmail = access?.email
    ? await base44.entities.Assessment.filter({ respondent_email: access.email }, '-created_date', 300)
    : [];
  const byLeadEmail = access?.email
    ? await base44.entities.Assessment.filter({ lead_email: access.email }, '-created_date', 300)
    : [];

  return [...byUserId, ...byEmail, ...byRespondentEmail, ...byLeadEmail];
}

function findProfileById(profiles = [], targetId = '') {
  const target = String(targetId || '').trim();
  if (!target) return null;
  return (
    profiles.find((item) => {
      const keys = [item?.assessmentId, item?.id]
        .map((key) => String(key || '').trim())
        .filter(Boolean);
      return keys.includes(target);
    }) || null
  );
}

const COMPARISON_MODE_OPTIONS = [
  COMPARISON_MODE.PERSON_TO_PERSON,
  COMPARISON_MODE.LEADER_TO_MEMBER,
  COMPARISON_MODE.CANDIDATE_TO_ROLE,
  COMPARISON_MODE.MEMBER_TO_TEAM,
].map((mode) => {
  const meta = getComparisonModeMeta(mode);
  return {
    mode,
    label: meta.label,
    description: meta.description,
  };
});

const IDEAL_ROLE_OPTIONS = listIdealRoleProfiles();

export default function CompareProfiles() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { access } = useAuth();
  const apiBaseUrl = getApiBaseUrl();

  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [comparisonMode, setComparisonMode] = useState(COMPARISON_MODE.PERSON_TO_PERSON);
  const [idealRoleKey, setIdealRoleKey] = useState(IDEAL_ROLE_OPTIONS[0]?.key || '');
  const [selectedProfileAId, setSelectedProfileAId] = useState('');
  const [selectedProfileBId, setSelectedProfileBId] = useState('');
  const [didApplyQuerySelection, setDidApplyQuerySelection] = useState(false);

  const queryPreferredA = useMemo(
    () =>
      String(
        searchParams.get('assessmentId') ||
          searchParams.get('left') ||
          searchParams.get('a') ||
          '',
      ).trim(),
    [searchParams],
  );
  const queryPreferredB = useMemo(
    () =>
      String(
        searchParams.get('compareWith') ||
          searchParams.get('right') ||
          searchParams.get('b') ||
          '',
      ).trim(),
    [searchParams],
  );

  const modeMeta = useMemo(
    () => getComparisonModeMeta(comparisonMode),
    [comparisonMode],
  );
  const isCandidateToRoleMode = comparisonMode === COMPARISON_MODE.CANDIDATE_TO_ROLE;
  const isMemberToTeamMode = comparisonMode === COMPARISON_MODE.MEMBER_TO_TEAM;
  const isLeaderToMemberMode = comparisonMode === COMPARISON_MODE.LEADER_TO_MEMBER;
  const requiresManualProfileB = !isCandidateToRoleMode && !isMemberToTeamMode;

  const slotLabels = useMemo(() => {
    if (isLeaderToMemberMode) {
      return { left: 'Lider', right: 'Liderado' };
    }
    if (isCandidateToRoleMode) {
      return { left: 'Candidato', right: 'Cargo ideal' };
    }
    if (isMemberToTeamMode) {
      return { left: 'Membro', right: 'Equipe (media)' };
    }
    return { left: 'Perfil A', right: 'Perfil B' };
  }, [isCandidateToRoleMode, isLeaderToMemberMode, isMemberToTeamMode]);

  const fetchProfiles = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError('');

      try {
        const normalizedProfiles = [];
        let fallbackMessage = '';

        if (apiBaseUrl && getApiToken()) {
          try {
            const payload = await apiRequest('/api/profile-comparison/assessments', {
              method: 'GET',
              requireAuth: true,
            });
            const list = Array.isArray(payload?.assessments) ? payload.assessments : [];
            normalizedProfiles.push(...list.map((item, index) => normalizeCandidateProfile(item, index)));
          } catch (apiError) {
            fallbackMessage = apiError?.message || 'Falha ao carregar comparacoes pela API principal.';
          }

          if (!normalizedProfiles.length) {
            try {
              const payload = await apiRequest('/candidate/me/reports', {
                method: 'GET',
                requireAuth: true,
              });
              const reports = mapCandidateReports(payload?.reports || []);
              normalizedProfiles.push(...reports.map((item, index) => normalizeCandidateProfile(item, index)));
            } catch (reportError) {
              fallbackMessage = reportError?.message || fallbackMessage;
            }
          }

          if (!normalizedProfiles.length && !base44?.__isMock) {
            setProfiles([]);
            setError(fallbackMessage || 'Nao foi possivel carregar perfis de comparacao.');
            return;
          }
        }

        if (!normalizedProfiles.length) {
          const localAssessments = await loadLocalAssessments(access || {});
          normalizedProfiles.push(
            ...localAssessments.map((item, index) => normalizeCandidateProfile(item, index)),
          );
        }

        const deduped = dedupeProfiles(normalizedProfiles)
          .filter((item) => Boolean(item?.assessmentId || item?.id))
          .sort((left, right) => new Date(right?.createdAt || 0).getTime() - new Date(left?.createdAt || 0).getTime());

        setProfiles(deduped);
      } catch (fetchError) {
        setProfiles([]);
        setError(fetchError?.message || 'Nao foi possivel carregar perfis para comparacao.');
      } finally {
        if (silent) {
          setIsRefreshing(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [access, apiBaseUrl],
  );

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    if (didApplyQuerySelection || !profiles.length) return;

    const preferredA = findProfileById(profiles, queryPreferredA);
    const preferredB = findProfileById(profiles, queryPreferredB);

    if (preferredA) {
      setSelectedProfileAId(preferredA.assessmentId || preferredA.id);
    }
    if (preferredB) {
      setSelectedProfileBId(preferredB.assessmentId || preferredB.id);
    }

    if (!preferredA && !preferredB && profiles.length >= 2) {
      setSelectedProfileAId(profiles[0].assessmentId || profiles[0].id);
      setSelectedProfileBId(profiles[1].assessmentId || profiles[1].id);
    }

    setDidApplyQuerySelection(true);
  }, [didApplyQuerySelection, profiles, queryPreferredA, queryPreferredB]);

  useEffect(() => {
    if (!profiles.length) return;

    if (!selectedProfileAId) {
      setSelectedProfileAId(profiles[0].assessmentId || profiles[0].id);
    }

    if (!requiresManualProfileB) {
      if (selectedProfileBId) {
        setSelectedProfileBId('');
      }
      return;
    }

    if (!selectedProfileBId || String(selectedProfileBId) === String(selectedProfileAId)) {
      const alternative = profiles.find((item) => String(item.assessmentId || item.id) !== String(selectedProfileAId));
      if (alternative) {
        setSelectedProfileBId(alternative.assessmentId || alternative.id);
      }
    }
  }, [profiles, requiresManualProfileB, selectedProfileAId, selectedProfileBId]);

  const filteredProfiles = useMemo(() => {
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
    if (!normalizedSearch) return profiles;

    return profiles.filter((profile) => {
      const haystack = [
        profile?.name,
        profile?.email,
        profile?.profileCode,
        profile?.styleLabel,
        profile?.assessmentId,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [profiles, searchTerm]);

  const selectedProfileA = useMemo(
    () => findProfileById(profiles, selectedProfileAId),
    [profiles, selectedProfileAId],
  );
  const selectedProfileBManual = useMemo(
    () => findProfileById(profiles, selectedProfileBId),
    [profiles, selectedProfileBId],
  );
  const selectedIdealRoleProfile = useMemo(
    () => (isCandidateToRoleMode ? buildIdealRoleProfile(idealRoleKey) : null),
    [idealRoleKey, isCandidateToRoleMode],
  );
  const teamBenchmark = useMemo(() => {
    if (!isMemberToTeamMode || !selectedProfileA) return null;
    return buildTeamBenchmarkProfile(profiles, {
      excludedId: selectedProfileA.assessmentId || selectedProfileA.id,
      benchmarkId: `team-benchmark-${selectedProfileA.assessmentId || selectedProfileA.id}`,
      benchmarkName: 'Equipe de referencia',
    });
  }, [isMemberToTeamMode, profiles, selectedProfileA]);
  const selectedProfileB = useMemo(() => {
    if (isCandidateToRoleMode) return selectedIdealRoleProfile;
    if (isMemberToTeamMode) return teamBenchmark?.profile || null;
    return selectedProfileBManual;
  }, [
    isCandidateToRoleMode,
    isMemberToTeamMode,
    selectedIdealRoleProfile,
    selectedProfileBManual,
    teamBenchmark,
  ]);

  const isSameAssessmentSelected =
    requiresManualProfileB &&
    Boolean(selectedProfileAId) &&
    Boolean(selectedProfileBId) &&
    String(selectedProfileAId) === String(selectedProfileBId);

  const missingBenchmarkInTeamMode = isMemberToTeamMode && selectedProfileA && !teamBenchmark?.profile;
  const hasSelection = Boolean(selectedProfileA && selectedProfileB) && !missingBenchmarkInTeamMode;
  const hasIncompleteScores =
    Boolean(selectedProfileA && !selectedProfileA.hasValidScores) ||
    Boolean(selectedProfileB && !selectedProfileB.hasValidScores);

  const comparison = useMemo(() => {
    if (!selectedProfileA || !selectedProfileB || isSameAssessmentSelected) return null;
    return compareDiscProfiles(selectedProfileA, selectedProfileB, {
      mode: comparisonMode,
      detailLevel: 'long',
      fallbackLeftId: selectedProfileA?.assessmentId || selectedProfileA?.id || 'profile-a',
      fallbackRightId: selectedProfileB?.assessmentId || selectedProfileB?.id || 'profile-b',
      modeContext: {
        idealRoleKey,
        teamSize: teamBenchmark?.memberCount || 0,
      },
    });
  }, [
    comparisonMode,
    idealRoleKey,
    isSameAssessmentSelected,
    selectedProfileA,
    selectedProfileB,
    teamBenchmark,
  ]);

  const heroComparisonPayload = comparison || {
    mode: comparisonMode,
    modeLabel: modeMeta.label,
    modeDescription: modeMeta.description,
    profileA: selectedProfileA || {},
    profileB: selectedProfileB || {},
    compatibilityScore: 0,
    compatibilityLevel: 'Baixa',
    summaryMedium: !hasSelection
      ? isMemberToTeamMode
        ? 'Selecione um membro para comparar com o baseline comportamental da equipe.'
        : isCandidateToRoleMode
          ? 'Selecione um candidato e um cargo ideal para habilitar a leitura comparativa.'
          : 'Selecione dois perfis para habilitar a leitura comparativa completa.'
      : isSameAssessmentSelected
        ? 'Comparacao invalida: selecione avaliacoes diferentes para gerar analise avancada.'
        : 'Comparacao em consolidacao.',
  };

  const assignProfile = (profileId, slot) => {
    if (slot === 'A') {
      setSelectedProfileAId(profileId);
      return;
    }
    setSelectedProfileBId(profileId);
  };

  const handleSwapProfiles = () => {
    if (!requiresManualProfileB) return;
    if (!selectedProfileAId && !selectedProfileBId) return;
    setSelectedProfileAId(selectedProfileBId);
    setSelectedProfileBId(selectedProfileAId);
  };

  const selectedCount = requiresManualProfileB
    ? [selectedProfileAId, selectedProfileBId].filter(Boolean).length
    : [selectedProfileAId].filter(Boolean).length;

  return (
    <div className="w-full min-w-0 max-w-7xl mx-auto px-4 py-6 space-y-6 sm:px-6 sm:py-8" data-testid="compare-profiles-page">
      <ComparisonHero
        comparison={heroComparisonPayload}
        onSwapProfiles={handleSwapProfiles}
        canSwap={requiresManualProfileB}
        actions={(
          <>
            <Button variant="outline" onClick={() => navigate('/painel')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao painel
            </Button>

            {selectedProfileA?.assessmentId ? (
              <Link to={buildAssessmentResultPath(selectedProfileA.assessmentId)}>
                <Button variant="outline">Resultado {slotLabels.left}</Button>
              </Link>
            ) : (
              <Button variant="outline" disabled>Resultado {slotLabels.left}</Button>
            )}

            {requiresManualProfileB && selectedProfileB?.assessmentId ? (
              <Link to={buildAssessmentResultPath(selectedProfileB.assessmentId)}>
                <Button variant="outline">Resultado {slotLabels.right}</Button>
              </Link>
            ) : (
              <Button variant="outline" disabled>Resultado {slotLabels.right}</Button>
            )}

            <Button
              variant="outline"
              onClick={() => document.getElementById('comparison-report-section')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Relatorio comparativo
            </Button>
          </>
        )}
      />

      <PanelShell>
        <SectionHeader
          title="Selecao de perfis"
          subtitle="Escolha o modo de comparacao e selecione os perfis para gerar leitura de compatibilidade, sinergia e tensao."
          actions={(
            <div className="flex items-center gap-2">
              <Badge variant="outline">Selecionados: {selectedCount}/{requiresManualProfileB ? 2 : 1}</Badge>
              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2"
                onClick={() => fetchProfiles({ silent: true })}
                disabled={isLoading || isRefreshing}
              >
                {isRefreshing ? (
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                Atualizar base
              </Button>
            </div>
          )}
        />

        <div className="mt-4 space-y-4">
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 lg:col-span-2">
              <label
                className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
                htmlFor="comparison-mode-select"
              >
                Modo de comparacao
              </label>
              <select
                id="comparison-mode-select"
                value={comparisonMode}
                onChange={(event) => setComparisonMode(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                {COMPARISON_MODE_OPTIONS.map((option) => (
                  <option key={option.mode} value={option.mode}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-600">{modeMeta.description}</p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nome, e-mail, perfil ou ID"
                className="h-10 border-slate-200 pl-9"
              />
            </div>
          </div>

          {isCandidateToRoleMode ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <label
                className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
                htmlFor="ideal-role-select"
              >
                Cargo ideal de referencia
              </label>
              <select
                id="ideal-role-select"
                value={idealRoleKey}
                onChange={(event) => setIdealRoleKey(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                {IDEAL_ROLE_OPTIONS.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="profile-a-select">
                {slotLabels.left}
              </label>
              <select
                id="profile-a-select"
                value={selectedProfileAId}
                onChange={(event) => setSelectedProfileAId(event.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
              >
                <option value="">Selecione {slotLabels.left}</option>
                {profiles.map((profile) => (
                  <option key={`a-${profile.assessmentId || profile.id}`} value={profile.assessmentId || profile.id}>
                    {profile.name} - {profile.profileCode}
                  </option>
                ))}
              </select>
            </div>

            {requiresManualProfileB ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" htmlFor="profile-b-select">
                  {slotLabels.right}
                </label>
                <select
                  id="profile-b-select"
                  value={selectedProfileBId}
                  onChange={(event) => setSelectedProfileBId(event.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                >
                  <option value="">Selecione {slotLabels.right}</option>
                  {profiles.map((profile) => (
                    <option key={`b-${profile.assessmentId || profile.id}`} value={profile.assessmentId || profile.id}>
                      {profile.name} - {profile.profileCode}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {slotLabels.right}
                </p>
                {isCandidateToRoleMode ? (
                  <p className="mt-2 text-sm text-slate-700">
                    {selectedIdealRoleProfile?.name || 'Cargo ideal'}
                  </p>
                ) : null}
                {isMemberToTeamMode ? (
                  <p className="mt-2 text-sm text-slate-700">
                    {teamBenchmark?.memberCount
                      ? `Baseline calculado com ${teamBenchmark.memberCount} membro(s) da equipe.`
                      : 'Selecione um membro para gerar baseline da equipe.'}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {isLoading ? (
            <PanelState
              type="loading"
              title="Carregando perfis para comparacao"
              description="Estamos consolidando as avaliacoes disponiveis para selecao."
            />
          ) : null}

          {!isLoading && error ? (
            <PanelState type="error" title="Erro ao carregar perfis" description={error} />
          ) : null}

          {!isLoading && !error && !profiles.length ? (
            <EmptyState
              title="Nenhum perfil disponivel para comparar"
              description="Quando houver avaliacoes com dados DISC validos, os perfis aparecerao aqui para selecao."
              tone="soft"
              size="compact"
            />
          ) : null}

          {!isLoading && !error && profiles.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {filteredProfiles.length ? (
                filteredProfiles.map((profile) => {
                  const profileId = profile.assessmentId || profile.id;
                  const isSelectedA = String(selectedProfileAId) === String(profileId);
                  const isSelectedB = String(selectedProfileBId) === String(profileId);
                  return (
                    <article
                      key={profileId}
                      className={`rounded-xl border p-4 transition ${
                        isSelectedA || isSelectedB
                          ? 'border-indigo-300 bg-indigo-50/50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{profile.name}</p>
                          <p className="truncate text-xs text-slate-500">{profile.email || 'Sem e-mail'}</p>
                        </div>
                        <Badge variant="outline">{profile.profileCode}</Badge>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">Atualizado em {formatDate(profile.createdAt)}</p>
                      {!profile.hasValidScores ? (
                        <p className="mt-2 text-xs text-amber-700">Scores incompletos: comparacao sera estimada.</p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant={isSelectedA ? 'default' : 'outline'}
                          className={isSelectedA ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                          onClick={() => assignProfile(profileId, 'A')}
                        >
                          Usar como {slotLabels.left}
                        </Button>
                        {requiresManualProfileB ? (
                          <Button
                            size="sm"
                            variant={isSelectedB ? 'default' : 'outline'}
                            className={isSelectedB ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
                            onClick={() => assignProfile(profileId, 'B')}
                          >
                            Usar como {slotLabels.right}
                          </Button>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              ) : (
                <EmptyState
                  title="Nenhum perfil encontrado"
                  description="Ajuste o termo de busca para localizar os perfis disponiveis."
                  size="compact"
                  tone="soft"
                />
              )}
            </div>
          ) : null}
        </div>
      </PanelShell>

      {!hasSelection ? (
        <PanelState
          title={
            missingBenchmarkInTeamMode
              ? 'Baseline de equipe indisponivel'
              : 'Selecione perfis para comparar'
          }
          description={
            missingBenchmarkInTeamMode
              ? 'Nao ha membros suficientes com scores validos para calcular a media da equipe neste contexto.'
              : requiresManualProfileB
                ? 'Escolha um perfil no campo A e outro no campo B para habilitar o comparador avancado.'
                : `Escolha um perfil em ${slotLabels.left} para gerar comparacao no modo ${modeMeta.label}.`
          }
        />
      ) : null}

      {isSameAssessmentSelected ? (
        <PanelState
          type="error"
          title="Comparacao invalida"
          description="Voce selecionou a mesma avaliacao nos dois lados. Escolha perfis diferentes."
        />
      ) : null}

      {hasSelection && hasIncompleteScores && !isSameAssessmentSelected ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Um ou ambos os perfis possuem scores incompletos. A leitura comparativa foi gerada em modo de consolidacao.
        </div>
      ) : null}

      {comparison ? (
        <>
          <section className="grid gap-4 xl:grid-cols-2">
            <ProfileComparisonCard profile={comparison.profileA} label={slotLabels.left} />
            <ProfileComparisonCard profile={comparison.profileB} label={slotLabels.right} />
          </section>

          <ComparativeRadarPanel profileA={comparison.profileA} profileB={comparison.profileB} />
          <FactorDifferencePanel comparison={comparison} />

          <SynergyTensionPanel
            synergyPoints={comparison.synergyPoints}
            tensionPoints={comparison.tensionPoints}
          />

          <ComparisonInsightsGrid comparison={comparison} />
          <ComparativeReportSection comparison={comparison} />

          <ComparisonRecommendationsPanel
            recommendations={comparison.practicalRecommendations}
            conflictRisks={comparison.conflictRisks}
          />

          <ComparisonTechnicalPanel comparison={comparison} />

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleSwapProfiles} disabled={!requiresManualProfileB}>
              <Shuffle className="mr-2 h-4 w-4" />
              Inverter comparacao
            </Button>
            <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Voltar ao topo
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );
}
