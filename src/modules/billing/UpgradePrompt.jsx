import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UpgradePrompt({
  title = 'Recurso disponível em plano superior',
  description = 'Faça upgrade do seu plano para desbloquear esta funcionalidade premium.',
  requiredPlanLabel = '',
  ctaLabel = 'Ver planos',
  compact = false,
}) {
  return (
    <div
      className={`rounded-2xl border border-amber-200 bg-amber-50/80 ${
        compact ? 'p-4' : 'p-6'
      }`}
      data-testid="upgrade-prompt"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
            <Lock className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-amber-900">{title}</p>
            <p className="mt-1 text-sm text-amber-800/90">{description}</p>
            {requiredPlanLabel ? (
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.08em] text-amber-700">
                Plano recomendado: {requiredPlanLabel}
              </p>
            ) : null}
          </div>
        </div>

        <Link to="/Pricing" className="shrink-0">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white">
            <TrendingUp className="mr-2 h-4 w-4" />
            {ctaLabel}
          </Button>
        </Link>
      </div>
    </div>
  );
}
