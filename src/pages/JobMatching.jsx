import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Briefcase, 
  Users, 
  Target,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search
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

const DISC_COLORS = { D: 'text-red-600', I: 'text-orange-600', S: 'text-green-600', C: 'text-blue-600' };
const DISC_BG = { D: 'bg-red-50 border-red-200', I: 'bg-orange-50 border-orange-200', S: 'bg-green-50 border-green-200', C: 'bg-blue-50 border-blue-200' };

const FACTOR_NAMES = { D: 'Dominância', I: 'Influência', S: 'Estabilidade', C: 'Conformidade' };

function calculateMatchScore(candidateProfile, idealProfile) {
  if (!candidateProfile || !idealProfile) return 0;
  let totalScore = 0;
  let maxScore = 0;

  ['D', 'I', 'S', 'C'].forEach(factor => {
    const ideal = idealProfile[factor];
    if (!ideal) return;
    maxScore += 100;
    const cVal = candidateProfile[factor] || 0;
    const { min = 0, max = 100, ideal: idealVal = 50 } = ideal;

    if (cVal >= min && cVal <= max) {
      // Within range: score based on proximity to ideal
      const distFromIdeal = Math.abs(cVal - idealVal);
      const rangeHalf = Math.max(1, (max - min) / 2);
      const score = Math.max(0, 100 - (distFromIdeal / rangeHalf) * 50);
      totalScore += score;
    } else {
      // Outside range: partial credit based on how far
      const distFromRange = cVal < min ? min - cVal : cVal - max;
      totalScore += Math.max(0, 50 - distFromRange);
    }
  });

  return maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
}

function buildMatchExplanation(candidateProfile, idealProfile, score) {
  if (!candidateProfile || !idealProfile) return 'Compatibilidade calculada com base nos fatores DISC disponíveis.';

  const factorDiffs = ['D', 'I', 'S', 'C'].map((factor) => {
    const target = Number(idealProfile?.[factor]?.ideal ?? 50);
    const value = Number(candidateProfile?.[factor] ?? 0);
    return { factor, gap: Math.abs(target - value), value, target };
  });

  const bestFit = [...factorDiffs].sort((a, b) => a.gap - b.gap)[0];
  const biggestGap = [...factorDiffs].sort((a, b) => b.gap - a.gap)[0];

  if (score >= 75) {
    return `Compatibilidade ${score}%: forte aderência em ${bestFit.factor} (${FACTOR_NAMES[bestFit.factor]}), alinhando ritmo e demanda principal da vaga.`;
  }
  if (score >= 50) {
    return `Compatibilidade ${score}%: aderência parcial com bom encaixe em ${bestFit.factor}. O maior ajuste necessário está em ${biggestGap.factor}.`;
  }
  return `Compatibilidade ${score}%: baixa aderência ao perfil ideal, com distância relevante em ${biggestGap.factor} (${FACTOR_NAMES[biggestGap.factor]}).`;
}

export default function JobMatching() {
  const { access, user: authUser } = useAuth();
  const apiBaseUrl = getApiBaseUrl();
  const organizationId = access?.tenantId || authUser?.active_workspace_id || authUser?.tenant_id || '';
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredPositions = positions.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCandidatesWithScores = () => {
    if (!selectedPosition?.ideal_profile) return [];
    return assessments
      .filter(a => a.results?.natural_profile)
      .map(a => ({
        ...a,
        matchScore: calculateMatchScore(a.results.natural_profile, selectedPosition.ideal_profile)
      }))
      .sort((a, b) => b.matchScore - a.matchScore);
  };

  const candidates = getCandidatesWithScores();

  return (
    <div className="min-h-screen bg-slate-50">
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
            onClick={() => setShowCreateForm(true)}
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
                  onClick={() => setSelectedPosition(pos)}
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
                      Perfil Ideal — {selectedPosition.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      {['D', 'I', 'S', 'C'].map(factor => {
                        const fp = selectedPosition.ideal_profile?.[factor];
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
                        {candidates.map((candidate, idx) => (
                          <motion.div
                            key={candidate.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
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
                              candidate.results?.dominant_factor === 'D' ? 'bg-red-500' :
                              candidate.results?.dominant_factor === 'I' ? 'bg-orange-500' :
                              candidate.results?.dominant_factor === 'S' ? 'bg-green-500' :
                              'bg-blue-500'
                            }`}>
                              {candidate.results?.dominant_factor || '?'}
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-900 truncate">
                                {candidate.user_id !== 'anonymous' ? candidate.user_id : 'Candidato anônimo'}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(candidate.completed_at).toLocaleDateString('pt-BR')}
                              </p>
                              <p className="text-xs text-slate-600 mt-1 pr-2">
                                {buildMatchExplanation(
                                  candidate.results?.natural_profile,
                                  selectedPosition.ideal_profile,
                                  candidate.matchScore
                                )}
                              </p>
                            </div>

                            {/* Match score bar */}
                            <div className="flex items-center gap-3 w-40">
                              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    candidate.matchScore >= 75 ? 'bg-green-500' :
                                    candidate.matchScore >= 50 ? 'bg-amber-500' :
                                    'bg-red-400'
                                  }`}
                                  style={{ width: `${candidate.matchScore}%` }}
                                />
                              </div>
                              <span className={`text-sm font-bold w-10 text-right ${
                                candidate.matchScore >= 75 ? 'text-green-600' :
                                candidate.matchScore >= 50 ? 'text-amber-600' :
                                'text-red-500'
                              }`}>
                                {candidate.matchScore}%
                              </span>
                            </div>

                            {/* Match icon */}
                            {candidate.matchScore >= 75 ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                            ) : candidate.matchScore >= 50 ? (
                              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                            )}
                          </motion.div>
                        ))}
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
