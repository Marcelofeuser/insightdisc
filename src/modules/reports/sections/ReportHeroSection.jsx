import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Download, Radar, UserCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PanelShell from '@/components/ui/PanelShell';
import { resolveFactorLabel } from '@/modules/discEngine';

function formatDate(value) {
  if (!value) return 'Data indisponível';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Data indisponível';
  return parsed.toLocaleDateString('pt-BR');
}

export default function ReportHeroSection({
  identity,
  interpretation,
  resultHref,
  compareHref,
  onBack,
  onExportPdf,
  isExportingPdf = false,
  exportDisabled = false,
  sectionLinks = [],
}) {
  return (
    <PanelShell
      tone="accent"
      className="border-indigo-100 bg-gradient-to-br from-white via-white to-indigo-50/70"
      data-testid="assessment-report-hero"
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 max-w-4xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
            Relatório oficial InsightDISC
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Relatório DISC
          </h1>

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
              {identity?.respondentName || 'Participante'}
            </span>
            <span>Finalizado em {formatDate(identity?.completedAt)}</span>
            <span>ID {identity?.id || 'indisponível'}</span>
          </div>
        </div>

        <div className="flex max-w-full flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao painel
          </Button>
          <Link to={resultHref}>
            <Button variant="outline">
              <Radar className="mr-2 h-4 w-4" />
              Abrir resultado
            </Button>
          </Link>
          <Link to={compareHref}>
            <Button variant="outline">Comparador</Button>
          </Link>
          <Button
            onClick={onExportPdf}
            disabled={exportDisabled || isExportingPdf}
            className="bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-70"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExportingPdf ? 'Gerando PDF...' : 'Exportar PDF'}
          </Button>
        </div>
      </div>

      {sectionLinks.length ? (
        <div className="mt-5 flex flex-wrap gap-2" data-testid="assessment-report-section-nav">
          {sectionLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700"
            >
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </PanelShell>
  );
}
