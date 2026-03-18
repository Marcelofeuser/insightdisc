import React from 'react';
import { PageFrame, ScoreBars } from './PageFrame';

export default function Page05Natural({ data, pageNumber }) {
  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Perfil Natural"
      subtitle="Como você tende a se comportar de forma espontânea"
    >
      <ScoreBars title="Perfil natural" scores={data?.scores?.natural} />

      <div className="pdf-card avoid-break">
        <h3 className="pdf-section-title">Interpretação principal</h3>
        <p>{data?.interpretation?.summary || 'Sem interpretação disponível para este perfil.'}</p>
        <p className="pdf-muted">
          Este padrão tende a aparecer com mais clareza em contextos de autonomia e baixa pressão
          externa.
        </p>
      </div>
    </PageFrame>
  );
}
