import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { createPageUrl } from '@/utils';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link to={createPageUrl('Home')}>
          <Button variant="ghost" className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </Link>

        <Card>
          <CardContent className="p-8 space-y-4">
            <h1 className="text-2xl font-bold text-slate-900">Política de Privacidade</h1>
            <p className="text-slate-600">
              Este documento descreve como coletamos, utilizamos e protegemos dados pessoais na plataforma InsightDISC.
            </p>
            <p className="text-slate-600">
              Em caso de dúvidas, solicitações de acesso, correção ou exclusão de dados, entre em contato em:
              <span className="font-medium"> privacidade@insightdisc.app</span>.
            </p>
            <p className="text-sm text-slate-500">Última atualização: 4 de março de 2026.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
