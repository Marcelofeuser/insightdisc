import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, FileText, Loader2 } from 'lucide-react';
import { apiRequest, getApiBaseUrl, resolveApiRequestUrl } from '@/lib/apiClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const INITIAL_FORM = Object.freeze({
  mode: 'professional',
  nome: 'João Silva',
  cargo: 'Gerente Comercial',
  empresa: 'Empresa XYZ',
  D: 34,
  I: 32,
  S: 23,
  C: 11,
});

function buildReportUrl(form) {
  const params = new URLSearchParams({
    mode: form.mode,
    d: String(form.D),
    i: String(form.I),
    s: String(form.S),
    c: String(form.C),
    nome: form.nome,
    cargo: form.cargo,
    empresa: form.empresa,
    useAi: 'true',
  });

  return resolveApiRequestUrl(`/report/generate-disc-report?${params.toString()}`, {
    baseUrl: getApiBaseUrl(),
  });
}

export default function AiDiscLab() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const reportUrl = buildReportUrl(form);

  async function handleGenerate() {
    setLoading(true);
    setError('');

    try {
      const payload = await apiRequest('/ai/report-preview', {
        method: 'POST',
        body: form,
      });
      setResult(payload);
    } catch (requestError) {
      setError(requestError?.message || 'Falha ao gerar insights com IA.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function updateField(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">AI Lab</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">Gemini DISC Preview</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              Laboratório mínimo para validar a camada de IA do InsightDISC sem substituir a
              pipeline determinística do relatório.
            </p>
          </div>
          <div className="flex gap-3">
            <Button asChild variant="outline" className="border-slate-700 bg-transparent text-slate-200">
              <Link to="/super-admin">Voltar ao Super Admin</Link>
            </Button>
            <Button
              className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              onClick={() => window.open(reportUrl, '_blank', 'noopener,noreferrer')}
              type="button"
            >
              <FileText className="mr-2 h-4 w-4" />
              Abrir relatório com IA
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
          <Card className="border-slate-800 bg-slate-900/80 text-slate-100 shadow-2xl">
            <CardHeader>
              <CardTitle>Entrada DISC</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Modo</Label>
                <Select value={form.mode} onValueChange={(value) => updateField('mode', value)}>
                  <SelectTrigger className="border-slate-700 bg-slate-950/80">
                    <SelectValue placeholder="Selecione o modo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={form.nome}
                    onChange={(event) => updateField('nome', event.target.value)}
                    className="border-slate-700 bg-slate-950/80"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input
                    value={form.cargo}
                    onChange={(event) => updateField('cargo', event.target.value)}
                    className="border-slate-700 bg-slate-950/80"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Empresa</Label>
                <Input
                  value={form.empresa}
                  onChange={(event) => updateField('empresa', event.target.value)}
                  className="border-slate-700 bg-slate-950/80"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {['D', 'I', 'S', 'C'].map((factor) => (
                  <div key={factor} className="space-y-2">
                    <Label>{factor}</Label>
                    <Input
                      type="number"
                      value={form[factor]}
                      onChange={(event) => updateField(factor, Number(event.target.value))}
                      className="border-slate-700 bg-slate-950/80"
                    />
                  </div>
                ))}
              </div>

              <Button
                className="w-full bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                onClick={handleGenerate}
                disabled={loading}
                type="button"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Gerar insights com IA
              </Button>

              {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/80 text-slate-100 shadow-2xl">
              <CardHeader>
                <CardTitle>Prévia estruturada</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Provider</p>
                    <p className="mt-2 text-lg font-semibold text-cyan-300">{result?.provider || '-'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Source</p>
                    <p className="mt-2 text-lg font-semibold text-cyan-300">{result?.source || '-'}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Fallback</p>
                    <p className="mt-2 text-lg font-semibold text-cyan-300">
                      {typeof result?.usedFallback === 'boolean' ? String(result.usedFallback) : '-'}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                  <p className="mb-2 text-xs uppercase tracking-[0.2em] text-slate-500">Summary</p>
                  <p className="text-sm leading-6 text-slate-200">
                    {result?.content?.summary || 'Execute a geração para visualizar a saída validada.'}
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">Forças</p>
                    <ul className="space-y-2 text-sm text-slate-200">
                      {(result?.content?.strengths || []).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                    <p className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-500">Desenvolvimento</p>
                    <ul className="space-y-2 text-sm text-slate-200">
                      {(result?.content?.developmentRecommendations || []).map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-900/80 text-slate-100 shadow-2xl">
              <CardHeader>
                <CardTitle>JSON validado</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  readOnly
                  value={result ? JSON.stringify(result, null, 2) : ''}
                  className="min-h-[380px] border-slate-800 bg-slate-950/90 font-mono text-xs text-cyan-100"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
