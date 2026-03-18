import React from 'react';
import { PageFrame } from './PageFrame';

export default function Page01Cover({ data, pageNumber }) {
  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Relatório DISC Profissional"
      subtitle="Diagnóstico comportamental completo com recomendações práticas"
    >
      <div className="pdf-grid">
        <div className="pdf-card avoid-break">
          <h3 className="pdf-section-title">Participante</h3>
          <p><strong>Nome:</strong> {data?.meta?.respondentName || 'Não informado'}</p>
          <p><strong>E-mail:</strong> {data?.meta?.respondentEmail || 'Não informado'}</p>
          <p><strong>ID da avaliação:</strong> {data?.meta?.assessmentId || 'sem-id'}</p>
          <p><strong>Data de geração:</strong> {data?.meta?.generatedAt || '-'}</p>
        </div>

        <div className="pdf-card avoid-break">
          <h3 className="pdf-section-title">Resumo rápido</h3>
          <p>
            Este material apresenta uma leitura estruturada do seu padrão comportamental com base
            no modelo DISC, incluindo perfil natural, adaptado, comunicação e plano de
            desenvolvimento.
          </p>
          <p className="pdf-muted">
            Dominante atual: <strong>{data?.meta?.dominant || 'D'}</strong> — {data?.meta?.dominantLabel || 'Dominância'}
          </p>
          <p className="pdf-muted">
            Secundário: <strong>{data?.meta?.secondary || 'I'}</strong> — {data?.meta?.secondaryLabel || 'Influência'}
          </p>
        </div>
      </div>

      <div className="pdf-card avoid-break">
        <h3 className="pdf-section-title">Objetivo do relatório</h3>
        <p>
          Oferecer direção clara para autoconhecimento, comunicação, liderança e decisões de
          carreira, com foco em aplicação prática no dia a dia.
        </p>
      </div>
    </PageFrame>
  );
}
