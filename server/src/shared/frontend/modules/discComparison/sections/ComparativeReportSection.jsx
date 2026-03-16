import React from 'react';
import { FileText, Layers3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PanelShell from '@/components/ui/PanelShell';
import SectionHeader from '@/components/ui/SectionHeader';

function ListPanel({ title, items = [], tone = 'default', fallback = '' }) {
  const toneClass =
    tone === 'positive'
      ? 'border-emerald-200 bg-emerald-50/50'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50/50'
        : 'border-slate-200 bg-white';

  return (
    <article className={`rounded-xl border p-4 ${toneClass}`}>
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {items.length ? (
        <ul className="mt-2 space-y-2 text-sm text-slate-700">
          {items.map((item) => (
            <li key={item} className="rounded-lg border border-white/70 bg-white/70 px-2.5 py-2">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-500">{fallback}</p>
      )}
    </article>
  );
}

function ReadingCard({ title, value }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">
        {value || 'Leitura comparativa indisponivel para este eixo.'}
      </p>
    </article>
  );
}

export default function ComparativeReportSection({ comparison }) {
  const report = comparison?.comparativeReport || {};
  const sections = report?.sections || {};

  return (
    <PanelShell
      id="comparison-report-section"
      className="border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/50"
    >
      <SectionHeader
        icon={FileText}
        title="Relatorio comparativo"
        subtitle="Resumo executivo da compatibilidade comportamental para decisao, lideranca e colaboracao."
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-800">
          Compatibilidade: {Number(report?.compatibility?.score || comparison?.compatibilityScore || 0).toFixed(1)}%
        </Badge>
        <Badge variant="outline">{report?.compatibility?.level || comparison?.compatibilityLevel || 'Moderada'}</Badge>
        <Badge variant="secondary">{report?.modeLabel || comparison?.modeLabel || 'Pessoa x pessoa'}</Badge>
      </div>

      <p className="mt-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700">
        {report?.executiveSummary || comparison?.summaryMedium || 'Resumo executivo indisponivel no momento.'}
      </p>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <ListPanel
          title="Sinergias principais"
          items={sections?.synergy || comparison?.synergyPoints || []}
          tone="positive"
          fallback="Sem sinergias explicitas para este par no momento."
        />
        <ListPanel
          title="Tensoes potenciais"
          items={sections?.tension || comparison?.tensionPoints || []}
          tone="warning"
          fallback="Sem tensoes estruturais criticas para este par."
        />
        <ListPanel
          title="Recomendacoes praticas"
          items={sections?.practicalRecommendations || comparison?.practicalRecommendations || []}
          fallback="Sem recomendacoes adicionais para este contexto."
        />
      </div>

      <div className="mt-4">
        <SectionHeader
          icon={Layers3}
          title="Leitura executiva aplicada"
          subtitle="Como essa relacao tende a funcionar em comunicacao, decisao, ritmo e pressao."
        />
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ReadingCard
            title="Comunicacao"
            value={sections?.communication || comparison?.communicationDynamics}
          />
          <ReadingCard
            title="Tomada de decisao"
            value={sections?.decisionMaking || comparison?.decisionDynamics}
          />
          <ReadingCard
            title="Ritmo de execucao"
            value={sections?.executionRhythm || comparison?.workRhythmDynamics}
          />
          <ReadingCard
            title="Pressao e conflito"
            value={sections?.pressureAndConflict || comparison?.pressureDynamics}
          />
        </div>
      </div>
    </PanelShell>
  );
}
