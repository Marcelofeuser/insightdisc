import React from 'react';
import PanelState from '@/components/ui/PanelState';

export function DashboardLoadingState({
  title = 'Carregando painel',
  description = 'Estamos preparando suas métricas e blocos analíticos.',
}) {
  return (
    <section className="space-y-4">
      <PanelState type="loading" title={title} description={description} />

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
        {[...Array(6)].map((_, index) => (
          <div key={`metric-skeleton-${index}`} className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {[...Array(4)].map((_, index) => (
          <div key={`panel-skeleton-${index}`} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" />
        ))}
      </div>
    </section>
  );
}

export function DashboardErrorState({
  message,
  title = 'Não foi possível carregar todos os dados do painel',
}) {
  return (
    <PanelState
      type="error"
      title={title}
      description={message || 'Verifique sua conexão e tente novamente em alguns instantes.'}
    />
  );
}
