import React from 'react';
import { PageFrame } from './PageFrame';

export default function Page20Closing({ data, pageNumber }) {
  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Encerramento"
      subtitle="Síntese final, LGPD e contato"
    >
      <div className="pdf-card avoid-break">
        <h3 className="pdf-section-title">Síntese final</h3>
        <p>
          O DISC oferece direção prática para escolhas de comportamento. O ganho real ocorre ao
          transformar insight em rotina, com ações pequenas e consistentes.
        </p>
      </div>

      <div className="pdf-card avoid-break">
        <h3 className="pdf-section-title">Aviso LGPD</h3>
        <p>
          Este relatório contém dados pessoais e deve ser utilizado apenas para fins de
          desenvolvimento profissional, respeitando consentimento, finalidade e segurança da
          informação.
        </p>
      </div>

      <div className="pdf-card avoid-break">
        <p><strong>InsightDISC</strong> — Plataforma de Análise Comportamental</p>
        <p className="pdf-muted">Contato: suporte@insightdisc.app</p>
        <p className="pdf-muted">Avaliação: {data?.meta?.assessmentId || 'sem-id'}</p>
      </div>
    </PageFrame>
  );
}
