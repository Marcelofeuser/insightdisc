import React from 'react';
import { PageFrame } from './PageFrame';

export default function Page03Methodology({ pageNumber }) {
  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Metodologia DISC"
      subtitle="Como interpretar corretamente este relatório"
    >
      <div className="pdf-card avoid-break">
        <h3 className="pdf-section-title">O que o DISC mede</h3>
        <p>
          O DISC descreve tendências comportamentais em quatro fatores: Dominância (D),
          Influência (I), Estabilidade (S) e Conformidade (C). O modelo não mede caráter,
          inteligência ou competência técnica.
        </p>
      </div>

      <div className="pdf-grid">
        <div className="pdf-card avoid-break">
          <h3 className="pdf-section-title">Perfil Natural</h3>
          <p>
            Representa seu padrão espontâneo de comportamento, ou seja, como você tende a agir
            quando há menor pressão de contexto.
          </p>
        </div>

        <div className="pdf-card avoid-break">
          <h3 className="pdf-section-title">Perfil Adaptado</h3>
          <p>
            Mostra ajustes realizados para responder às exigências atuais do ambiente, função,
            equipe e objetivos profissionais.
          </p>
        </div>
      </div>

      <div className="pdf-card avoid-break">
        <h3 className="pdf-section-title">Boas práticas de uso</h3>
        <ul className="pdf-list">
          <li>Use os insights para orientar ações de desenvolvimento e comunicação.</li>
          <li>Evite rótulos rígidos: contexto e maturidade influenciam o comportamento.</li>
          <li>Revise o plano de ação periodicamente para consolidar evolução.</li>
        </ul>
      </div>
    </PageFrame>
  );
}
