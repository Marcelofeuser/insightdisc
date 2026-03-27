import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const archetypes = {
  DI: {
    nome: 'Catalisador de Resultado',
    forcas: ['Decisão rápida', 'Foco em metas', 'Iniciativa'],
    riscos: ['Impaciência', 'Baixa tolerância a detalhes', 'Conflitos diretos'],
    como_liderar: ['Dê autonomia', 'Defina metas claras', 'Feedback objetivo'],
  },
  SC: {
    nome: 'Construtor de Harmonia',
    forcas: ['Colaboração', 'Consistência', 'Atenção ao grupo'],
    riscos: ['Resistência a mudanças', 'Evita conflitos', 'Lentidão em decisões'],
    como_liderar: ['Ofereça segurança', 'Explique mudanças', 'Valorize estabilidade'],
  },
  IS: {
    nome: 'Influenciador Social',
    forcas: ['Entusiasmo', 'Relacionamento', 'Comunicação'],
    riscos: ['Dispersão', 'Busca aprovação', 'Dificuldade com rotina'],
    como_liderar: ['Reconheça publicamente', 'Dê espaço para ideias', 'Mantenha ambiente positivo'],
  },
  CD: {
    nome: 'Especialista Analítico',
    forcas: ['Precisão', 'Planejamento', 'Qualidade'],
    riscos: ['Perfeccionismo', 'Rigidez', 'Dificuldade com improviso'],
    como_liderar: ['Dê dados e contexto', 'Explique critérios', 'Evite pressão emocional'],
  },
};

export default function Archetypes() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 grid gap-6 grid-cols-1 md:grid-cols-2">
      {Object.entries(archetypes).map(([key, data]) => (
        <Card key={key} className="border border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>{data.nome} <span className="text-xs text-slate-500">({key})</span></CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              <strong>Forças:</strong>
              <ul className="list-disc ml-5 text-sm text-slate-700">
                {data.forcas.map((f) => <li key={f}>{f}</li>)}
              </ul>
            </div>
            <div className="mb-2">
              <strong>Riscos:</strong>
              <ul className="list-disc ml-5 text-sm text-slate-700">
                {data.riscos.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
            <div className="mb-2">
              <strong>Como liderar:</strong>
              <ul className="list-disc ml-5 text-sm text-slate-700">
                {data.como_liderar.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="rounded-lg bg-indigo-600 text-white px-3 py-1 text-xs hover:bg-indigo-700">Aplicar na equipe</button>
              <button className="rounded-lg border border-slate-300 px-3 py-1 text-xs hover:border-indigo-400">Ver análise completa</button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
