import React from 'react';
import { CalendarClock, Fingerprint, UserCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PanelShell from '@/components/ui/PanelShell';
import { resolveFactorLabel } from '@/modules/discEngine';

function formatDate(value) {
  if (!value) return 'Data indisponível';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Data indisponível';
  return parsed.toLocaleDateString('pt-BR');
}

export default function ResultHero({
  interpretation,
  respondentName = 'Participante',
  completedAt = '',
  actions = null,
}) {
  return (
    <PanelShell
      tone="accent"
      className="border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/60"
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
            Resultado oficial da avaliação
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Seu Resultado DISC
          </h2>

          <p className="mt-2 text-sm text-slate-700 sm:text-base">
            <span className="font-semibold text-slate-900">
              {interpretation?.profileCode || 'DISC'} • {interpretation?.styleLabel || 'Estilo em consolidação'}
            </span>
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
            {interpretation?.summaryShort ||
              'Leitura comportamental em consolidação. Conclua novas avaliações para aprofundar os insights.'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-800">
              Primário: {interpretation?.primaryFactor || '-'} • {resolveFactorLabel(interpretation?.primaryFactor)}
            </Badge>
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
              Secundário: {interpretation?.secondaryFactor || '-'} • {resolveFactorLabel(interpretation?.secondaryFactor)}
            </Badge>
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
              Combinação: {interpretation?.profileCode || 'DISC'}
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <UserCircle2 className="h-4 w-4" />
              {respondentName}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-4 w-4" />
              {formatDate(completedAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Fingerprint className="h-4 w-4" />
              Estilo {interpretation?.styleLabel || 'DISC'}
            </span>
          </div>
        </div>

        {actions ? <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </PanelShell>
  );
}

