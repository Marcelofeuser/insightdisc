import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ArrowRightLeft,
  Plus, 
  Briefcase, 
  Users, 
  Target,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import CreditPaywallCard from '@/components/billing/CreditPaywallCard';
import { apiRequest, getApiBaseUrl } from '@/lib/apiClient';
import { useAuth } from '@/lib/AuthContext';
import { UpgradePrompt } from '@/modules/billing';
import { PRODUCT_FEATURES, hasFeatureAccessByPlan } from '@/modules/billing/planGuard';
import { normalizeDiscScores } from '@/modules/discEngine';
import { calculateJobFit } from '@/modules/jobFit';
import { buildLeadershipInsights } from '@/modules/leadershipInsights';
import {
  listJobProfiles,
  normalizeJobIdealProfile,
  suggestCompatibleJobFunctions,
} from '@/modules/jobProfiles';

const DISC_COLORS = { D: 'text-red-600', I: 'text-orange-600', S: 'text-green-600', C: 'text-blue-600' };
const DISC_BG = { D: 'bg-red-50 border-red-200', I: 'bg-orange-50 border-orange-200', S: 'bg-green-50 border-green-200', C: 'bg-blue-50 border-blue-200' };

const FACTOR_NAMES = { D: 'Dominância', I: 'Influência', S: 'Estabilidade', C: 'Conformidade' };

const JOB_PROFILE_LIBRARY = listJobProfiles();

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveCandidateDisplayName(candidate = {}) {
  const name =
    candidate?.respondent_name ||
    candidate?.candidate_name ||
    candidate?.lead_name ||
    candidate?.user_id;
  return String(name || '').trim() || 'Candidato';
}

function resolveCandidateDiscScores(candidate = {}) {
  const direct =
    candidate?.results?.natural_profile ||
    candidate?.results?.summary_profile ||
    candidate?.disc_results?.summary ||
    candidate?.disc ||
    {};
  return normalizeDiscScores(direct).normalized;
}

function resolveCandidateProfileCode(candidate = {}, scores = {}) {
  const profileCode =
    candidate?.disc_profile?.profile?.key ||
    candidate?.disc_profile?.profileKey ||
    candidate?.results?.disc_profile ||
    '';
  if (profileCode) return String(profileCode).toUpperCase();

  const ranking = ['D', 'I', 'S', 'C'].sort((left, right) => toNumber(scores?.[right]) - toNumber(scores?.[left]));
  return `${ranking[0] || 'D'}${ranking[1] || 'I'}`;
}

function buildRangeProfileFromScores(scores = {}) {
  return ['D', 'I', 'S', 'C'].reduce((acc, factor) => {
    const ideal = Math.round(toNumber(scores?.[factor]));
    acc[factor] = {
      min: Math.max(0, ideal - 15),
      max: Math.min(100, ideal + 15),
      ideal,
    };
    return acc;
  }, {});
}

