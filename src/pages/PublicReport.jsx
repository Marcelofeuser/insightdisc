import React from 'react';
import { Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';

export default function PublicReport() {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const token = String(pathToken || searchParams.get('t') || searchParams.get('token') || '').trim();
  const reportType = String(
    searchParams.get('type') || searchParams.get('reportType') || '',
  ).trim();

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 space-y-4">
            <h1 className="text-xl font-bold text-slate-900">Relatório público indisponível</h1>
            <p className="text-sm text-slate-600">
              Não foi possível identificar o link público deste relatório.
            </p>
            <a href={createPageUrl('Home')} className="text-sm font-medium text-indigo-700 hover:text-indigo-800">
              Voltar ao início
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  const query = new URLSearchParams({ token });
  if (reportType) {
    query.set('type', reportType);
  }

  return <Navigate to={`/c/report?${query.toString()}`} replace />;
}
