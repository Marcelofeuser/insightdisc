import React from 'react';
import { PageFrame } from './PageFrame';

const TOPICS = [
  '1. Capa e identificação',
  '2. Sumário executivo',
  '3. Metodologia DISC',
  '4. Resultado geral (D/I/S/C)',
  '5. Perfil Natural',
  '6. Perfil Adaptado',
  '7. Comparativo Natural vs Adaptado',
  '8. Dominância — pontos fortes',
  '9. Dominância — riscos e ajustes',
  '10. Influência — pontos fortes',
  '11. Influência — riscos e ajustes',
  '12. Estabilidade — pontos fortes',
  '13. Estabilidade — riscos e ajustes',
  '14. Conformidade — pontos fortes',
  '15. Conformidade — riscos e ajustes',
  '16. Comunicação prática',
  '17. Ambiente ideal e motivadores',
  '18. Liderança e carreira',
  '19. Plano de desenvolvimento',
  '20. Encerramento e LGPD',
];

export default function Page02Summary({ data, pageNumber }) {
  return (
    <PageFrame
      pageNumber={pageNumber}
      title="Sumário"
      subtitle="Visão das 20 páginas do relatório"
    >
      <div className="pdf-card avoid-break">
        <p className="pdf-muted">
          Perfil base identificado: <strong>{data?.meta?.dominant || 'D'}</strong> com apoio de{' '}
          <strong>{data?.meta?.secondary || 'I'}</strong>.
        </p>
      </div>

      <div className="pdf-card avoid-break">
        <ol className="pdf-list">
          {TOPICS.map((topic) => (
            <li key={topic}>{topic}</li>
          ))}
        </ol>
      </div>
    </PageFrame>
  );
}
