import React, { useMemo } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { FileSearch } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/button';
import { buildAssessmentReportPath } from '@/modules/reports/routes';

function resolveLegacyAssessmentId(params) {
  return String(
    params.get('id') ||
      params.get('assessmentId') ||
      params.get('reportId') ||
      '',
  ).trim();
}

export default function ReportLegacyPage() {
  const [searchParams] = useSearchParams();

  const redirectPath = useMemo(() => {
    const assessmentId = resolveLegacyAssessmentId(searchParams);
    if (!assessmentId) return '';

    const remaining = new URLSearchParams(searchParams);
    remaining.delete('id');
    remaining.delete('assessmentId');
    remaining.delete('reportId');

    const basePath = buildAssessmentReportPath(assessmentId);
    const suffix = remaining.toString();
    return suffix ? `${basePath}?${suffix}` : basePath;
  }, [searchParams]);

  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }

  return (
    <div className="w-full min-w-0 max-w-5xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
      <EmptyState
        icon={FileSearch}
        title="Relatório DISC"
        description="Informe um identificador de avaliação para abrir o relatório oficial."
        tone="soft"
      />
      <div className="mt-4 flex justify-center">
        <Link to="/MyAssessments">
          <Button variant="outline">Abrir minhas avaliações</Button>
        </Link>
      </div>
    </div>
  );
}
