import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { apiRequest, getApiBaseUrl } from '@/lib/apiClient';
import { base44 } from '@/api/base44Client';
import { validateInviteToken } from '@/modules/invites/invite-validation';

const TOTAL_QUESTIONS = 40;

function getDraftAnsweredCount(assessmentId) {
  if (!assessmentId || typeof window === 'undefined') return 0;
  try {
    const raw = window.localStorage.getItem(`disc_draft_${assessmentId}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Object.keys(parsed?.savedAnswers || {}).length;
  } catch {
    return 0;
  }
}

function getAnswersCountFromAssessment(assessment) {
  if (!assessment) return 0;
  if (Array.isArray(assessment?.answers)) return assessment.answers.length;
  if (Array.isArray(assessment?.response?.answersJson)) return assessment.response.answersJson.length;
  return 0;
}

export default function CandidateUpgrade() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const apiBaseUrl = getApiBaseUrl();

  const token = String(params.get('token') || '').trim();
  const providedAssessmentId = String(params.get('assessmentId') || params.get('assessment_id') || '').trim();
  const [error, setError] = useState('');

  const hasApi = useMemo(() => Boolean(apiBaseUrl), [apiBaseUrl]);

  useEffect(() => {
    let mounted = true;

    const decideUpgradePath = async () => {
      setError('');

      if (!token && !providedAssessmentId) {
        if (mounted) setError('Token de acesso ausente para continuar.');
        return;
      }

      // 1) Prefer backend public endpoint when available.
      if (hasApi && token) {
        try {
          const payload = await apiRequest(
            `/assessment/report-by-token?token=${encodeURIComponent(token)}`
          );

          const apiAssessmentId = payload?.assessment?.id || providedAssessmentId;
          const answeredCount = Number(
            payload?.answeredCount ||
              payload?.assessment?.answeredCount ||
              (Array.isArray(payload?.answers) ? payload.answers.length : 0)
          );

          if (answeredCount < TOTAL_QUESTIONS) {
            const query = new URLSearchParams();
            query.set('token', token);
            if (apiAssessmentId) query.set('assessment_id', apiAssessmentId);
            query.set('resume', '1');
            query.set('answeredCount', String(answeredCount));
            navigate(`/c/assessment?${query.toString()}`, { replace: true });
            return;
          }

          const reportQuery = new URLSearchParams();
          reportQuery.set('token', token);
          const publicReportPath = String(payload?.publicAccess?.publicReportPath || '').trim();
          if (publicReportPath) {
            navigate(publicReportPath, { replace: true });
            return;
          }
          navigate(`/c/report?${reportQuery.toString()}`, { replace: true });
          return;
        } catch (requestError) {
          // API unavailable/invalid -> fallback to mock/local
          console.warn('[CandidateUpgrade] fallback para mock/local', requestError);
        }
      }

      // 2) Fallback: local/mock resolution.
      try {
        let localAssessment = null;

        if (token) {
          const validation = await validateInviteToken(token, base44.entities.Assessment);
          if (validation?.assessment) {
            localAssessment = validation.assessment;
          }
        }

        if (!localAssessment && providedAssessmentId) {
          const byId = await base44.entities.Assessment.filter({ id: providedAssessmentId });
          if (byId?.length) {
            localAssessment = byId[0];
          }
        }

        if (!localAssessment) {
          throw new Error('NOT_FOUND');
        }

        const assessmentId = localAssessment.id || providedAssessmentId;
        const answeredCount = Math.max(
          getAnswersCountFromAssessment(localAssessment),
          getDraftAnsweredCount(assessmentId)
        );

        if (answeredCount < TOTAL_QUESTIONS) {
          const query = new URLSearchParams();
          if (token) query.set('token', token);
          if (assessmentId) query.set('assessment_id', assessmentId);
          query.set('resume', '1');
          query.set('answeredCount', String(answeredCount));
          navigate(`/c/assessment?${query.toString()}`, { replace: true });
          return;
        }

        const reportQuery = new URLSearchParams();
        if (token) reportQuery.set('token', token);
        navigate(`/c/report?${reportQuery.toString()}`, { replace: true });
      } catch {
        if (mounted) {
          setError('Não foi possível recuperar seu progresso. Solicite um novo link ao profissional responsável.');
        }
      }
    };

    decideUpgradePath();

    return () => {
      mounted = false;
    };
  }, [token, providedAssessmentId, hasApi, navigate]);

  return (
    <div className="rounded-xl border bg-white p-6">
      {error ? (
        <div className="space-y-2">
          <h1 className="text-lg font-semibold text-slate-900">Não foi possível continuar</h1>
          <p className="text-sm text-slate-600">{error}</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-slate-700">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Validando progresso da avaliação...</span>
        </div>
      )}
    </div>
  );
}
