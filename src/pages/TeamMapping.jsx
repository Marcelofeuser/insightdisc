import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search,
  ArrowLeft,
  UserPlus,
  Trash2,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { createPageUrl } from '@/utils';
import TeamQuadrantChart from '@/components/disc/TeamQuadrantChart';
import DISCRadarChart from '@/components/disc/DISCRadarChart';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  FACTOR_LABELS,
  buildTeamDistribution,
  buildTeamInsights,
  calculateProfileCompatibility,
} from '@/modules/disc/compatibility';

export default function TeamMapping() {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [compareMemberA, setCompareMemberA] = useState('');
  const [compareMemberB, setCompareMemberB] = useState('');
  const [newMember, setNewMember] = useState({
    name: '',
    email: '',
    role: '',
    assessmentId: '',
  });
  const { toast } = useToast();

  const { data: teams = [], isLoading, refetch } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (user.active_workspace_id) {
        return base44.entities.Team.filter({ workspace_id: user.active_workspace_id });
      }
      return [];
    }
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ['completed-assessments'],
    queryFn: async () => {
      const user = await base44.auth.me();
      if (user.active_workspace_id) {
        return base44.entities.Assessment.filter(
          { status: 'completed', workspace_id: user.active_workspace_id },
          '-completed_at',
          50
        );
      }
      return [];
    }
  });

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) return;
    
    try {
      const user = await base44.auth.me();
      await base44.entities.Team.create({
        name: newTeamName,
        workspace_id: user.active_workspace_id,
        members: []
      });
      setNewTeamName('');
      setShowCreateModal(false);
      refetch();
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const resetNewMember = () => {
    setNewMember({
      name: '',
      email: '',
      role: '',
      assessmentId: '',
    });
  };

  const handleOpenAddMember = () => {
    if (!selectedTeam) return;
    resetNewMember();
    setShowAddMemberModal(true);
  };

  const handleAddMember = async () => {
    if (!selectedTeam) return;
    if (!newMember.name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do membro para continuar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const member = {
        id: `member-${Date.now()}`,
        name: newMember.name.trim(),
        role: newMember.role.trim() || 'Membro',
        ...(newMember.email.trim() ? { email: newMember.email.trim().toLowerCase() } : {}),
        ...(newMember.assessmentId ? { assessment_id: newMember.assessmentId } : {}),
      };

      const updatedMembers = [...(selectedTeam.members || []), member];
      const updatedTeam = await base44.entities.Team.update(selectedTeam.id, {
        members: updatedMembers,
      });

      setSelectedTeam(updatedTeam);
      setShowAddMemberModal(false);
      resetNewMember();
      refetch();

      toast({
        title: 'Membro adicionado',
        description: 'O membro foi incluído nesta equipe.',
      });
    } catch (error) {
      console.error('Error adding member:', error);
      toast({
        title: 'Erro ao adicionar membro',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      });
    }
  };

  const calculateTeamProfile = (team) => {
    if (!team.members?.length) return null;
    
    const totals = { D: 0, I: 0, S: 0, C: 0 };
    let count = 0;

    team.members.forEach(member => {
      const assessment = assessments.find(a => a.id === member.assessment_id);
      if (assessment?.results?.natural_profile) {
        Object.keys(totals).forEach(key => {
          totals[key] += assessment.results.natural_profile[key] || 0;
        });
        count++;
      }
    });

    if (count === 0) return null;

    return {
      D: Math.round(totals.D / count),
      I: Math.round(totals.I / count),
      S: Math.round(totals.S / count),
      C: Math.round(totals.C / count)
    };
  };

  const getMembersWithProfiles = (team) => {
    return (team.members || []).map((member, index) => {
      const assessment = assessments.find(a => a.id === member.assessment_id);
      return {
        ...member,
        id: member.id || `${team.id || 'team'}-member-${index}`,
        profile: assessment?.results?.natural_profile || { D: 25, I: 25, S: 25, C: 25 }
      };
    });
  };

  const selectedMembersWithProfiles = useMemo(
    () => (selectedTeam ? getMembersWithProfiles(selectedTeam) : []),
    [selectedTeam, assessments]
  );

  const teamDistribution = useMemo(
    () => buildTeamDistribution(selectedMembersWithProfiles.map((member) => member.profile)),
    [selectedMembersWithProfiles]
  );

  const teamInsights = useMemo(
    () => buildTeamInsights(teamDistribution),
    [teamDistribution]
  );

  const selectedMemberAData = useMemo(
    () => selectedMembersWithProfiles.find((member) => member.id === compareMemberA) || null,
    [selectedMembersWithProfiles, compareMemberA]
  );

  const selectedMemberBData = useMemo(
    () => selectedMembersWithProfiles.find((member) => member.id === compareMemberB) || null,
    [selectedMembersWithProfiles, compareMemberB]
  );

  const pairCompatibility = useMemo(() => {
    if (!selectedMemberAData?.profile || !selectedMemberBData?.profile) return null;
    return calculateProfileCompatibility(selectedMemberAData.profile, selectedMemberBData.profile, {
      relationLabel: 'trabalho em equipe',
    });
  }, [selectedMemberAData, selectedMemberBData]);

  useEffect(() => {
    setCompareMemberA('');
    setCompareMemberB('');
  }, [selectedTeam?.id]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Mapeamento de Equipes</h1>
                <p className="text-sm text-slate-500">Visualize a dinâmica comportamental dos seus times</p>
              </div>
            </div>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Equipe
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Teams List */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              <Input placeholder="Buscar equipe..." className="rounded-xl" />
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-slate-200 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : teams.length > 0 ? (
              <div className="space-y-3">
                {teams.map(team => (
                  <motion.div
                    key={team.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedTeam?.id === team.id ? 'ring-2 ring-indigo-500' : ''
                      }`}
                      onClick={() => setSelectedTeam(team)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-900">{team.name}</h3>
                            <p className="text-sm text-slate-500">
                              {team.members?.length || 0} membros
                            </p>
                          </div>
                          <div className="flex -space-x-2">
                            {(team.members || []).slice(0, 3).map((member, i) => (
                              <div 
                                key={i}
                                className="w-8 h-8 rounded-full bg-indigo-100 border-2 border-white flex items-center justify-center text-xs font-medium text-indigo-600"
                              >
                                {member.name?.charAt(0) || '?'}
                              </div>
                            ))}
                            {(team.members?.length || 0) > 3 && (
                              <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600">
                                +{team.members.length - 3}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card className="shadow-sm">
                <CardContent className="p-8 text-center">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 mb-4">Nenhuma equipe criada</p>
                  <Button onClick={() => setShowCreateModal(true)} className="bg-indigo-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeira Equipe
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Team Details */}
          <div className="lg:col-span-2">
            {selectedTeam ? (
              <div className="space-y-6">
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{selectedTeam.name}</span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="rounded-lg" onClick={handleOpenAddMember}>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Adicionar Membro
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TeamQuadrantChart 
                      members={selectedMembersWithProfiles} 
                    />
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Perfil Médio do Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {calculateTeamProfile(selectedTeam) ? (
                        <DISCRadarChart 
                          naturalProfile={calculateTeamProfile(selectedTeam)}
                          showAdapted={false}
                          size={200}
                        />
                      ) : (
                        <p className="text-center text-slate-500 py-8">
                          Adicione membros ao time para ver o perfil
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-lg">Membros</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {selectedTeam.members?.length > 0 ? (
                        <div className="space-y-3">
                          {selectedTeam.members.map((member, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">
                                  {member.name?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">{member.name}</p>
                                  <p className="text-sm text-slate-500">{member.role || 'Membro'}</p>
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-slate-500 py-8">
                          Nenhum membro adicionado
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Mapa comportamental da equipe</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['D', 'I', 'S', 'C'].map((factor) => (
                        <div key={factor} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <div className="text-xs uppercase tracking-wide text-slate-500">
                            {factor} · {FACTOR_LABELS[factor]}
                          </div>
                          <div className="mt-1 text-2xl font-black text-slate-900">{teamDistribution[factor] || 0}</div>
                          <div className="text-xs text-slate-500">dominâncias</div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                      <h4 className="text-sm font-semibold text-indigo-900 mb-2">Insights automáticos da equipe</h4>
                      <ul className="space-y-2 text-sm text-indigo-900">
                        {teamInsights.map((insight) => (
                          <li key={insight} className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-indigo-500" />
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Comparar dois perfis da equipe</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-3">
                      <select
                        value={compareMemberA}
                        onChange={(event) => setCompareMemberA(event.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="">Selecionar Perfil A</option>
                        {selectedMembersWithProfiles.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={compareMemberB}
                        onChange={(event) => setCompareMemberB(event.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                      >
                        <option value="">Selecionar Perfil B</option>
                        {selectedMembersWithProfiles.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {pairCompatibility ? (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-emerald-900">
                            Compatibilidade entre {selectedMemberAData?.name} e {selectedMemberBData?.name}
                          </p>
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-bold text-emerald-800">
                            {pairCompatibility.score}%
                          </span>
                        </div>
                        <p className="text-sm text-emerald-900">{pairCompatibility.summary}</p>
                        <ul className="space-y-1 text-xs text-emerald-900">
                          {pairCompatibility.highlights.map((highlight) => (
                            <li key={highlight}>• {highlight}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Selecione dois membros para calcular compatibilidade e explicação comportamental automática.
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Team Analysis */}
                {selectedTeam.analysis && (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" />
                        Análise do Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-slate-900 mb-3">Pontos Fortes</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedTeam.analysis.strengths?.map((s, i) => (
                              <span key={i} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-slate-900 mb-3">Gaps Identificados</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedTeam.analysis.gaps?.map((g, i) => (
                              <span key={i} className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-sm">
                                {g}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="shadow-sm h-full flex items-center justify-center">
                <CardContent className="text-center py-16">
                  <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Selecione uma equipe
                  </h3>
                  <p className="text-slate-500">
                    Escolha uma equipe na lista para visualizar o mapeamento
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-4">Nova Equipe</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Nome da equipe</label>
                <Input
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Ex: Time de Vendas"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateTeam}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  Criar Equipe
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-slate-900 mb-4">Adicionar Membro</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Nome</label>
                <Input
                  value={newMember.name}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Nome do membro"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">E-mail</label>
                <Input
                  value={newMember.email}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="email@empresa.com"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Cargo</label>
                <Input
                  value={newMember.role}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, role: e.target.value }))}
                  placeholder="Ex: SDR"
                  className="mt-1 rounded-xl"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Avaliação vinculada (opcional)</label>
                <select
                  value={newMember.assessmentId}
                  onChange={(e) => setNewMember((prev) => ({ ...prev, assessmentId: e.target.value }))}
                  disabled={assessments.length === 0}
                  className="mt-1 w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
                >
                  <option value="">
                    {assessments.length === 0 ? 'Nenhuma avaliação disponível' : 'Sem avaliação vinculada'}
                  </option>
                  {assessments.map((assessment) => (
                    <option key={assessment.id} value={assessment.id}>
                      {assessment.respondent_name || assessment.respondent_email || assessment.user_id || assessment.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddMember}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                >
                  Salvar membro
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
