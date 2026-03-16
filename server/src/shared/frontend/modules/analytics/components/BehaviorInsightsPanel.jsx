import React, { useMemo } from 'react';
import { AlertTriangle, Lightbulb, Sparkles } from 'lucide-react';
import { buildBehaviorInsights } from '@/modules/analytics/insights';
import PanelShell from '@/components/ui/PanelShell';
import PanelState from '@/components/ui/PanelState';
import SectionHeader from '@/components/ui/SectionHeader';

function resolveToneClass(message = '') {
  const normalized = String(message || '').toLowerCase();
  if (normalized.includes('baixa presença') || normalized.includes('risco') || normalized.includes('alerta')) {
    return {
      icon: AlertTriangle,
      className: 'border-amber-200 bg-amber-50/70 text-amber-900',
      iconClassName: 'bg-amber-100 text-amber-700',
    };
  }

  return {
    icon: Lightbulb,
    className: 'border-slate-200 bg-slate-50/60 text-slate-800',
    iconClassName: 'bg-indigo-100 text-indigo-700',
  };
}

export default function BehaviorInsightsPanel({
  title = 'Insights comportamentais',
  subtitle = 'Leituras automáticas para apoiar decisões de liderança, cultura e comunicação.',
  items = [],
  distribution = {},
  sampleSize = 0,
}) {
  const insights = useMemo(() => {
    if (Array.isArray(items) && items.length) {
      return items;
    }
    return buildBehaviorInsights(distribution, sampleSize);
  }, [distribution, items, sampleSize]);

  return (
    <PanelShell>
      <SectionHeader
        icon={Sparkles}
        iconClassName="bg-indigo-100 text-indigo-700"
        title={title}
        subtitle={subtitle}
      />

      <div className="mt-4 space-y-3">
        {insights.length ? insights.map((item, index) => {
          const tone = resolveToneClass(item);
          const Icon = tone.icon;

          return (
            <article key={`${item}-${index}`} className={`rounded-xl border p-3 ${tone.className}`}>
              <div className="flex items-start gap-3">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${tone.iconClassName}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm leading-relaxed">{item}</p>
              </div>
            </article>
          );
        }) : (
          <PanelState
            title="Insights indisponíveis"
            description="Conclua mais avaliações para gerar leitura comportamental com maior profundidade."
          />
        )}
      </div>
    </PanelShell>
  );
}
