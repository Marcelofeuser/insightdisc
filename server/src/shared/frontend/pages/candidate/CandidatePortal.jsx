import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { apiRequest, getApiBaseUrl } from '@/lib/apiClient';

const CANDIDATE_JWT_KEY = 'candidate_jwt';

function getCandidateToken() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(CANDIDATE_JWT_KEY) || '';
}

export default function CandidatePortal() {
  const apiBaseUrl = getApiBaseUrl();
  const hasApi = Boolean(apiBaseUrl);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const candidateToken = useMemo(() => getCandidateToken(), []);

  useEffect(() => {
    const run = async () => {
      if (!hasApi) {
        setLoading(false);
        return;
      }

      if (!candidateToken) {
        setError('Faça o login da conta de candidato para acessar seus relatórios salvos.');
        setLoading(false);
        return;
      }

      try {
        const payload = await apiRequest('/candidate/me/reports', {
          token: candidateToken,
        });
        setReports(payload?.reports || []);
      } catch (requestError) {
        setError(requestError?.message || 'Não foi possível carregar seus relatórios.');
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [hasApi, candidateToken]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Portal do Candidato</h1>
        <p className="text-sm text-slate-600">Acesse seus relatórios salvos e PDFs gerados.</p>
      </div>

      {!hasApi ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-slate-600">
          O portal do candidato requer backend ativo com <code>VITE_API_URL</code> configurado.
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-slate-500">Carregando...</div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">{error}</div>
      ) : null}

      {!loading && !error && reports.length === 0 ? (
        <div className="rounded-xl border bg-white p-4 text-sm text-slate-600">Nenhum relatório salvo ainda.</div>
      ) : null}

      {!loading && !error && reports.length > 0 ? (
        <div className="grid gap-3">
          {reports.map((report) => (
            <div key={report.assessmentId} className="rounded-xl border bg-white p-4">
              <div className="font-semibold text-slate-900">{report.candidateName || 'Relatório DISC'}</div>
              <div className="text-xs text-slate-500">{report.candidateEmail || ''}</div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/c/report?id=${encodeURIComponent(report.assessmentId)}`}>
                  <Button variant="outline" className="rounded-lg">Abrir relatório</Button>
                </Link>
                {report.pdfUrl ? (
                  <a href={report.pdfUrl} target="_blank" rel="noreferrer">
                    <Button className="rounded-lg bg-slate-900 hover:bg-slate-800">Baixar PDF</Button>
                  </a>
                ) : (
                  <span className="text-sm text-slate-400 self-center">PDF indisponível</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