export default function JobMatching() {
  const location = useLocation();
  const navigate = useNavigate();
  const { access, plan, user: authUser } = useAuth();
  const resolvedPlan = String(plan || access?.plan || '').trim().toLowerCase() || 'personal';
  const canUseJobs = hasFeatureAccessByPlan(resolvedPlan, PRODUCT_FEATURES.JOBS);
  const apiBaseUrl = getApiBaseUrl();
  const organizationId = access?.tenantId || authUser?.active_workspace_id || authUser?.tenant_id || '';
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileTemplateKey, setProfileTemplateKey] = useState(JOB_PROFILE_LIBRARY[0]?.key || '');
  const [newPosition, setNewPosition] = useState({
    title: '', department: '', description: '',
    ideal_profile: {
      D: { min: 20, max: 80, ideal: 50 },
      I: { min: 20, max: 80, ideal: 50 },
      S: { min: 20, max: 80, ideal: 50 },
      C: { min: 20, max: 80, ideal: 50 },
    },
    key_competencies: []
  });
  const [newCompetency, setNewCompetency] = useState('');

  useEffect(() => {
    const isLegacyRoute = String(location?.pathname || '').trim().toLowerCase() === '/jobmatching';
    if (isLegacyRoute && resolvedPlan === 'personal') {
      navigate('/Pricing?unlock=1', { replace: true });
    }
  }, [location?.pathname, navigate, resolvedPlan]);

  const { data: positions = [], refetch: refetchPositions } = useQuery({
    queryKey: ['job-positions'],
    queryFn: async () => {
      if (apiBaseUrl) {
        const payload = await apiRequest('/jobs', {
          method: 'GET',
          requireAuth: true,
        });
        return payload?.jobs || [];
      }
      const user = await base44.auth.me();
      return base44.entities.JobPosition.filter({ workspace_id: user.active_workspace_id || 'all' });
    },
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ['completed-assessments-for-matching'],
    queryFn: async () => {
      if (apiBaseUrl) {
        return [];
      }
      return base44.entities.Assessment.filter({ status: 'completed' }, '-completed_at', 100);
    },
  });

  const { data: workspace = null } = useQuery({
    queryKey: ['job-matching-workspace'],
    queryFn: async () => {
      if (apiBaseUrl) {
        return {
          id: organizationId,
          credits_balance: Number(authUser?.credits_balance ?? authUser?.credits ?? 0),
        };
      }
      const user = await base44.auth.me();
      const workspaceId = user?.active_workspace_id || user?.tenant_id;
      if (!workspaceId) return null;
      const rows = await base44.entities.Workspace.filter({ id: workspaceId });
      return rows?.[0] || null;
    },
  });

  const availableCredits = Number(workspace?.credits_balance || 0);
  const canUsePremiumActions = availableCredits > 0;

  const handleCreatePosition = async () => {
    if (!canUsePremiumActions) return;
    if (!newPosition.title.trim()) return;

    if (apiBaseUrl) {
      const min = {};
      const max = {};
      ['D', 'I', 'S', 'C'].forEach((factor) => {
        min[factor] = Number(newPosition.ideal_profile[factor]?.min ?? 0);
        max[factor] = Number(newPosition.ideal_profile[factor]?.max ?? 100);
      });

      const payload = await apiRequest('/jobs', {
        method: 'POST',
        requireAuth: true,
        body: {
          titulo: newPosition.title.trim(),
          departamento: newPosition.department?.trim() || '',
          descricao: newPosition.description?.trim() || '',
          disc_ideal: newPosition.ideal_profile,
          min,
          max,
          competencias: newPosition.key_competencies,
        },
      });

      const createdJob = payload?.job || null;
      setShowCreateForm(false);
      await refetchPositions();
      if (createdJob) {
        setSelectedPosition(createdJob);
        setSelectedCandidateId('');
      }
      return;
    }

    const user = await base44.auth.me();
    const created = await base44.entities.JobPosition.create({
      ...newPosition,
      workspace_id: user.active_workspace_id || user.id,
      is_active: true,
      candidates: [],
    });
    setShowCreateForm(false);
    await refetchPositions();
    setSelectedPosition(created || null);
    setSelectedCandidateId('');
  };

  const updateIdealProfile = (factor, key, value) => {
    setNewPosition(prev => ({
      ...prev,
      ideal_profile: {
        ...prev.ideal_profile,
        [factor]: { ...prev.ideal_profile[factor], [key]: value }
      }
    }));
  };

  const applyProfileTemplate = (templateKey) => {
    setProfileTemplateKey(templateKey);
    const template = JOB_PROFILE_LIBRARY.find((item) => item.key === templateKey);
    if (!template) return;
    setNewPosition((previous) => ({
      ...previous,
      title: previous.title || template.label,
      department: previous.department || template.category,
      description: previous.description || template.description,
      ideal_profile: buildRangeProfileFromScores(template.scores),
      key_competencies: previous.key_competencies.length
        ? previous.key_competencies
        : ['Comunicação', 'Tomada de decisão', 'Colaboração'],
    }));
  };

  const filteredPositions = useMemo(
    () =>
      positions.filter(
        (position) =>
          position.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          position.department?.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [positions, searchQuery],
  );

  const selectedJobProfile = useMemo(() => {
    if (!selectedPosition) return null;
    const normalizedIdeal = normalizeJobIdealProfile(
      selectedPosition?.ideal_profile || selectedPosition?.scores || selectedPosition,
    );

    return {
      key: selectedPosition?.key || selectedPosition?.id || '',
      title: selectedPosition?.title || selectedPosition?.label || 'Cargo',
      label: selectedPosition?.title || selectedPosition?.label || 'Cargo',
      department: selectedPosition?.department || selectedPosition?.category || '',
      description: selectedPosition?.description || '',
      ideal_profile: normalizedIdeal.idealProfile,
      scores: normalizedIdeal.scores,
    };
  }, [selectedPosition]);

  const candidates = useMemo(() => {
    if (!selectedJobProfile) return [];

    return assessments
      .map((assessment, index) => {
        const scores = resolveCandidateDiscScores(assessment);
        const hasScores = ['D', 'I', 'S', 'C'].some((factor) => toNumber(scores?.[factor]) > 0);
        if (!hasScores) return null;

        const id = String(assessment?.id || assessment?.assessmentId || `candidate-${index + 1}`);
        const candidateInput = {
          id,
          assessmentId: id,
          name: resolveCandidateDisplayName(assessment),
          completedAt: assessment?.completed_at || assessment?.completedAt || assessment?.created_date || '',
          profileCode: resolveCandidateProfileCode(assessment, scores),
          scores,
        };
        const fit = calculateJobFit(candidateInput, selectedJobProfile, {
          context: 'job_matching_page',
        });

        return {
          id,
          assessment,
          candidate: candidateInput,
          fit,
        };
      })
      .filter(Boolean)
      .sort((left, right) => toNumber(right?.fit?.jobFitScore) - toNumber(left?.fit?.jobFitScore));
  }, [assessments, selectedJobProfile]);

  const selectedCandidate = useMemo(
    () => candidates.find((item) => item.id === selectedCandidateId) || candidates[0] || null,
    [candidates, selectedCandidateId],
  );

  const selectedCandidateLeadership = useMemo(() => {
    if (!selectedCandidate?.candidate?.scores) return null;
    return buildLeadershipInsights(selectedCandidate.candidate.scores, {
      context: 'job_matching_leadership',
      detailLevel: 'short',
    });
  }, [selectedCandidate]);

  const selectedCandidateRoleSuggestions = useMemo(() => {
    if (!selectedCandidate?.candidate?.scores) return null;
    return suggestCompatibleJobFunctions(
      { scores: selectedCandidate.candidate.scores },
      { limit: 3, jobProfiles: JOB_PROFILE_LIBRARY },
    );
  }, [selectedCandidate]);

  if (!canUseJobs) {
    return (
      <div className="w-full min-w-0 bg-slate-50 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <UpgradePrompt
            title="Pessoa × Cargo disponível em plano superior"
            description="A análise de aderência comportamental entre candidato e cargo ideal está liberada no plano Business."
            requiredPlanLabel="Business"
            ctaLabel="Ativar recurso"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Compatibilidade DISC para Vagas</h1>
              <p className="text-sm text-slate-500">Compare candidatos com perfis ideais de vaga</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setShowCreateForm(true);
              applyProfileTemplate(profileTemplateKey);
            }}
            className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            data-testid="job-matching-create-vaga"
            disabled={!canUsePremiumActions}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nova Vaga
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!canUsePremiumActions ? (
          <CreditPaywallCard
            className="mb-6"
            title="Ações premium bloqueadas"
            description="Compre créditos para criar vagas e usar os recursos avançados de compatibilidade."
          />
        ) : null}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Positions List */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar vaga..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>

            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Biblioteca de perfis ideais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {JOB_PROFILE_LIBRARY.slice(0, 6).map((template) => (
                  <button
                    key={template.key}
                    type="button"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition hover:border-indigo-200 hover:bg-indigo-50/40"
                    onClick={() => {
                      setSelectedPosition({
                        id: `template-${template.key}`,
                        key: template.key,
                        title: template.label,
                        department: template.category,
                        description: template.description,
                        ideal_profile: buildRangeProfileFromScores(template.scores),
                        key_competencies: [],
                        is_active: true,
                      });
                      setSelectedCandidateId('');
                    }}
                  >
                    <p className="text-sm font-semibold text-slate-900">{template.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{template.description}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            {filteredPositions.length === 0 ? (
              <Card className="shadow-sm">
                <CardContent className="p-8 text-center">
                  <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500 mb-4">Nenhuma vaga cadastrada</p>
                  <p className="text-sm text-slate-400">Use o botão "Nova Vaga" no topo para criar sua primeira vaga.</p>
                </CardContent>
              </Card>
            ) : (
              filteredPositions.map(pos => (
                <Card
                  key={pos.id}
                  onClick={() => {
                    setSelectedPosition(pos);
                    setSelectedCandidateId('');
                  }}
                  className={`cursor-pointer hover:shadow-md transition-all ${selectedPosition?.id === pos.id ? 'ring-2 ring-indigo-500' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-slate-900">{pos.title}</h3>
                        {pos.department && <p className="text-sm text-slate-500">{pos.department}</p>}
                        <p className="text-xs text-slate-400 mt-1">{pos.candidates?.length || 0} candidatos</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${pos.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {pos.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Matching Results */}
          <div className="lg:col-span-2">
            {selectedPosition ? (
              <div className="space-y-6">
                {/* Position Profile */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-600" />
                      Perfil Ideal — {selectedJobProfile?.title || selectedPosition?.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {['D', 'I', 'S', 'C'].map(factor => {
                        const fp = selectedJobProfile?.ideal_profile?.[factor];
                        return (
                          <div key={factor} className={`rounded-xl p-4 border ${DISC_BG[factor]}`}>
                            <div className={`text-2xl font-bold ${DISC_COLORS[factor]}`}>{factor}</div>
                            <div className="text-xs text-slate-500 mb-1">{FACTOR_NAMES[factor]}</div>
                            {fp ? (
                              <>
                                <div className="text-sm font-medium text-slate-700">Ideal: {fp.ideal}%</div>
                                <div className="text-xs text-slate-500">Faixa: {fp.min}–{fp.max}%</div>
                              </>
                            ) : (
                              <div className="text-xs text-slate-400">Não definido</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {selectedJobProfile?.description ? (
                      <p className="text-sm text-slate-600">{selectedJobProfile.description}</p>
                    ) : null}
                    {selectedPosition.key_competencies?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedPosition.key_competencies.map((c, i) => (
                          <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedCandidate ? (
                  <Card className="shadow-sm border-indigo-100">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                        Pessoa x Cargo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <article className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Pessoa</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{selectedCandidate.candidate.name}</p>
                          <p className="text-xs text-slate-500">Perfil {selectedCandidate.fit?.candidate?.profileCode || '-'}</p>
                        </article>
                        <article className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Cargo</p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">{selectedCandidate.fit?.jobProfile?.label || '-'}</p>
                          <p className="text-xs text-slate-500">{selectedCandidate.fit?.jobProfile?.styleLabel || 'Perfil ideal DISC'}</p>
                        </article>
                      </div>

                      <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 p-4">
                        <p className="text-sm font-semibold text-indigo-900">
                          Aderência: {Number(selectedCandidate.fit?.jobFitScore || 0).toFixed(1)}% ({selectedCandidate.fit?.compatibilityLevel || 'Moderada'})
                        </p>
                        <p className="mt-1 text-sm text-indigo-900/90">{selectedCandidate.fit?.summaryMedium}</p>
                        <p className="mt-1 text-xs font-medium text-indigo-800">
                          Recomendação de contratação: {selectedCandidate.fit?.hiringRecommendationLabel}
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <article className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                          <h4 className="text-sm font-semibold text-emerald-900">Pontos fortes</h4>
                          <ul className="mt-2 space-y-2 text-sm text-emerald-900">
                            {(selectedCandidate.fit?.strengths || []).slice(0, 3).map((item) => (
                              <li key={item} className="rounded-lg border border-emerald-200 bg-white/80 px-2.5 py-2">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </article>
                        <article className="rounded-xl border border-rose-200 bg-rose-50/70 p-4">
                          <h4 className="text-sm font-semibold text-rose-900">Pontos de risco</h4>
                          <ul className="mt-2 space-y-2 text-sm text-rose-900">
                            {(selectedCandidate.fit?.riskPoints || []).slice(0, 3).map((item) => (
                              <li key={item} className="rounded-lg border border-rose-200 bg-white/80 px-2.5 py-2">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </article>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <article className="rounded-xl border border-slate-200 bg-white p-4">
                          <h4 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                            <ShieldCheck className="h-4 w-4 text-indigo-600" />
                            Inteligência de liderança
                          </h4>
                          <p className="mt-2 text-sm text-slate-700">
                            {selectedCandidateLeadership?.summaryShort || 'Sem leitura de liderança para este perfil.'}
                          </p>
                        </article>
                        <article className="rounded-xl border border-slate-200 bg-white p-4">
                          <h4 className="text-sm font-semibold text-slate-900">Funções compatíveis sugeridas</h4>
                          {(selectedCandidateRoleSuggestions?.recommendations || []).length ? (
                            <ul className="mt-2 space-y-2 text-sm text-slate-700">
                              {selectedCandidateRoleSuggestions.recommendations.map((item) => (
                                <li key={item.key} className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2">
                                  <span className="font-semibold">{item.label}</span> • {item.fitScore.toFixed(1)}%
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-sm text-slate-500">Sem sugestões adicionais no momento.</p>
                          )}
                        </article>
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Candidates Ranking */}
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      Ranking de Candidatos ({candidates.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {candidates.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        Nenhuma avaliação concluída disponível para matching.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {candidates.map((candidateResult, idx) => {
                          const fitScore = Number(candidateResult?.fit?.jobFitScore || 0);
                          const dominant = String(candidateResult?.fit?.candidate?.profileCode || '').slice(0, 1) || 'D';
                          const isSelected = selectedCandidate?.id === candidateResult.id;
                          return (
                          <motion.div
                            key={candidateResult.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`flex cursor-pointer items-center gap-4 rounded-xl p-4 transition-colors ${
                              isSelected
                                ? 'border border-indigo-200 bg-indigo-50/60'
                                : 'bg-slate-50 hover:bg-slate-100'
                            }`}
                            onClick={() => setSelectedCandidateId(candidateResult.id)}
                          >
                            {/* Rank */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              idx === 0 ? 'bg-amber-100 text-amber-700' :
                              idx === 1 ? 'bg-slate-200 text-slate-700' :
                              idx === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              #{idx + 1}
                            </div>

                            {/* Profile badge */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${
                              dominant === 'D' ? 'bg-red-500' :
                              dominant === 'I' ? 'bg-orange-500' :
                              dominant === 'S' ? 'bg-green-500' :
                              'bg-blue-500'
                            }`}>
                              {dominant}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate">
                                {candidateResult?.candidate?.name || 'Candidato'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {candidateResult?.candidate?.completedAt
                                  ? new Date(candidateResult.candidate.completedAt).toLocaleDateString('pt-BR')
                                  : 'Sem data'}
                              </p>
                              <p className="text-xs text-slate-600 mt-1 pr-2">
                                {candidateResult?.fit?.summaryShort}
                              </p>
                            </div>

                            {/* Match score bar */}
                            <div className="flex items-center gap-3 w-40">
                              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    fitScore >= 75 ? 'bg-green-500' :
                                    fitScore >= 50 ? 'bg-amber-500' :
                                    'bg-red-400'
                                  }`}
                                  style={{ width: `${fitScore}%` }}
                                />
                              </div>
                              <span className={`text-sm font-bold w-10 text-right ${
                                fitScore >= 75 ? 'text-green-600' :
                                fitScore >= 50 ? 'text-amber-600' :
                                'text-red-500'
                              }`}>
                                {fitScore.toFixed(0)}%
                              </span>
                            </div>

                            {/* Match icon */}
                            {fitScore >= 75 ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                            ) : fitScore >= 50 ? (
                              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            )}
                          </motion.div>
                        );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Match Legend */}
                <div className="flex items-center gap-6 text-sm text-slate-500">
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-green-500" /> ≥75% Excelente match</div>
                  <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4 text-amber-500" /> 50–74% Match parcial</div>
                  <div className="flex items-center gap-2"><XCircle className="w-4 h-4 text-red-400" /> &lt;50% Baixo match</div>
                </div>
              </div>
            ) : (
              <Card className="shadow-sm h-full flex items-center justify-center min-h-[400px]">
                <CardContent className="text-center">
                  <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">Selecione uma vaga</h3>
                  <p className="text-slate-500">Escolha uma vaga para ver o ranking de candidatos por compatibilidade DISC</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Create Position Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-8"
          >
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Criar Nova Vaga</h2>
              <p className="text-sm text-slate-500">Defina o perfil DISC ideal para o cargo</p>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Basic Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Título do Cargo *</Label>
                  <Input
                    value={newPosition.title}
                    onChange={e => setNewPosition(p => ({ ...p, title: e.target.value }))}
                    placeholder="Ex: Gerente Comercial"
                    className="mt-1 rounded-xl"
                  />
                </div>
                <div>
                  <Label>Departamento</Label>
                  <Input
                    value={newPosition.department}
                    onChange={e => setNewPosition(p => ({ ...p, department: e.target.value }))}
                    placeholder="Ex: Vendas"
                    className="mt-1 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <Label>Modelo de perfil ideal</Label>
                <select
                  value={profileTemplateKey}
                  onChange={(event) => applyProfileTemplate(event.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-indigo-300 focus:outline-none"
                >
                  {JOB_PROFILE_LIBRARY.map((template) => (
                    <option key={template.key} value={template.key}>
                      {template.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-500">
                  Use um modelo da biblioteca para acelerar definição do perfil ideal da vaga.
                </p>
              </div>

              {/* Ideal Profile Sliders */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-4">Perfil DISC Ideal</h3>
                <div className="space-y-5">
                  {['D', 'I', 'S', 'C'].map(factor => (
                    <div key={factor} className={`rounded-xl p-4 border ${DISC_BG[factor]}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`font-bold ${DISC_COLORS[factor]}`}>{factor} — {FACTOR_NAMES[factor]}</span>
                        <span className="text-sm text-slate-500">
                          Ideal: {newPosition.ideal_profile[factor].ideal}% | Faixa: {newPosition.ideal_profile[factor].min}–{newPosition.ideal_profile[factor].max}%
                        </span>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <Label className="text-xs">Valor Ideal: {newPosition.ideal_profile[factor].ideal}%</Label>
                          <Slider
                            value={[newPosition.ideal_profile[factor].ideal]}
                            onValueChange={([v]) => updateIdealProfile(factor, 'ideal', v)}
                            min={0} max={100} step={5}
                            className="mt-1"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Mínimo: {newPosition.ideal_profile[factor].min}%</Label>
                            <Slider
                              value={[newPosition.ideal_profile[factor].min]}
                              onValueChange={([v]) => updateIdealProfile(factor, 'min', v)}
                              min={0} max={newPosition.ideal_profile[factor].ideal} step={5}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Máximo: {newPosition.ideal_profile[factor].max}%</Label>
                            <Slider
                              value={[newPosition.ideal_profile[factor].max]}
                              onValueChange={([v]) => updateIdealProfile(factor, 'max', v)}
                              min={newPosition.ideal_profile[factor].ideal} max={100} step={5}
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Competencies */}
              <div>
                <Label>Competências-Chave</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={newCompetency}
                    onChange={e => setNewCompetency(e.target.value)}
                    placeholder="Ex: Liderança"
                    className="rounded-xl"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newCompetency.trim()) {
                        setNewPosition(p => ({ ...p, key_competencies: [...p.key_competencies, newCompetency.trim()] }));
                        setNewCompetency('');
                      }
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (newCompetency.trim()) {
                        setNewPosition(p => ({ ...p, key_competencies: [...p.key_competencies, newCompetency.trim()] }));
                        setNewCompetency('');
                      }
                    }}
                    className="rounded-xl"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {newPosition.key_competencies.map((c, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium flex items-center gap-1 cursor-pointer"
                      onClick={() => setNewPosition(p => ({ ...p, key_competencies: p.key_competencies.filter((_, j) => j !== i) }))}
                    >
                      {c} ×
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-3">
              <Button variant="outline" onClick={() => setShowCreateForm(false)} className="flex-1 rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={handleCreatePosition}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                disabled={!canUsePremiumActions || !newPosition.title.trim()}
              >
                Criar vaga
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
