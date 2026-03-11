import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Loader2, PieChart as PieIcon, Radar as RadarIcon, RefreshCcw, Search, TrendingUp, Users } from 'lucide-react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  RadialLinearScale,
  Tooltip,
} from 'chart.js';
import { Bar, Line, Pie, Radar } from 'react-chartjs-2';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { apiRequest } from '@/lib/apiClient';
import EmptyState from '@/components/ui/EmptyState';
import PanelState from '@/components/ui/PanelState';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  BarElement,
  Filler,
  Tooltip,
  Legend,
);

const FACTORS = ['D', 'I', 'S', 'C'];
const FACTOR_LABELS = {
  D: 'Dominância',
  I: 'Influência',
  S: 'Estabilidade',
  C: 'Conformidade',
};
const FACTOR_COLORS = {
  D: '#dc2626',
  I: '#ca8a04',
  S: '#16a34a',
  C: '#2563eb',
};

function formatDate(value) {
  if (!value) return 'Sem data';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Sem data';
  return parsed.toLocaleDateString('pt-BR');
}

export default function TeamMap() {
  const { toast } = useToast();
  const [assessments, setAssessments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [teamMap, setTeamMap] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssessments = useMemo(() => {
    const normalizedSearch = String(searchTerm || '').trim().toLowerCase();
    if (!normalizedSearch) return assessments;

    return assessments.filter((item) => {
      const name = String(item?.candidateName || '').toLowerCase();
      const email = String(item?.candidateEmail || '').toLowerCase();
      const dominant = String(item?.dominantFactor || '').toLowerCase();
      return name.includes(normalizedSearch) || email.includes(normalizedSearch) || dominant.includes(normalizedSearch);
    });
  }, [assessments, searchTerm]);

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
      setSelectedIds((previous) => previous.filter((id) => list.some((item) => item?.assessmentId === id)));
    } catch (fetchError) {
      const message = fetchError?.message || 'Não foi possível carregar avaliações para o mapa comportamental.';
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

  const handleAnalyze = async () => {
    if (!selectedIds.length) {
      toast({
        title: 'Seleção vazia',
        description: 'Selecione ao menos uma avaliação para montar o mapa da equipe.',
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
      toast({
        title: 'Mapa atualizado',
        description: 'Distribuição comportamental da equipe gerada com sucesso.',
      });
    } catch (analyzeError) {
      const message = analyzeError?.message || 'Falha ao analisar equipe.';
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

  const collectivePercentages = teamMap?.collectivePercentages || { D: 0, I: 0, S: 0, C: 0 };
  const dominancePercentages = teamMap?.dominanceDistribution?.percentages || { D: 0, I: 0, S: 0, C: 0 };
  const members = Array.isArray(teamMap?.members) ? teamMap.members : [];

  const pieData = useMemo(
    () => ({
      labels: FACTORS.map((factor) => `${factor} • ${FACTOR_LABELS[factor]}`),
      datasets: [
        {
          label: 'Distribuição média da equipe',
          data: FACTORS.map((factor) => Number(collectivePercentages?.[factor] || 0)),
          backgroundColor: FACTORS.map((factor) => `${FACTOR_COLORS[factor]}aa`),
          borderColor: FACTORS.map((factor) => FACTOR_COLORS[factor]),
          borderWidth: 1,
        },
      ],
    }),
    [collectivePercentages],
  );

  const barData = useMemo(
    () => ({
      labels: FACTORS,
      datasets: [
        {
          label: 'Predominância por fator (%)',
          data: FACTORS.map((factor) => Number(dominancePercentages?.[factor] || 0)),
          backgroundColor: FACTORS.map((factor) => FACTOR_COLORS[factor]),
          borderRadius: 8,
        },
      ],
    }),
    [dominancePercentages],
  );

  const radarData = useMemo(
    () => ({
      labels: FACTORS,
      datasets: [
        {
          label: 'Mapa radar coletivo',
          data: FACTORS.map((factor) => Number(collectivePercentages?.[factor] || 0)),
          backgroundColor: 'rgba(79, 70, 229, 0.22)',
          borderColor: '#4f46e5',
          borderWidth: 2,
          pointBackgroundColor: '#4f46e5',
          fill: true,
        },
      ],
    }),
    [collectivePercentages],
  );

  const lineData = useMemo(() => {
    if (!members.length) return null;

    return {
      labels: members.map((member, index) => member?.candidateName || `Membro ${index + 1}`),
      datasets: FACTORS.map((factor) => ({
        label: factor,
        data: members.map((member) => Number(member?.disc?.[factor] || 0)),
        borderColor: FACTOR_COLORS[factor],
        backgroundColor: `${FACTOR_COLORS[factor]}33`,
        tension: 0.25,
      })),
    };
  }, [members]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
        },
      },
    }),
    [],
  );

  return (
    <div className="flex-1 overflow-auto p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-2xl tracking-tight text-slate-900">
                  <Users className="h-6 w-6 text-indigo-600" />
                  Mapa Comportamental de Equipes
                </CardTitle>
                <p className="mt-1 text-sm text-slate-600">
                  Selecione múltiplas avaliações para visualizar o comportamento coletivo da equipe.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-xs text-slate-600">
                Selecione pelo menos 1 avaliação
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2">
              <div className="relative min-w-[220px] flex-1 sm:flex-none">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nome, e-mail ou fator dominante"
                  className="h-10 border-slate-200 pl-9 sm:w-80"
                />
              </div>

              <Badge variant="outline">Selecionados: {selectedIds.length}</Badge>

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

              <Button className="h-10 bg-indigo-600 hover:bg-indigo-700" onClick={handleAnalyze} disabled={isAnalyzing || !selectedIds.length}>
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando mapa...
                  </>
                ) : (
                  'Gerar mapa da equipe'
                )}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <PanelState
                type="loading"
                title="Carregando avaliações da equipe"
                description="Estamos preparando a lista para montagem do mapa coletivo."
              />
            ) : null}

            {!isLoading && error ? (
              <PanelState type="error" title="Erro ao carregar mapa de equipe" description={error} />
            ) : null}

            {!isLoading && !error && !filteredAssessments.length ? (
              <EmptyState
                icon={Users}
                title="Nenhuma avaliação disponível"
                description="Ainda não há avaliações com perfil DISC acessíveis para montar o mapa da equipe."
                size="compact"
                tone="soft"
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
                      htmlFor={`team-map-${assessmentId}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        checked ? 'border-indigo-300 bg-indigo-50/70 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <Checkbox
                        id={`team-map-${assessmentId}`}
                        checked={checked}
                        onCheckedChange={() => toggleAssessmentSelection(assessmentId)}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-slate-900">{assessment?.candidateName || 'Participante'}</div>
                        <div className="truncate text-xs text-slate-500">{assessment?.candidateEmail || 'Sem e-mail'}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="secondary">Dominante {assessment?.dominantFactor || '-'}</Badge>
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

        {teamMap ? (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {FACTORS.map((factor) => (
                <Card key={`collective-${factor}`} className="border-slate-200">
                  <CardContent className="p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-500">{FACTOR_LABELS[factor]}</div>
                    <div className="mt-2 text-2xl font-black" style={{ color: FACTOR_COLORS[factor] }}>
                      {Number(collectivePercentages?.[factor] || 0).toFixed(2)}%
                    </div>
                  </CardContent>
                </Card>
              ))}

              <Card className="border-indigo-200 bg-indigo-50/70">
                <CardContent className="p-4">
                  <div className="text-xs uppercase tracking-wide text-indigo-700">Perfil predominante</div>
                  <div className="mt-2 text-lg font-black text-indigo-900">
                    {teamMap?.predominantFactor || '-'} • {teamMap?.predominantLabel || ''}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base text-slate-900">Leitura da equipe</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-slate-700">{teamMap?.predominantNarrative || 'Sem narrativa disponível.'}</CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PieIcon className="h-5 w-5 text-indigo-600" />
                    Pizza DISC da equipe
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <Pie data={pieData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                    Barra de predominância
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <Bar data={barData} options={chartOptions} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <RadarIcon className="h-5 w-5 text-indigo-600" />
                    Radar coletivo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <Radar
                      data={radarData}
                      options={{
                        ...chartOptions,
                        scales: {
                          r: {
                            min: 0,
                            max: 100,
                            ticks: {
                              backdropColor: 'transparent',
                            },
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-indigo-600" />
                    Linha de variação por membro
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    {lineData ? <Line data={lineData} options={chartOptions} /> : null}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
