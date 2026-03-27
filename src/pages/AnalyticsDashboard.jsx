import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, TrendingUp, Target, ArrowLeft,
  Download, CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { buildAssessmentReportPath } from '@/modules/reports';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  LineChart, Line, CartesianGrid
} from 'recharts';

const DISC_COLORS = { D: '#EF4444', I: '#F97316', S: '#22C55E', C: '#3B82F6' };
const DISC_LABELS = { D: 'Dominância', I: 'Influência', S: 'Estabilidade', C: 'Conformidade' };

function CulturalFitScore({ candidate, jobProfile }) {
  const score = Math.round(
    ['D', 'I', 'S', 'C'].reduce((acc, f) => {
      const diff = Math.abs((candidate[f] || 0) - (jobProfile[f] || 0));
      return acc + (100 - diff);
    }, 0) / 4
  );
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  const bg = score >= 80 ? 'bg-green-50' : score >= 60 ? 'bg-amber-50' : 'bg-red-50';
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${bg}`}>
      <Target className={`w-4 h-4 ${color}`} />
      <span className={`font-bold text-sm ${color}`}>{score}% fit</span>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [activeJobProfile] = useState({ D: 70, I: 55, S: 40, C: 65 }); // Ideal: liderança técnica

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await base44.entities.Assessment.filter({ status: 'completed' }, '-completed_at', 50);
      setAssessments(data);
      // Pre-select first 3 for comparison
      setSelectedCandidates(data.slice(0, 3).map(a => a.id));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleCandidate = (id) => {
    setSelectedCandidates(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  // Build comparison radar data
  const comparisonData = ['D', 'I', 'S', 'C'].map(f => {
    const row = { factor: f };
    selectedCandidates.forEach((id, idx) => {
      const a = assessments.find(x => x.id === id);
      row[`C${idx + 1}`] = a?.results?.natural_profile?.[f] || 0;
    });
    row['Ideal'] = activeJobProfile[f];
    return row;
  });

  // Trend data: group by week
  const trendData = (() => {
    const weeks = {};
    assessments.forEach(a => {
      const d = new Date(a.completed_at);
      const week = `${d.getDate()}/${d.getMonth() + 1}`;
      if (!weeks[week]) weeks[week] = { week, D: 0, I: 0, S: 0, C: 0, count: 0 };
      weeks[week].count++;
      ['D', 'I', 'S', 'C'].forEach(f => {
        weeks[week][f] += a.results?.natural_profile?.[f] || 0;
      });
    });
    return Object.values(weeks).slice(-8).map(w => ({
      week: w.week,
      D: w.count ? Math.round(w.D / w.count) : 0,
      I: w.count ? Math.round(w.I / w.count) : 0,
      S: w.count ? Math.round(w.S / w.count) : 0,
      C: w.count ? Math.round(w.C / w.count) : 0,
    }));
  })();

  // Distribution
  const distributionData = ['D', 'I', 'S', 'C'].map(f => ({
    name: DISC_LABELS[f],
    Média: assessments.length
      ? Math.round(assessments.reduce((a, b) => a + (b.results?.natural_profile?.[f] || 0), 0) / assessments.length)
      : 0
  }));

  const exportCSV = () => {
    const rows = [
      ['ID', 'Data', 'Tipo', 'D', 'I', 'S', 'C', 'Dominante'],
      ...assessments.map(a => [
        a.id?.slice(0, 8),
        a.completed_at ? new Date(a.completed_at).toLocaleDateString('pt-BR') : '-',
        a.type || '-',
        a.results?.natural_profile?.D || 0,
        a.results?.natural_profile?.I || 0,
        a.results?.natural_profile?.S || 0,
        a.results?.natural_profile?.C || 0,
        a.results?.dominant_factor || '-'
      ])
    ];
    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'disc-analytics.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const COLORS = ['#6366F1', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="ghost" size="icon" className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Analytics B2B</h1>
              <p className="text-sm text-slate-500">{assessments.length} avaliações analisadas</p>
            </div>
          </div>
          <Button onClick={exportCSV} variant="outline" className="rounded-xl">
            <Download className="w-4 h-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="comparison">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl mb-8">
            <TabsTrigger value="comparison" className="rounded-lg">Comparação de Perfis</TabsTrigger>
            <TabsTrigger value="trends" className="rounded-lg">Tendências</TabsTrigger>
            <TabsTrigger value="cultural" className="rounded-lg">Fit Cultural</TabsTrigger>
          </TabsList>

          {/* COMPARISON TAB */}
          <TabsContent value="comparison">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Candidate selector */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" /> Selecionar Candidatos
                  </CardTitle>
                  <p className="text-xs text-slate-500">Máximo 5 para comparar</p>
                </CardHeader>
                <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />)}
                    </div>
                  ) : assessments.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Nenhuma avaliação concluída</p>
                  ) : assessments.map((a, idx) => {
                    const selected = selectedCandidates.includes(a.id);
                    const colorIdx = selectedCandidates.indexOf(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggleCandidate(a.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                          selected ? 'border-indigo-400 bg-indigo-50' : 'border-transparent bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: selected ? COLORS[colorIdx] : '#CBD5E1' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {a.candidate_name || `Candidato ${idx + 1}`}
                          </p>
                          <p className="text-xs text-slate-500">
                            {a.results?.dominant_factor} · {a.completed_at ? new Date(a.completed_at).toLocaleDateString('pt-BR') : '-'}
                          </p>
                        </div>
                        {selected && <CheckCircle2 className="w-4 h-4 text-indigo-500 flex-shrink-0" />}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Radar comparison */}
              <Card className="lg:col-span-2 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Sobreposição de Perfis</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedCandidates.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-400">
                      Selecione pelo menos 1 candidato
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <RadarChart data={comparisonData}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="factor" />
                        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        {selectedCandidates.map((id, idx) => (
                          <Radar key={id} name={`C${idx + 1}`} dataKey={`C${idx + 1}`}
                            stroke={COLORS[idx]} fill={COLORS[idx]} fillOpacity={0.15} strokeWidth={2} />
                        ))}
                        <Radar name="Perfil Ideal" dataKey="Ideal"
                          stroke="#64748B" fill="#64748B" fillOpacity={0.05}
                          strokeWidth={2} strokeDasharray="5 5" />
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TRENDS TAB */}
          <TabsContent value="trends">
            <div className="grid gap-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Tendência Média por Semana
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {trendData.length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-slate-400">Dados insuficientes</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="week" tick={{ fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        {['D', 'I', 'S', 'C'].map(f => (
                          <Line key={f} type="monotone" dataKey={f} stroke={DISC_COLORS[f]}
                            strokeWidth={2} dot={{ r: 4 }} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Distribuição Média do Grupo</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={distributionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="Média" fill="#6366F1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* CULTURAL FIT TAB */}
          <TabsContent value="cultural">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4" /> Perfil Ideal da Vaga
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500 mb-4">Liderança Técnica (exemplo)</p>
                  <div className="space-y-3">
                    {Object.entries(activeJobProfile).map(([f, v]) => (
                      <div key={f}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium" style={{ color: DISC_COLORS[f] }}>{f} — {DISC_LABELS[f]}</span>
                          <span className="text-slate-600">{v}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${v}%`, backgroundColor: DISC_COLORS[f] }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Ranking de Candidatos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {loading ? (
                      [1,2,3].map(i => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)
                    ) : assessments.length === 0 ? (
                      <p className="text-sm text-slate-500 text-center py-4">Nenhuma avaliação disponível</p>
                    ) : [...assessments]
                      .filter(a => a.results?.natural_profile)
                      .sort((a, b) => {
                        const scoreA = ['D','I','S','C'].reduce((s,f) => s + (100 - Math.abs((a.results.natural_profile[f]||0) - activeJobProfile[f])), 0);
                        const scoreB = ['D','I','S','C'].reduce((s,f) => s + (100 - Math.abs((b.results.natural_profile[f]||0) - activeJobProfile[f])), 0);
                        return scoreB - scoreA;
                      })
                      .slice(0, 10)
                      .map((a, idx) => (
                        <div key={a.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-amber-100 text-amber-700' :
                            idx === 1 ? 'bg-slate-200 text-slate-700' :
                            idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                          }`}>{idx + 1}</span>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-800">
                              {a.candidate_name || `Candidato`}
                            </p>
                            <p className="text-xs text-slate-500">
                              Dominante: {a.results.dominant_factor} · {a.completed_at ? new Date(a.completed_at).toLocaleDateString('pt-BR') : '-'}
                            </p>
                          </div>
                          <CulturalFitScore candidate={a.results.natural_profile} jobProfile={activeJobProfile} />
                          <Link to={buildAssessmentReportPath(a.id)}>
                            <Button variant="ghost" size="sm" className="text-indigo-600 text-xs">Ver</Button>
                          </Link>
                        </div>
                      ))
                    }
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
