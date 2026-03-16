import React from 'react';
import { ArrowLeftRight, GitCompareArrows, Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PanelShell from '@/components/ui/PanelShell';
import { Button } from '@/components/ui/button';

export default function ComparisonHero({
  comparison,
  onSwapProfiles,
  canSwap = true,
  actions,
}) {
  const left = comparison?.profileA;
  const right = comparison?.profileB;

  return (
    <PanelShell tone="accent" className="border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/60">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
            Comparador de Perfis DISC
          </p>
          <h2 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            <GitCompareArrows className="h-6 w-6 text-indigo-600" />
            Comparar Perfis
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            {comparison?.summaryMedium ||
              'Compare dois perfis DISC para identificar sinergias, tensoes e acordos praticos de colaboracao.'}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">
              Modo: {comparison?.modeLabel || 'Pessoa x pessoa'}
            </Badge>
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
              A: {left?.profileCode || 'DISC'} - {left?.styleLabel || 'Perfil A'}
            </Badge>
            <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
              B: {right?.profileCode || 'DISC'} - {right?.styleLabel || 'Perfil B'}
            </Badge>
            <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-800">
              <Gauge className="mr-1 h-3.5 w-3.5" />
              Compatibilidade: {Number(comparison?.compatibilityScore || 0).toFixed(1)}% ({comparison?.compatibilityLevel || 'Moderada'})
            </Badge>
          </div>
        </div>

        <div className="flex max-w-full flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onSwapProfiles} disabled={!canSwap}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Trocar perfis
          </Button>
          {actions}
        </div>
      </div>
    </PanelShell>
  );
}
