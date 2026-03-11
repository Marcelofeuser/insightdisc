import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2, Radar as RadarIcon, RefreshCcw, Search, Users } from 'lucide-react';
import {
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/apiClient';
import EmptyState from '@/components/ui/EmptyState';
import PanelState from '@/components/ui/PanelState';

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const DISC_LABELS = ['D', 'I', 'S', 'C'];
const SERIES_COLORS = ['#dc2626', '#ca8a04', '#16a34a', '#2563eb', '#9333ea', '#0891b2'];

function formatDate(value) {
  if (!value) return 'Sem data';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sem data';
  return parsed.toLocaleDateString('pt-BR');
}

function levelBadgeClass(level = '') {
  const normalized = String(level || '').toLowerCase();
  if (normalized.includes('muito alta')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (normalized.includes('alta')) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (normalized.includes('moderada')) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-rose-100 text-rose-700 border-rose-200';
}

export default function CompareProfiles() {
  const { toast } = useToast();
  const [assessments, setAssessments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssessments = useMemo(() => {
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
    if (!normalizedSearch) return assessments;

    return assessments.filter((item) => {
      const candidateName = String(item?.candidateName || '').toLowerCase();
      const candidateEmail = String(item?.candidateEmail || '').toLowerCase();
      const profileKey = String(item?.profileKey || '').toLowerCase();
      return (
        candidateName.includes(normalizedSearch)
        || candidateEmail.includes(normalizedSearch)
        || profileKey.includes(normalizedSearch)
      );
    });
  }, [assessments, searchTerm]);

  const selectedCount = selectedIds.length;

  const radarData = useMemo(() => {
    const profiles = Array.isArray(comparison?.profiles) ? comparison.profiles : [];
    if (!profiles.length) return null;

    return {
      labels: DISC_LABELS,
      datasets: profiles.map((profile, index) => {
        const color = SERIES_COLORS[index % SERIES_COLORS.length];
        return {
          label: profile?.candidateName || `Perfil ${index + 1}`,
          data: DISC_LABELS.map((factor) => Number(profile?.disc?.[factor] || 0)),
          backgroundColor: `${color}33`,
          borderColor: color,
          borderWidth: 2,
          pointBackgroundColor: color,
          pointRadius: 3,
          fill: true,
        };
      }),
    };
  }, [comparison]);

  const radarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: {
            backdropColor: 'transparent',
          },
        },
      },
      plugins: {
        legend: {
          position: 'bottom',
        },
      },
    }),
    [],
  );

  const fetchAssessments = async () => {
    setIsLoading(true);
    setError('');

    try {
      const payload = await apiRequest('/api/profile-comparison/assessments', {
        method: 'GET',
        requireAuth: true,
      });

      const list = Array.isArray(payload?.assessments) ? payload.assessments : [];
      setAssessments(list);

      setSelectedIds((previous) => previous.filter((id) => list.some((item) => item?.assessmentId === id)));
    } catch (fetchError) {
      const message = fetchError?.message || 'Não foi possível carregar as avaliações para comparação.';
      setError(message);
      setAssessments([]);
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

  const handleCompare = async () => {
    if (selectedIds.length < 2) {
      toast({
        title: 'Seleção insuficiente',
        description: 'Selecione pelo menos duas avaliações para comparar.',
        variant: 'destructive',
      });
      return;
    }

    setIsComparing(true);
    setError('');

    try {
      const payload = await apiRequest('/api/profile-comparison/compare', {
        method: 'POST',
        requireAuth: true,
        body: {
          assessmentIds: selectedIds,
        },
      });

      setComparison(payload?.comparison || null);
      toast({
        title: 'Comparação atualizada',
        description: 'Os perfis selecionados foram comparados com sucesso.',
      });
    } catch (compareError) {
      const code = String(compareError?.message || '').trim().toUpperCase();
      const message =
        code === 'ASSESSMENTS_NOT_ACCESSIBLE'
          ? 'As avaliações selecionadas não estão disponíveis para comparação no seu escopo atual.'
          : compareError?.message || 'Falha ao comparar perfis.';
      setError(message);
      toast({
        title: 'Erro ao comparar perfis',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsComparing(false);
    }
  };

  const pairwise = Array.isArray(comparison?.pairwise) ? comparison.pairwise : [];
  const profiles = Array.isArray(comparison?.profiles) ? comparison.profiles : [];
  const overall = comparison?.overallCompatibility || null;

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl tracking-tight text-slate-900">
                  <BarChart3 className="h-6 w-6 text-indigo-600" />
                  Comparador de Perfis DISC
                </CardTitle>
                <p className="mt-1 text-sm text-slate-600">
                  Compare dois ou mais assessments para visualizar compatibilidade, forças e possíveis conflitos.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-600">
                Selecione pelo menos 2 avaliações
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2">
              <div className="relative min-w-[220px] flex-1 sm:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome, e-mail ou perfil"
                  className="h-10 border-slate-200 pl-9 sm:w-80"
                />
              </div>

              <Badge variant="outline">Selecionados: {selectedCount}</Badge>

              <Button
                type="button"
                variant="outline"
                className="h-10 gap-2"
                onClick={fetchAssessments}
                disabled={isLoading || isComparing}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Atualizar
              </Button>

              <Button className="h-10 bg-indigo-600 hover:bg-indigo-700" onClick={handleCompare} disabled={isComparing || selectedCount < 2}>
                {isComparing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Comparando...
                  </>
                ) : (
                  'Comparar perfis'
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <PanelState
                type="loading"
                title="Carregando avaliações para comparação"
                description="Estamos preparando os perfis disponíveis para seleção."
              />
            ) : null}

            {!isLoading && error ? (
              <PanelState type="error" title="Erro ao carregar comparações" description={error} />
            ) : null}

            {!isLoading && !error && !filteredAssessments.length ? (
              <EmptyState
                icon={BarChart3}
                title="Nenhuma avaliação disponível"
                description="Ainda não há avaliações com perfil DISC acessíveis para comparação."
                tone="soft"
                size="compact"
              />
            ) : null}

            {!isLoading && filteredAssessments.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredAssessments.map((assessment) => {
                  const assessmentId = String(assessment?.assessmentId || '');
                  const checked = selectedIds.includes(assessmentId);

                  return (
                    <label
                      key={assessmentId}
                      htmlFor={`compare-${assessmentId}`}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        checked ? 'border-indigo-300 bg-indigo-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Checkbox
                        id={`compare-${assessmentId}`}
                        checked={checked}
                        onCheckedChange={() => toggleAssessmentSelection(assessmentId)}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-slate-900">{assessment?.candidateName || 'Participante'}</div>
                        <div className="truncate text-xs text-slate-500">{assessment?.candidateEmail || 'Sem e-mail'}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="secondary">Perfil {assessment?.profileKey || '-'}</Badge>
                          <span className="text-slate-500">{formatDate(assessment?.createdAt)}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : null}
          </CardContent>
        </Card>

        {overall ? (
          <Card className="border-slate-200">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
              <div>
                <div className="text-sm text-slate-500">Compatibilidade geral</div>
                <div className="text-3xl font-black text-slate-900">{Number(overall?.score || 0).toFixed(2)}%</div>
              </div>
              <Badge className={levelBadgeClass(overall?.level)}>{overall?.level || 'Sem nível'}</Badge>
            </CardContent>
          </Card>
        ) : null}

        {radarData ? (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <RadarIcon className="h-5 w-5 text-indigo-600" />
                Radar comparativo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <Radar data={radarData} options={radarOptions} />
              </div>
            </CardContent>
          </Card>
        ) : null}

        {profiles.length ? (
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-indigo-600" />
                Tabela comparativa
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500">
                    <th className="px-3 py-2 font-medium">Participante</th>
                    <th className="px-3 py-2 font-medium">Perfil</th>
                    <th className="px-3 py-2 font-medium">D</th>
                    <th className="px-3 py-2 font-medium">I</th>
                    <th className="px-3 py-2 font-medium">S</th>
                    <th className="px-3 py-2 font-medium">C</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile?.assessmentId} className="border-b border-slate-100 hover:bg-slate-50/70">
                      <td className="px-3 py-2 font-medium text-slate-900">{profile?.candidateName || 'Participante'}</td>
                      <td className="px-3 py-2 text-slate-600">{profile?.profileKey || '-'}</td>
                      {DISC_LABELS.map((factor) => (
                        <td key={`${profile?.assessmentId}-${factor}`} className="px-3 py-2 text-slate-700">
                          {Number(profile?.disc?.[factor] || 0).toFixed(2)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        ) : null}

        {pairwise.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {pairwise.map((item, index) => (
              <Card key={`${item?.leftAssessmentId}-${item?.rightAssessmentId}-${index}`} className="border-slate-200">
                <CardHeader className="space-y-2">
                  <CardTitle className="text-base text-slate-900">
                    {item?.leftCandidateName || 'Perfil A'} vs {item?.rightCandidateName || 'Perfil B'}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-sm">
                    <Badge className={levelBadgeClass(item?.level)}>{item?.level || 'Sem nível'}</Badge>
                    <span className="font-semibold text-slate-700">{Number(item?.score || 0).toFixed(2)}%</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <div className="mb-1 font-semibold text-slate-900">Forças</div>
                    <ul className="space-y-1 text-slate-600">
                      {(Array.isArray(item?.strengths) ? item.strengths : []).map((strength, idx) => (
                        <li key={`strength-${idx}`}>• {strength}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-1 font-semibold text-slate-900">Possíveis conflitos</div>
                    <ul className="space-y-1 text-slate-600">
                      {(Array.isArray(item?.conflicts) ? item.conflicts : []).map((conflict, idx) => (
                        <li key={`conflict-${idx}`}>• {conflict}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
