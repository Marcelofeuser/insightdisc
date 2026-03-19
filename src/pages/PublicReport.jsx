import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';
import DISCRadarChart from '@/components/disc/DISCRadarChart';
import { base44 } from '@/api/base44Client';

export default function PublicReport() {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [assessment, setAssessment] = useState(null);

  useEffect(() => {
    const token = pathToken || searchParams.get('t') || searchParams.get('token');
    if (!token) {
      setError('Token público não informado.');
      setLoading(false);
      return;
    }

    const load = async () => {
      if (token.startsWith('mock:')) {
        const assessmentId = token.slice('mock:'.length);
        try {
          const data = await base44.entities.Assessment.filter({ id: assessmentId });
          if (data?.length) {
            setAssessment(data[0]);
          } else {
            throw new Error('Assessment mock não encontrado.');
          }
        } catch (err) {
          setError(err?.message || 'Não foi possível carregar o relatório mock.');
        } finally {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await fetch(`/api/report/public?token=${encodeURIComponent(token)}`);
        const raw = await response.text();
        const data = raw ? JSON.parse(raw) : null;
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error || 'Link expirado ou inválido.');
        }
        setAssessment(data.assessment);
      } catch (err) {
        setError(err?.message || 'Não foi possível carregar o relatório público.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [pathToken, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !assessment) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardContent className="p-8 space-y-4">
            <h1 className="text-xl font-bold text-slate-900">Relatório público indisponível</h1>
            <p className="text-sm text-slate-600">{error || 'Não foi possível carregar os dados.'}</p>
            <Link to={createPageUrl('Home')}>
              <Button>Voltar ao início</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const natural = assessment?.results?.natural_profile || assessment?.natural_profile || { D: 0, I: 0, S: 0, C: 0 };
  const dominant = assessment?.results?.dominant_factor || assessment?.dominant_factor || '-';
  const isPremiumUnlocked = Boolean(assessment?.report_unlocked || assessment?.unlocked_tier === 'pro');

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>

        <Card>
          <CardContent className="p-8 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Relatório DISC Público</h1>
              <p className="text-sm text-slate-600">Perfil dominante: {dominant}</p>
            </div>
            <div className="flex justify-center">
              <DISCRadarChart naturalProfile={natural} showAdapted={false} size={300} />
            </div>
            <div className="flex flex-col gap-4">
              <div className="rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
                <p className="text-sm text-green-800">
                  Este relatório já foi salvo automaticamente no painel do responsável pela avaliação.
                </p>
                <a
                  href={`/api/report/pdf?token=${encodeURIComponent(pathToken || searchParams.get('t') || searchParams.get('token') || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    Baixar PDF oficial
                  </Button>
                </a>
              </div>
              {isPremiumUnlocked ? (
                <p className="text-sm text-slate-700">
                  Relatório completo desbloqueado para este assessment.
                </p>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
                  <p className="text-sm text-amber-800">
                    Você está vendo o resumo gratuito. Desbloqueie o Premium para acessar o conteúdo completo.
                  </p>
                  <Link to={`${createPageUrl('Pricing')}?assessmentId=${encodeURIComponent(assessment?.id || '')}`}>
                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      Desbloquear Premium
                    </Button>
                  </Link>
                </div>
              )}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <p className="text-xs text-slate-600">
                  Quer adicionar este relatório ao seu próprio portal?
                  <br />
                  <b>Crie sua conta ou faça login para adicionar uma cópia ao seu portal pessoal.</b>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
