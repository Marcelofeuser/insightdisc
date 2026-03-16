import React from 'react';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PanelShell from '@/components/ui/PanelShell';
import PanelState from '@/components/ui/PanelState';
import SectionHeader from '@/components/ui/SectionHeader';

function formatDate(value) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('pt-BR');
}

export default function TeamCompositionGrid({ members = [] }) {
  return (
    <PanelShell>
      <SectionHeader
        icon={Users}
        title="Mapa visual de perfis da equipe"
        subtitle="Composição comportamental por pessoa para leitura rápida de complementaridade do grupo."
      />

      {members.length ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {members.map((member) => (
            <article key={member?.assessmentId || member?.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="truncate text-sm font-semibold text-slate-900">{member?.name || 'Participante'}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{member?.email || 'Sem e-mail'}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{member?.profileCode || 'DISC'}</Badge>
                <Badge variant="secondary">{member?.dominantFactor || '-'}</Badge>
                {member?.secondaryFactor ? <Badge variant="secondary">{member.secondaryFactor}</Badge> : null}
              </div>

              <div className="mt-2 space-y-1 text-xs text-slate-600">
                {member?.role ? <p>Cargo: <span className="font-medium text-slate-700">{member.role}</span></p> : null}
                {member?.department ? <p>Departamento: <span className="font-medium text-slate-700">{member.department}</span></p> : null}
                {member?.manager ? <p>Gestor: <span className="font-medium text-slate-700">{member.manager}</span></p> : null}
                {member?.city ? <p>Cidade: <span className="font-medium text-slate-700">{member.city}</span></p> : null}
                {formatDate(member?.createdAt) ? (
                  <p>Leitura em: <span className="font-medium text-slate-700">{formatDate(member.createdAt)}</span></p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <PanelState className="mt-4" title="Sem composição disponível" description="Selecione avaliações válidas e gere o mapa organizacional para visualizar os perfis." />
      )}
    </PanelShell>
  );
}
