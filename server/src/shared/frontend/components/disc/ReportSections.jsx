import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

function Page({ number, children }) {
  return (
    <section
      className="bg-white"
      style={{
        width: '210mm',
        minHeight: '297mm',
        padding: '18mm',
        margin: '0 auto',
        pageBreakAfter: 'always',
        breakAfter: 'page',
        overflow: 'hidden',
      }}
    >
      <div className="h-full flex flex-col">
        <div className="flex-1">{children}</div>
        <div className="pt-6 text-xs text-slate-400 flex items-center justify-between">
          <span>Relatório DISC</span>
          <span>Página {number}</span>
        </div>
      </div>
    </section>
  );
}

function Title({ title, subtitle }) {
  return (
    <div className="space-y-2">
      <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
      {subtitle ? <p className="text-slate-600">{subtitle}</p> : null}
    </div>
  );
}

function Bullets({ items }) {
  const arr = Array.isArray(items) ? items : [];
  return (
    <ul className="list-disc pl-5 space-y-2 text-slate-700">
      {arr.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

function Paragraphs({ items }) {
  const arr = Array.isArray(items) ? items : [];
  return (
    <div className="space-y-3 text-slate-700 leading-relaxed">
      {arr.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}

function MiniTable({ rows }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="text-left p-3">Fator</th>
            <th className="text-left p-3">Natural</th>
            <th className="text-left p-3">Adaptado</th>
            <th className="text-left p-3">Resumo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-slate-200">
              <td className="p-3 font-semibold">{r.factor}</td>
              <td className="p-3">{r.natural}</td>
              <td className="p-3">{r.adapted}</td>
              <td className="p-3">{r.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CoverPage({ number, meta }) {
  return (
    <Page number={number}>
      <div className="h-full flex flex-col justify-between">
        <div className="space-y-8">
          <Title title="Relatório InsightDISC Completo" subtitle="Perfil comportamental e recomendações práticas" />
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-indigo-600 hover:bg-indigo-600">Dominante: {meta.dominant} — {meta.dominantLabel}</Badge>
            <Badge variant="outline">Secundário: {meta.secondary} — {meta.secondaryLabel}</Badge>
          </div>
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-6 space-y-2">
              <p className="text-slate-700">
                <span className="font-semibold">Participante:</span>{' '}
                {meta.respondentName || '—'}
              </p>
              <p className="text-slate-700">
                <span className="font-semibold">E-mail:</span>{' '}
                {meta.respondentEmail || '—'}
              </p>
              <p className="text-slate-500 text-sm">
                Este relatório é confidencial e destinado ao desenvolvimento pessoal/profissional.
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="text-slate-400 text-sm">
          ID: {meta.id}
        </div>
      </div>
    </Page>
  );
}

export function GenericPage({ number, title, subtitle, paragraphs, bullets, blocks, table, children }) {
  return (
    <Page number={number}>
      <div className="space-y-6">
        <Title title={title} subtitle={subtitle} />
        {Array.isArray(blocks) && blocks.length ? (
          <div className="grid md:grid-cols-2 gap-4" style={{ breakInside: 'avoid' }}>
            {blocks.map((b, i) => (
              <Card key={i} className="shadow-sm border-slate-200" style={{ breakInside: 'avoid' }}>
                <CardContent className="p-5 space-y-1">
                  <div className="text-xs text-slate-500">{b.label}</div>
                  <div className="text-lg font-semibold text-slate-900">{b.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : null}
        {paragraphs ? <Paragraphs items={paragraphs} /> : null}
        {bullets ? <Bullets items={bullets} /> : null}
        {Array.isArray(table) ? <MiniTable rows={table} /> : null}
        {children}
      </div>
    </Page>
  );
}
