import React from 'react';
import { PageFrame, ScoreBars } from './PageFrame';

export default function Page06Adapted({ data, pageNumber }) {
  const adapted = data?.scores?.adapted || {};
  const natural = data?.scores?.natural || {};

  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Perfil Adaptado"
      subtitle="Como você ajusta seu estilo ao contexto atual"
    >
      <ScoreBars title="Perfil adaptado" scores={adapted} />

      <div className="pdf-card avoid-break">
        <h3 className="pdf-section-title">Leitura de adaptação</h3>
        <p>
          O perfil adaptado reflete as exigências percebidas no ambiente atual. Distâncias elevadas
          entre natural e adaptado podem sinalizar custo de energia e necessidade de ajuste de
          rotina.
        </p>
        <ul className="pdf-list">
          {['D', 'I', 'S', 'C'].map((factor) => {
            const delta = Math.round((adapted?.[factor] || 0) - (natural?.[factor] || 0));
            const direction = delta > 0 ? 'aumento' : delta < 0 ? 'redução' : 'estabilidade';
            return (
              <li key={factor}>
                {factor}: {direction} de {Math.abs(delta)} pontos.
              </li>
            );
          })}
        </ul>
      </div>
    </PageFrame>
  );
}
